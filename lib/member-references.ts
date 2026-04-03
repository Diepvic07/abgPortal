import { createServerSupabaseClient } from './supabase/server';
import { formatDate, generateId } from './utils';
import { getMemberById, getMemberByPublicProfileSlug } from './supabase-db';
import type { Member, MemberReference } from '@/types';
import { getMembershipStatus, isEligibleForPremiumFeatures } from '@/types';

function nullToUndefined<T>(val: T | null): T | undefined {
  return val === null ? undefined : val;
}

function mapRowToReference(row: Record<string, unknown>): MemberReference {
  const writer = row.writer as Record<string, unknown> | null;
  const recipient = row.recipient as Record<string, unknown> | null;

  return {
    id: row.id as string,
    writer_member_id: row.writer_member_id as string,
    recipient_member_id: row.recipient_member_id as string,
    body: row.body as string,
    relationship_context: row.relationship_context as string,
    status: row.status as MemberReference['status'],
    is_publicly_visible: (row.is_publicly_visible as boolean) || false,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    moderated_at: nullToUndefined(row.moderated_at as string | null),
    moderated_by_member_id: nullToUndefined(row.moderated_by_member_id as string | null),
    moderation_note: nullToUndefined(row.moderation_note as string | null),
    writer_name: nullToUndefined(writer?.name as string | null),
    writer_avatar_url: nullToUndefined(writer?.avatar_url as string | null),
    writer_role: nullToUndefined(writer?.role as string | null),
    writer_company: nullToUndefined(writer?.company as string | null),
    recipient_name: nullToUndefined(recipient?.name as string | null),
    recipient_avatar_url: nullToUndefined(recipient?.avatar_url as string | null),
  };
}

function canReceivePublicProfile(member: Member): boolean {
  return isEligibleForPremiumFeatures(member);
}

export function getPublicProfileUrl(slug: string): string {
  return `/u/${slug}`;
}

export async function getReferenceByWriterAndRecipient(
  writerMemberId: string,
  recipientMemberId: string,
): Promise<MemberReference | null> {
  const db = createServerSupabaseClient();

  const { data, error } = await db
    .from('member_references')
    .select('*, writer:members!member_references_writer_member_id_fkey(name, avatar_url, role, company)')
    .eq('writer_member_id', writerMemberId)
    .eq('recipient_member_id', recipientMemberId)
    .maybeSingle();

  if (error) {
    console.error('[MemberReferences] getReferenceByWriterAndRecipient error:', error);
    throw new Error(`Failed to get existing reference: ${error.message}`);
  }

  return data ? mapRowToReference(data as Record<string, unknown>) : null;
}

export async function createMemberReference(input: {
  writerMemberId: string;
  recipientMemberId: string;
  body: string;
  relationshipContext: string;
}): Promise<MemberReference> {
  if (input.writerMemberId === input.recipientMemberId) {
    throw new Error('You cannot write a reference for yourself.');
  }

  const [writer, recipient, existing] = await Promise.all([
    getMemberById(input.writerMemberId),
    getMemberById(input.recipientMemberId),
    getReferenceByWriterAndRecipient(input.writerMemberId, input.recipientMemberId),
  ]);

  if (!writer || !recipient) {
    throw new Error('Writer or recipient not found.');
  }

  if (!isEligibleForPremiumFeatures(writer)) {
    throw new Error('Only premium approved members can write references.');
  }

  if (!canReceivePublicProfile(recipient)) {
    throw new Error('This member is not eligible to receive public references.');
  }

  if (existing) {
    throw new Error('You have already submitted a reference for this member.');
  }

  const db = createServerSupabaseClient();
  const now = formatDate();

  const { data, error } = await db
    .from('member_references')
    .insert({
      id: generateId(),
      writer_member_id: input.writerMemberId,
      recipient_member_id: input.recipientMemberId,
      body: input.body,
      relationship_context: input.relationshipContext,
      status: 'submitted',
      is_publicly_visible: false,
      created_at: now,
      updated_at: now,
    })
    .select('*, writer:members!member_references_writer_member_id_fkey(name, avatar_url, role, company)')
    .single();

  if (error) {
    console.error('[MemberReferences] createMemberReference error:', error);
    throw new Error(`Failed to create reference: ${error.message}`);
  }

  return mapRowToReference(data as Record<string, unknown>);
}

export async function getReceivedReferences(
  recipientMemberId: string,
  options?: { includeRemoved?: boolean },
): Promise<MemberReference[]> {
  const db = createServerSupabaseClient();

  let query = db
    .from('member_references')
    .select('*, writer:members!member_references_writer_member_id_fkey(name, avatar_url, role, company)')
    .eq('recipient_member_id', recipientMemberId)
    .order('created_at', { ascending: false });

  if (!options?.includeRemoved) {
    query = query.neq('status', 'removed_by_admin');
  }

  const { data, error } = await query;
  if (error) {
    console.error('[MemberReferences] getReceivedReferences error:', error);
    throw new Error(`Failed to get received references: ${error.message}`);
  }

  return (data || []).map((row) => mapRowToReference(row as Record<string, unknown>));
}

export async function updateReferenceVisibility(input: {
  referenceId: string;
  recipientMemberId: string;
  isPubliclyVisible: boolean;
}): Promise<MemberReference> {
  const db = createServerSupabaseClient();

  const { data: existing, error: existingError } = await db
    .from('member_references')
    .select('*')
    .eq('id', input.referenceId)
    .eq('recipient_member_id', input.recipientMemberId)
    .maybeSingle();

  if (existingError) {
    console.error('[MemberReferences] updateReferenceVisibility lookup error:', existingError);
    throw new Error(`Failed to update reference visibility: ${existingError.message}`);
  }

  if (!existing) {
    throw new Error('Reference not found.');
  }

  if ((existing as Record<string, unknown>).status === 'removed_by_admin') {
    throw new Error('This reference is unavailable.');
  }

  const recipient = await getMemberById(input.recipientMemberId);
  if (!recipient) {
    throw new Error('Recipient not found.');
  }

  const nextStatus = input.isPubliclyVisible ? 'visible' : 'hidden_by_recipient';

  const { data, error } = await db
    .from('member_references')
    .update({
      is_publicly_visible: input.isPubliclyVisible,
      status: nextStatus,
      updated_at: formatDate(),
    })
    .eq('id', input.referenceId)
    .eq('recipient_member_id', input.recipientMemberId)
    .select('*, writer:members!member_references_writer_member_id_fkey(name, avatar_url, role, company)')
    .single();

  if (error) {
    console.error('[MemberReferences] updateReferenceVisibility error:', error);
    throw new Error(`Failed to update reference visibility: ${error.message}`);
  }

  return mapRowToReference(data as Record<string, unknown>);
}

export async function listMemberReferencesForAdmin(): Promise<MemberReference[]> {
  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('member_references')
    .select('*, writer:members!member_references_writer_member_id_fkey(name, avatar_url, role, company), recipient:members!member_references_recipient_member_id_fkey(name, avatar_url)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MemberReferences] listMemberReferencesForAdmin error:', error);
    throw new Error(`Failed to list member references: ${error.message}`);
  }

  return (data || []).map((row) => mapRowToReference(row as Record<string, unknown>));
}

export async function moderateMemberReference(input: {
  referenceId: string;
  adminMemberId: string;
  action: 'remove' | 'restore';
  moderationNote?: string;
}): Promise<MemberReference> {
  const db = createServerSupabaseClient();

  const { data: existing, error: lookupError } = await db
    .from('member_references')
    .select('*')
    .eq('id', input.referenceId)
    .maybeSingle();

  if (lookupError) {
    console.error('[MemberReferences] moderateMemberReference lookup error:', lookupError);
    throw new Error(`Failed to moderate reference: ${lookupError.message}`);
  }

  if (!existing) {
    throw new Error('Reference not found.');
  }

  const existingRow = existing as Record<string, unknown>;
  const restoreVisible = (existingRow.is_publicly_visible as boolean) === true;

  const nextStatus =
    input.action === 'remove'
      ? 'removed_by_admin'
      : restoreVisible
      ? 'visible'
      : 'submitted';

  const { data, error } = await db
    .from('member_references')
    .update({
      status: nextStatus,
      is_publicly_visible: input.action === 'remove' ? false : restoreVisible,
      moderated_at: formatDate(),
      moderated_by_member_id: input.adminMemberId,
      moderation_note: input.moderationNote || null,
      updated_at: formatDate(),
    })
    .eq('id', input.referenceId)
    .select('*, writer:members!member_references_writer_member_id_fkey(name, avatar_url, role, company), recipient:members!member_references_recipient_member_id_fkey(name, avatar_url)')
    .single();

  if (error) {
    console.error('[MemberReferences] moderateMemberReference error:', error);
    throw new Error(`Failed to moderate reference: ${error.message}`);
  }

  return mapRowToReference(data as Record<string, unknown>);
}

export async function getPublicProfileBySlug(slug: string): Promise<{
  member: Member;
  references: MemberReference[];
} | null> {
  const member = await getMemberByPublicProfileSlug(slug);
  if (!member) return null;

  const membershipStatus = getMembershipStatus(member);
  const isAccessible =
    member.status === 'active' &&
    member.approval_status === 'approved' &&
    (membershipStatus === 'premium' || membershipStatus === 'grace-period');

  if (!isAccessible) {
    return null;
  }

  const db = createServerSupabaseClient();
  const { data, error } = await db
    .from('member_references')
    .select('*, writer:members!member_references_writer_member_id_fkey(name, avatar_url, role, company)')
    .eq('recipient_member_id', member.id)
    .eq('is_publicly_visible', true)
    .eq('status', 'visible')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MemberReferences] getPublicProfileBySlug error:', error);
    throw new Error(`Failed to fetch public profile references: ${error.message}`);
  }

  return {
    member,
    references: (data || []).map((row) => mapRowToReference(row as Record<string, unknown>)),
  };
}
