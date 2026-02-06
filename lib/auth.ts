import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { Resend } from "resend";
import { Member } from "@/types";
import { getMemberByEmail, addMember, updateMemberLastLogin } from "./google-sheets";
import { generateId, formatDate } from "./utils";
import { getMagicLinkEmailHtml, getMagicLinkEmailText } from "./auth-email-template";

const resend = new Resend(process.env.RESEND_API_KEY);

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
        }),
        EmailProvider({
            from: process.env.EMAIL_FROM || "ABG Connect <onboarding@resend.dev>",
            sendVerificationRequest: async ({ identifier: email, url }) => {
                const host = new URL(url).host;
                try {
                    await resend.emails.send({
                        from: process.env.EMAIL_FROM || "ABG Connect <onboarding@resend.dev>",
                        to: email,
                        subject: "Sign in to ABG Alumni Connect",
                        html: getMagicLinkEmailHtml(url, host),
                        text: getMagicLinkEmailText(url),
                    });
                } catch (error) {
                    console.error("Failed to send magic link email:", error);
                    throw new Error("Failed to send verification email");
                }
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
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
        signIn: "/login",
        error: "/auth/error",
        verifyRequest: "/auth/verify-request",
    },
    secret: process.env.NEXTAUTH_SECRET,
};
