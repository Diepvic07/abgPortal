import { createServerSupabaseClient } from '@/lib/supabase/server';

type NotificationType = 'new_proposal' | 'new_event' | 'connection_request';

interface CreateNotificationParams {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  excludeMemberId?: string;
  targetMemberId?: string; // for single-member notifications like connection_request
}

/**
 * Create in-app notifications for members.
 * - If targetMemberId is set, creates notification only for that member.
 * - Otherwise, creates for ALL approved members (excluding excludeMemberId).
 */
export async function createInAppNotifications({
  type,
  title,
  body,
  url,
  excludeMemberId,
  targetMemberId,
}: CreateNotificationParams): Promise<void> {
  const supabase = createServerSupabaseClient();

  try {
    if (targetMemberId) {
      // Single member notification
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('in_app_notifications') as any).insert({
        member_id: targetMemberId,
        type,
        title,
        body,
        url,
      });
      return;
    }

    // Broadcast: get all approved member IDs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: members, error } = await (supabase.from('members') as any)
      .select('id')
      .eq('approval_status', 'approved')
      .not('account_status', 'in', '("suspended","banned")');

    if (error || !members) {
      console.error('[in-app-notif] Failed to fetch members:', error?.message);
      return;
    }

    const rows = members
      .filter((m: { id: string }) => m.id !== excludeMemberId)
      .map((m: { id: string }) => ({
        member_id: m.id,
        type,
        title,
        body,
        url,
      }));

    if (rows.length === 0) return;

    // Batch insert (Supabase handles arrays)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertErr } = await (supabase.from('in_app_notifications') as any)
      .insert(rows);

    if (insertErr) {
      console.error('[in-app-notif] Batch insert error:', insertErr.message);
    } else {
      console.log(`[in-app-notif] Created ${rows.length} notifications for type=${type}`);
    }
  } catch (err) {
    console.error('[in-app-notif] Unexpected error:', err);
  }
}
