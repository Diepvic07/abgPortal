"use client";

import { useState } from "react";
import Link from 'next/link';
import { MemberAvatar } from "@/components/ui/member-avatar";
import { useTranslation } from "@/lib/i18n";
import type { SearchResultBasic, SearchResultPro } from "@/lib/search-utils";
import { ContactRequestModal } from "./contact-request-modal";
import { PaymentInfoModal } from "@/components/ui/payment-info-modal";

type SearchResult = SearchResultBasic | SearchResultPro;

function isProResult(result: SearchResult): result is SearchResultPro {
  return "role" in result;
}

interface MemberSearchResultCardProps {
  result: SearchResult;
  viewerTier: string;
}

function isVerified(result: SearchResult): boolean {
  if (result.is_csv_imported) return false;
  if (!isProResult(result)) return !result.is_csv_imported;
  return Boolean(result.name && result.role && result.company);
}

export function MemberSearchResultCard({ result, viewerTier }: MemberSearchResultCardProps) {
  const { t } = useTranslation();
  const [showContactModal, setShowContactModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const isPro = isProResult(result);
  const verified = isVerified(result);

  return (
    <>
      <Link href={`/profile/${result.id}`} className="block border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-300 transition-all bg-white group cursor-pointer relative">
        <div className="flex items-start gap-3">
          <MemberAvatar
            name={result.name}
            avatarUrl={result.avatar_url}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate flex items-center gap-1.5">
              {result.name}
              {verified && (
                <span title={t.common.verified} className="inline-flex items-center shrink-0">
                  <svg className="w-4 h-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                  </svg>
                </span>
              )}
            </h3>
            {isPro ? (
              <>
                {result.role && (
                  <p className="text-sm text-gray-600 truncate">
                    {result.role}{result.company ? ` at ${result.company}` : ""}
                  </p>
                )}
                {result.abg_class && (
                  <p className="text-xs text-gray-400 mt-0.5">{result.abg_class}</p>
                )}
                {result.expertise && (
                  <p className="text-xs text-blue-600 mt-1 line-clamp-1">
                    {result.expertise}
                  </p>
                )}
                {result.bio && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{result.bio}</p>
                )}
              </>
            ) : (
              <div className="mt-2 bg-gray-50 rounded-md p-2">
                <p className="text-xs text-gray-400 italic">
                  Upgrade to Pro to see full profile details
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
          {viewerTier === "premium" ? (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowContactModal(true); }}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors z-10"
            >
              Contact Member
            </button>
          ) : (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowPaymentModal(true); }}
              className="flex-1 px-3 py-1.5 bg-blue-50 text-blue-600 text-sm rounded-md hover:bg-blue-100 transition-colors"
              title="Upgrade to Pro to contact members"
            >
              Upgrade to Contact
            </button>
          )}
          <div className="flex-1 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-md text-center hover:bg-gray-200 transition-colors">
            View Profile
          </div>
        </div>
      </Link>

      {showContactModal && (
        <ContactRequestModal
          targetId={result.id}
          targetName={result.name}
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          onSuccess={() => setShowContactModal(false)}
        />
      )}

      <PaymentInfoModal
        memberId={result.id}
        memberName={result.name}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
      />
    </>
  );
}
