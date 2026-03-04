"use client";

interface NewsStatusBadgeProps {
  isPublishedVi: boolean;
  isPublishedEn: boolean;
  isFeatured: boolean;
}

export function NewsStatusBadge({ isPublishedVi, isPublishedEn, isFeatured }: NewsStatusBadgeProps) {
  const isPublished = isPublishedVi || isPublishedEn;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {isPublishedVi && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          VI
        </span>
      )}
      {isPublishedEn && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          EN
        </span>
      )}
      {!isPublished && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          Draft
        </span>
      )}
      {isFeatured && (
        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          ★
        </span>
      )}
    </div>
  );
}
