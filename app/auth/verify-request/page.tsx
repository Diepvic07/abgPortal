import Link from "next/link";

export default function VerifyRequestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Check your email</h1>
        <p className="text-gray-600 mb-6">
          We sent a magic link to your email address. Click the link in the email to sign in.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          The link expires in 24 hours. If you don&apos;t see the email, check your spam folder.
        </p>
        <Link
          href="/login"
          className="text-blue-600 hover:underline text-sm"
        >
          Back to login
        </Link>
      </div>
    </div>
  );
}
