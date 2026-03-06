import { LoginForm } from "@/components/forms/login-form";
import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await getServerSession(authOptions);
  if (session?.user) {
    redirect("/request");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-sm">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-gray-900">ABG Alumni Connect</h1>
          </Link>
          <p className="text-gray-600 mt-2">Sign in to connect with fellow ABG alumni</p>
        </div>
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
