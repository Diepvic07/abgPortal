import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { getAuthenticatedMember, requireAuth } from '@/lib/auth-middleware';
import { updateMember, getMemberById } from '@/lib/supabase-db';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';
import { sendPaymentNotificationEmail } from '@/lib/resend';

// GET /api/profile - Get current user's profile
export async function GET(request: NextRequest) {
  try {
    const member = await getAuthenticatedMember(request);

    if (!member) {
      return errorResponse('Not authenticated', 401);
    }

    return successResponse({ member });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/profile - Update current user's profile
export async function PATCH(request: NextRequest) {
  try {
    const member = await requireAuth(request);

    // Support both JSON and FormData (for avatar upload)
    const contentType = request.headers.get('content-type') || '';
    let body: Record<string, unknown>;
    let avatarFile: File | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = {};
      for (const [key, value] of formData.entries()) {
        if (key === 'avatar' && value instanceof File) {
          avatarFile = value;
        } else {
          // Parse booleans from string
          if (value === 'true') body[key] = true;
          else if (value === 'false') body[key] = false;
          else body[key] = value;
        }
      }
    } else {
      body = await request.json();
    }

    // Whitelist allowed fields for update
    const allowedFields = [
      'name',
      'role',
      'company',
      'expertise',
      'can_help_with',
      'looking_for',
      'phone',
      'facebook_url',
      'linkedin_url',
      'company_website',
      'country',
      'open_to_work',
      'job_preferences',
      'hiring',
      'hiring_preferences',
      'gender',
      'relationship_status',
      'abg_class',
      'nickname',
      'display_nickname_in_search',
      'display_nickname_in_match',
      'display_nickname_in_email',
      'payment_status', // Only 'pending' allowed from client
      // Dating profile fields
      'self_description',
      'truth_lie',
      'ideal_day',
      'qualities_looking_for',
      'core_values',
      'deal_breakers',
      'interests',
      'dating_message',
      'other_share',
      'dating_profile_complete',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        // Special handling for payment_status - users can only set to 'pending'
        if (field === 'payment_status') {
          if (body[field] === 'pending') {
            updates[field] = 'pending';
          }
          // Ignore other payment_status values from client
        } else {
          updates[field] = body[field];
        }
      }
    }

    // Handle avatar upload via Vercel Blob
    if (avatarFile && avatarFile.size > 0) {
      const ext = avatarFile.name.split('.').pop() || 'jpg';
      const blob = await put(`avatars/${member.id}.${ext}`, avatarFile, {
        access: 'public',
      });
      updates.avatar_url = blob.url;
    }

    if (Object.keys(updates).length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    const success = await updateMember(member.id, updates);

    if (!success) {
      return errorResponse('Failed to update profile', 500);
    }

    // Notify admins when user confirms payment
    if (updates.payment_status === 'pending') {
      sendPaymentNotificationEmail({
        name: member.name,
        email: member.email,
        abgClass: member.abg_class,
        phone: member.phone,
      }).catch(err => console.error('[API] Payment notification error (non-blocking):', err));
    }

    // Fetch updated member
    const updatedMember = await getMemberById(member.id);

    return successResponse({
      message: 'Profile updated successfully',
      member: updatedMember,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
