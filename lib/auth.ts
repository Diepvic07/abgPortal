import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { Member } from "@/types";
import { getMemberByEmail, addMember, updateMemberLastLogin } from "./google-sheets";
import { generateId, formatDate } from "./utils";

export const authOptions: NextAuthOptions = {
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
        })
    ],
    callbacks: {
        async signIn({ user, account }) {
            try {
                if (!user.email) {
                    return false;
                }

                // Check if member exists
                let member = await getMemberByEmail(user.email);

                // If member doesn't exist, create a new one with basic info
                if (!member) {
                    const newMember: Member = {
                        id: generateId(),
                        name: user.name || 'New Member',
                        email: user.email,
                        role: '',
                        company: '',
                        expertise: '',
                        can_help_with: '',
                        looking_for: '',
                        bio: '',
                        avatar_url: user.image || undefined,
                        status: 'active',
                        paid: false,
                        free_requests_used: 0,
                        created_at: formatDate(),
                        auth_provider: account?.provider || 'google',
                        auth_provider_id: account?.providerAccountId || '',
                        last_login: formatDate(),
                        account_status: 'active',
                        total_requests_count: 0,
                        requests_today: 0,
                    };

                    await addMember(newMember);
                } else {
                    // Update last login time
                    await updateMemberLastLogin(user.email);
                }

                return true;
            } catch (error) {
                console.error('Sign in error:', error);
                return false;
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
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};
