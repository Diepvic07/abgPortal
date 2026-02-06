"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { MemberOnboardingForm } from "@/components/forms/member-onboarding-form";

function SignupContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-2xl font-bold text-gray-900">ABG Alumni Connect</h1>
          </Link>
          <p className="text-gray-600 mt-2">Apply to join the ABG Alumni network</p>
          {email && (
            <p className="text-sm text-blue-600 mt-2">
              Signing up with: {email}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-amber-800 text-sm">
              <strong>Note:</strong> Your application will be reviewed by our admin team.
              You&apos;ll receive an email once your membership is approved.
            </p>
          </div>
          <MemberOnboardingForm />
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already a member?{" "}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
