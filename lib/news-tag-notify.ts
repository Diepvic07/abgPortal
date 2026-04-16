import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendPushToMember, getPushMessage } from '@/lib/push-notification';
import { createInAppNotifications } from '@/lib/in-app-notifications';
import type { Locale } from '@/lib/i18n/utils';

interface NotifyTaggedParams {
  memberIds: string[];
  articleSlug: string;
  articleTitle: string;
  articleTitleVi: string | null;
  actorName: string;
}

/** Notify members that admin tagged them in a news article. Fires in the background. */
export async function notifyTaggedMembers({
  memberIds,
  articleSlug,
  articleTitle,
  articleTitleVi,
  actorName,
}: NotifyTaggedParams): Promise<void> {
  if (memberIds.length === 0) return;

  const supabase = createServerSupabaseClient();
  const url = `/news/${articleSlug}`;

  // Fetch locales for all tagged members in one query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: members } = await (supabase.from('members') as any)
    .select('id, locale')
    .in('id', memberIds);

  const localeMap = new Map(
    (members || []).map((m: { id: string; locale: string | null }) => [m.id, m.locale])
  );

  await Promise.allSettled(
    memberIds.map(async (memberId) => {
      const locale = ((localeMap.get(memberId)) || 'vi') as Locale;
      const articleTitleLocalized =
        (locale === 'vi' && articleTitleVi) || articleTitle || articleTitleVi || '';
      const message = getPushMessage(
        'news_tagged',
        { actorName, articleTitle: articleTitleLocalized },
        locale
      );

      try {
        await createInAppNotifications({
          type: 'news_tagged',
          title: message.title,
          body: message.body,
          url,
          targetMemberId: memberId,
        });
      } catch (err) {
        console.error('[in-app-notif] news_tagged failed:', err);
      }

      try {
        await sendPushToMember(memberId, 'news_tagged', { ...message, url });
      } catch (err) {
        console.error('[push] news_tagged failed:', err);
      }
    })
  );
}
