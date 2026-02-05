import { getServerSession } from "next-auth/next";
import { authOptions } from '@/lib/auth';
import { getMemberByEmail } from '@/lib/google-sheets';
import { NextRequest } from 'next/server';

export async function getAuthenticatedMember(request?: NextRequest) {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
        return null;
    }

    const member = await getMemberByEmail(session.user.email);

    if (!member) {
        return null;
    }

    // Check if account is suspended or banned
    if (member.account_status === 'suspended' || member.account_status === 'banned') {
        return null;
    }

    return member;
}

export async function requireAuth(request?: NextRequest) {
    const member = await getAuthenticatedMember(request);

    if (!member) {
        throw new Error('Authentication required');
    }

    return member;
}
