import Link from "next/link";

export default function RejectedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Not Approved</h1>
        <p className="text-gray-600 mb-6">
          Unfortunately, your membership application was not approved at this time.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          If you believe this is an error or would like more information,
          please contact our admin team.
        </p>
        <div className="space-y-3">
          <a
            href="mailto:bdh.alumni@abg.edu.vn?subject=Membership Application Inquiry"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Contact Admin
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
