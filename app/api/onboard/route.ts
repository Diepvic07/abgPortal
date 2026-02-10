import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { generateBio } from '@/lib/gemini';
import { addMember, getMemberByEmail } from '@/lib/google-sheets';
import { sendOnboardingConfirmation } from '@/lib/resend';
import { notifyAdmin } from '@/lib/discord';
import { generateId, formatDate } from '@/lib/utils';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { Member } from '@/types';
import { requireSession } from '@/lib/auth-middleware';
import { updateMemberLastLogin } from '@/lib/google-sheets';

export async function POST(request: NextRequest) {
  try {
    // Require session (new users won't have member record yet)
    const session = await requireSession();

    const formData = await request.formData();

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;

    // Security check: email must match authenticated user
    if (email.toLowerCase() !== session.email.toLowerCase()) {
      return errorResponse('Authenticated email mismatch', 403);
    }

    const role = formData.get('role') as string;
    const company = formData.get('company') as string;
    const expertise = formData.get('expertise') as string;
    const can_help_with = formData.get('can_help_with') as string;
    const looking_for = formData.get('looking_for') as string;
    const avatarFile = formData.get('avatar') as File | null;
    const voiceFile = formData.get('voice') as File | null;
    const locale = (formData.get('locale') as 'en' | 'vi') || 'en';
    const gender = formData.get('gender') as 'Female' | 'Male' | 'Undisclosed' | undefined;
    const relationship_status = formData.get('relationship_status') as string | undefined;
    const open_to_work = formData.get('open_to_work') === 'true';
    const job_preferences = formData.get('job_preferences') as string | undefined;
    const hiring = formData.get('hiring') === 'true';
    const hiring_preferences = formData.get('hiring_preferences') as string | undefined;
    const abg_class = formData.get('abg_class') as string | undefined;
    const nickname = formData.get('nickname') as string | undefined;
    const display_nickname_in_search = formData.get('display_nickname_in_search') === 'true';
    const display_nickname_in_match = formData.get('display_nickname_in_match') === 'true';
    const display_nickname_in_email = formData.get('display_nickname_in_email') === 'true';
    const discord_username = formData.get('discord_username') as string | undefined;


    if (!name || !email || !role || !company || !expertise || !can_help_with || !looking_for) {
      return errorResponse('All fields are required', 400);
    }

    const existingMember = await getMemberByEmail(email);
    if (existingMember) {
      return errorResponse('Email already registered', 400);
    }

    let avatar_url: string | undefined;
    if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split('.').pop() || 'jpg';
      const blob = await put(`avatars/${generateId()}.${ext}`, avatarFile, {
        access: 'public',
      });
      avatar_url = blob.url;
    }

    let voice_url: string | undefined;
    if (voiceFile && voiceFile.size > 0) {
      const blob = await put(`voices/${generateId()}.webm`, voiceFile, {
        access: 'public',
      });
      voice_url = blob.url;
    }

    const bio = await generateBio({
      name,
      role,
      company,
      expertise,
      can_help_with,
      looking_for,
    });

    const memberId = generateId();

    const member: Member = {
      id: memberId,
      name,
      email,
      role,
      company,
      expertise,
      can_help_with,
      looking_for,
      bio,
      avatar_url,
      voice_url,
      status: 'active',
      paid: false,
      free_requests_used: 0,
      created_at: formatDate(),
      auth_provider: 'google', // From OAuth flow
      auth_provider_id: '',
      last_login: formatDate(),
      account_status: 'active',
      total_requests_count: 0,
      requests_today: 0,
      open_to_work,
      job_preferences,
      hiring,
      hiring_preferences,
      gender,
      relationship_status,
      abg_class,
      nickname,
      display_nickname_in_search,
      display_nickname_in_match,
      display_nickname_in_email,
      discord_username,
      payment_status: 'unpaid',
      // New signups require approval
      approval_status: 'pending',
      is_csv_imported: false,
    };

    await addMember(member);

    // Verify member was actually added (handle silent failures)
    // Add a small delay to allow for propagation/consistency if needed, though usually direct read is fine
    const verifyMember = await getMemberByEmail(email);
    if (!verifyMember) {
      console.error(`[API] Member creation verification failed for ${email}`);
      throw new Error('Failed to verify member creation - please try again or contact support');
    }
    console.log(`[API] Verified member creation for ${email}`);

    // Explicitly update last login to initialize all security fields
    await updateMemberLastLogin(email);

    await sendOnboardingConfirmation(email, name, bio, locale);

    // Notify admin of new signup requiring approval
    await notifyAdmin('new_signup', {
      name,
      email,
      role,
      company,
    });

    return successResponse({
      message: 'Profile created successfully',
      bio,
      memberId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
