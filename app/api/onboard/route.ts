import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { generateBio } from '@/lib/gemini';
import { addMember, getMemberByEmail, updateMember, updateMemberLastLogin, findPotentialDuplicates } from '@/lib/supabase-db';
import { sendOnboardingConfirmation, sendDuplicateAlertEmail, sendNewSignupNotificationEmail } from '@/lib/resend';
import { generateId, formatDate } from '@/lib/utils';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { Member } from '@/types';
import { requireSession } from '@/lib/auth-middleware';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Require session (new users won't have member record yet)
    const session = await requireSession();
    const fullSession = await getServerSession(authOptions);
    const authProvider = ((fullSession as unknown as Record<string, unknown>)?.provider as string) || 'google';

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


    if (!name || !email || !role || !company || !expertise || !can_help_with || !looking_for) {
      return errorResponse('All fields are required', 400);
    }

    const existingMember = await getMemberByEmail(email);

    let memberId: string;
    let bio: string;

    if (existingMember) {
      // Merge with existing data, taking new inputs over existing ones if provided
      const mergedRole = role || existingMember.role;
      const mergedCompany = company || existingMember.company;
      const mergedExpertise = expertise || existingMember.expertise;
      const mergedCanHelpWith = can_help_with || existingMember.can_help_with;
      const mergedLookingFor = looking_for || existingMember.looking_for;
      
      bio = await generateBio({
        name,
        role: mergedRole,
        company: mergedCompany,
        expertise: mergedExpertise,
        can_help_with: mergedCanHelpWith,
        looking_for: mergedLookingFor,
        locale,
      });

      let avatar_url = existingMember.avatar_url;
      if (avatarFile && avatarFile.size > 0) {
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const blob = await put(`avatars/${existingMember.id}.${ext}`, avatarFile, {
          access: 'public',
        });
        avatar_url = blob.url;
      }

      const updates: Partial<Omit<Member, 'id' | 'email' | 'created_at'>> = {
        name,
        role: mergedRole,
        company: mergedCompany,
        expertise: mergedExpertise,
        can_help_with: mergedCanHelpWith,
        looking_for: mergedLookingFor,
        bio,
        avatar_url,
        open_to_work: open_to_work || existingMember.open_to_work,
        job_preferences: job_preferences || existingMember.job_preferences,
        hiring: hiring || existingMember.hiring,
        hiring_preferences: hiring_preferences || existingMember.hiring_preferences,
        gender: gender || existingMember.gender,
        relationship_status: relationship_status || existingMember.relationship_status,
        abg_class: abg_class || existingMember.abg_class,
        nickname: nickname || existingMember.nickname,
        display_nickname_in_search,
        display_nickname_in_match,
        display_nickname_in_email,
        auth_provider: authProvider,
        last_login: formatDate(),
        approval_status: 'approved', // Auto-approve since email was found in DB
        locale,
      };

      await updateMember(existingMember.id, updates);
      memberId = existingMember.id;
      console.log(`[API] Merged data for existing member ${email}`);
    } else {
      let avatar_url: string | undefined;
      if (avatarFile && avatarFile.size > 0) {
        const ext = avatarFile.name.split('.').pop() || 'jpg';
        const blob = await put(`avatars/${generateId()}.${ext}`, avatarFile, {
          access: 'public',
        });
        avatar_url = blob.url;
      }

      bio = await generateBio({
        name,
        role,
        company,
        expertise,
        can_help_with,
        looking_for,
        locale,
      });

      memberId = generateId();

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
        status: 'active',
        paid: false,
        free_requests_used: 0,
        created_at: formatDate(),
        auth_provider: authProvider, // Detected from session (google or email)
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
        payment_status: 'unpaid',
        // New signups require approval
        approval_status: 'pending',
        is_csv_imported: false,
        locale,
      };

      await addMember(member);

      // Verify member was actually added (handle silent failures and eventual consistency)
      // Retry up to 3 times with 1s delay
      let verifyMember: Member | null = null;
      for (let i = 0; i < 3; i++) {
        // Wait 1s before first check and between retries
        await new Promise(resolve => setTimeout(resolve, 1000));

        verifyMember = await getMemberByEmail(email);
        if (verifyMember) break;

        console.log(`[API] Verification attempt ${i + 1} failed for ${email}, retrying...`);
      }

      if (!verifyMember) {
        console.error(`[API] Member creation verification failed for ${email} after 3 attempts`);
        throw new Error('Failed to verify member creation - please try again or contact support');
      }
      console.log(`[API] Verified member creation for ${email}`);
    }

    // Explicitly update last login to initialize all security fields
    await updateMemberLastLogin(email);

    // Duplicate detection for new signups (not existing email merges)
    if (!existingMember) {
      try {
        const duplicates = await findPotentialDuplicates(name, abg_class, email);
        if (duplicates.length > 0) {
          const topMatch = duplicates[0];
          await updateMember(memberId, {
            potential_duplicate_of: topMatch.member.id,
            duplicate_note: `${topMatch.confidence}: ${topMatch.reason}`,
          });
          // Notify admin
          await sendDuplicateAlertEmail({
            newMemberName: name,
            newMemberEmail: email,
            newMemberClass: abg_class,
            matches: duplicates.map(d => ({
              name: d.member.name,
              email: d.member.email,
              abgClass: d.member.abg_class,
              confidence: d.confidence,
              reason: d.reason,
            })),
          });
        }
      } catch (dupError) {
        // Don't fail onboarding if duplicate check fails
        console.error('[API] Duplicate detection error (non-blocking):', dupError);
      }
    }

    await sendOnboardingConfirmation(email, name, bio, locale);

    // Notify admins about new signup needing approval (only for truly new users)
    if (!existingMember) {
      sendNewSignupNotificationEmail({
        name,
        email,
        abgClass: abg_class,
        role,
        company,
      }).catch(err => console.error('[API] New signup notification error (non-blocking):', err));
    }

    return successResponse({
      message: 'Profile created successfully',
      bio,
      memberId,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
