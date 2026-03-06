import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { getMemberByEmail, updateMemberLastLogin } from "./supabase-db";
import { SupabaseVerificationAdapter } from "./nextauth-supabase-adapter";
import { getMagicLinkEmailHtml, getMagicLinkEmailText } from "./auth-email-template";

// Per-email cooldown: 1 magic link per 60 seconds
const MAGIC_LINK_COOLDOWN_MS = 60 * 1000;
const emailLastSent: Record<string, number> = {};

// Validate required environment variables
const requiredEnvVars = {
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
};

// Log missing env vars for debugging (server-side only)
if (typeof window === 'undefined') {
    const missing = Object.entries(requiredEnvVars)
        .filter(([, value]) => !value)
        .map(([key]) => key);

    if (missing.length > 0) {
        console.error('[Auth Config Error] Missing required environment variables:', missing.join(', '));
    }
}

export const authOptions: NextAuthOptions = {
    debug: process.env.NODE_ENV === 'development',
    adapter: SupabaseVerificationAdapter(),
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code"
                }
            }
        }),
        EmailProvider({
            from: process.env.EMAIL_FROM || 'ABG Connect <diepvic@gmail.com>',
            async sendVerificationRequest({ identifier: email, url, provider }) {
                // Enforce per-email cooldown to prevent spam/abuse
                const normalizedEmail = email.trim().toLowerCase();
                const now = Date.now();
                const lastSent = emailLastSent[normalizedEmail];
                if (lastSent && now - lastSent < MAGIC_LINK_COOLDOWN_MS) {
                    const waitSec = Math.ceil((MAGIC_LINK_COOLDOWN_MS - (now - lastSent)) / 1000);
                    throw new Error(`Please wait ${waitSec} seconds before requesting another magic link.`);
                }

                const resend = new Resend(process.env.RESEND_API_KEY);
                const { host } = new URL(url);
                const { error } = await resend.emails.send({
                    from: provider.from,
                    to: email,
                    subject: `Sign in to ABG Alumni Connect`,
                    html: getMagicLinkEmailHtml(url, host),
                    text: getMagicLinkEmailText(url),
                });

                if (error) {
                    // Resend test mode: can only send to account owner's email
                    if (error.name === 'validation_error' && error.message.includes('only send testing emails')) {
                        console.warn('[Auth] Resend test mode: cannot send magic link to', email);
                        throw new Error('Resend đang ở chế độ test. Chỉ gửi được đến email đã xác minh. Hãy dùng Google Sign-In.');
                    }
                    console.error('[Auth] Failed to send magic link:', error);
                    throw new Error(`Không thể gửi email: ${error.message}`);
                }

                // Only record timestamp after successful send
                emailLastSent[normalizedEmail] = Date.now();
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            try {
                if (!user.email) {
                    return false;
                }

                // Check if member exists
                const member = await getMemberByEmail(user.email);

                // If member doesn't exist, allow sign in to proceed to onboarding
                if (!member) {
                    return true;
                }

                // Check approval status
                if (member.approval_status === "pending") {
                    return `/auth/pending?email=${encodeURIComponent(user.email)}`;
                }

                if (member.approval_status === "rejected") {
                    return "/auth/rejected";
                }

                // Check account status
                if (member.account_status === "suspended" || member.account_status === "banned") {
                    return "/auth/suspended";
                }

                // Approved - update last login and allow
                await updateMemberLastLogin(user.email);

                // Auto-downgrade expired premium members
                if (member.paid && member.membership_expiry) {
                    const expiry = new Date(member.membership_expiry);
                    if (new Date() > expiry) {
                        const { updateMember } = await import('./supabase-db');
                        await updateMember(member.id, {
                            paid: false,
                            payment_status: 'expired' as const,
                        });
                        console.log(`[Auth] Auto-downgraded expired member: ${member.email}`);
                    }
                }

                return true;
            } catch (error) {
                console.error("Sign in error:", error);
                // Return a specific error page instead of false to avoid generic Configuration error
                return `/auth/error?error=SignInError&details=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`;
            }
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.email = user.email;
                token.name = user.name;
                token.picture = user.image;
            }
            if (account) {
                token.provider = account.provider;
                token.providerAccountId = account.providerAccountId;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                session.user.image = token.picture as string;
                (session as unknown as Record<string, unknown>).provider = token.provider as string;
            }
            return session;
        }
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: "/login",
        error: "/auth/error",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
