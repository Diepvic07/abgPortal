import { Adapter } from "next-auth/adapters";
import { createClient } from "@supabase/supabase-js";

/**
 * Minimal NextAuth adapter for Supabase.
 * Only implements verification token methods needed for Email provider.
 * Uses untyped client to access verification_tokens table not in generated types.
 */
function getDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function SupabaseVerificationAdapter(): Adapter {
  return {
    async createVerificationToken({ identifier, token, expires }) {
      const db = getDb();
      await db.from("verification_tokens").insert({
        identifier,
        token,
        expires: expires.toISOString(),
      });
      return { identifier, token, expires };
    },

    async useVerificationToken({ identifier, token }) {
      const db = getDb();
      const { data } = await db
        .from("verification_tokens")
        .select("*")
        .eq("identifier", identifier)
        .eq("token", token)
        .maybeSingle();

      if (!data) return null;

      // Delete used token
      await db.from("verification_tokens").delete().eq("token", token);

      return {
        identifier: data.identifier as string,
        token: data.token as string,
        expires: new Date(data.expires as string),
      };
    },

    // Stub methods required by Adapter interface but not used with JWT strategy
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async createUser(user: any) { return { ...user, id: user.email ?? "" }; },
    async getUser() { return null; },
    async getUserByEmail() { return null; },
    async getUserByAccount() { return null; },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async updateUser(user: any) { return user; },
    async linkAccount() { return undefined as never; },
    async createSession() { return undefined as never; },
    async getSessionAndUser() { return null; },
    async updateSession() { return undefined as never; },
    async deleteSession() { return; },
  };
}
