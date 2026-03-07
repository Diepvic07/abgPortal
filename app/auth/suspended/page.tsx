import Link from "next/link";

export default function SuspendedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Account Suspended</h1>
        <p className="text-gray-600 mb-6">
          Your account has been suspended due to suspicious activity or a policy violation.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          If you believe this is an error, please contact our support team.
        </p>
        <div className="space-y-3">
          <a
            href="mailto:bdh.alumni@abg.edu.vn?subject=Account Suspension Appeal"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Contact Support
          </a>
          <div>
            <Link
              href="/"
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
