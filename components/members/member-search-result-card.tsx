"use client";

import { useState } from "react";
import { MemberAvatar } from "@/components/ui/member-avatar";
import type { SearchResultBasic, SearchResultPro } from "@/lib/search-utils";
import { ContactRequestModal } from "./contact-request-modal";

type SearchResult = SearchResultBasic | SearchResultPro;

function isProResult(result: SearchResult): result is SearchResultPro {
  return "role" in result;
}

interface MemberSearchResultCardProps {
  result: SearchResult;
  viewerTier: string;
}

export function MemberSearchResultCard({ result, viewerTier }: MemberSearchResultCardProps) {
  const [showContactModal, setShowContactModal] = useState(false);
  const isPro = isProResult(result);

  return (
    <>
      <div className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow bg-white">
        <div className="flex items-start gap-3">
          <MemberAvatar
            name={result.name}
            avatarUrl={result.avatar_url}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{result.name}</h3>
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
        <div className="mt-3 pt-3 border-t border-gray-100">
          {viewerTier === "premium" ? (
            <button
              onClick={() => setShowContactModal(true)}
              className="w-full px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
            >
              Contact Member
            </button>
          ) : (
            <div className="text-center">
              <a
                href="/request"
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Upgrade to Pro to contact members
              </a>
            </div>
          )}
        </div>
      </div>

      {showContactModal && (
        <ContactRequestModal
          targetId={result.id}
          targetName={result.name}
          isOpen={showContactModal}
          onClose={() => setShowContactModal(false)}
          onSuccess={() => setShowContactModal(false)}
        />
      )}
    </>
  );
}
