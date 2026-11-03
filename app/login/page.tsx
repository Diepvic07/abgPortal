import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginPageClient } from "@/components/auth/login-page-client";
import { normalizeLoginEmail, safeLoginCallbackUrl } from "@/lib/login-params";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[]; callbackUrl?: string | string[]; email?: string | string[] }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  // If already authenticated, redirect to the intended page or /events
  if (session?.user) {
    const target = safeLoginCallbackUrl(params.callbackUrl);
    redirect(target);
  }

  return (
    <LoginPageClient
      errorCode={params.error}
      email={normalizeLoginEmail(params.email)}
      callbackUrl={safeLoginCallbackUrl(params.callbackUrl, "/request")}
    />
  );
}
