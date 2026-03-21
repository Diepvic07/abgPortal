import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginPageClient } from "@/components/auth/login-page-client";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; callbackUrl?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  // If already authenticated, redirect to the intended page or /request
  if (session?.user) {
    const target = params.callbackUrl || "/request";
    redirect(target);
  }

  return <LoginPageClient errorCode={params.error} />;
}
