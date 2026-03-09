import { LoginForm } from "@/components/forms/login-form";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

const ERROR_MESSAGES: Record<string, string> = {
  OAuthCallback: "Google sign-in failed. Please try again or use email sign-in.",
  OAuthSignin: "Could not start Google sign-in. Please try again.",
  OAuthAccountNotLinked: "This email is already linked to another sign-in method. Try a different method.",
  SessionRequired: "Please sign in to continue.",
  Default: "An authentication error occurred. Please try again.",
};

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

  const errorMessage = params.error
    ? ERROR_MESSAGES[params.error] || ERROR_MESSAGES.Default
    : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-gray-900">ABG Alumni Connect</h1>
          </Link>
          <p className="text-gray-600 mt-2">Sign in to connect with fellow ABG alumni</p>
        </div>
        {errorMessage && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {errorMessage}
          </div>
        )}
        <LoginForm />
        <p className="text-center text-sm text-gray-500 mt-6">
          Not a member yet?{" "}
          <Link href="/signup" className="text-blue-600 hover:underline">
            Apply to join
          </Link>
        </p>
      </div>
    </div>
  );
}
