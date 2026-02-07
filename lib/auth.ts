import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { getMemberByEmail, updateMemberLastLogin } from "./google-sheets";

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
    ],
    callbacks: {
        async signIn({ user, account }) {
            try {
                if (!user.email) {
                    return false;
                }

                // Check if member exists
                const member = await getMemberByEmail(user.email);

                // If member doesn't exist, redirect to signup
                if (!member) {
                    return `/signup?email=${encodeURIComponent(user.email)}&name=${encodeURIComponent(user.name || "")}`;
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
