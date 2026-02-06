"use client";

interface BlurredMatchCardProps {
  match: {
    id: string;
    name: string;
    role: string;
    company: string;
    reason: string;
    blurred: boolean;
  };
  onUpgradeClick?: () => void;
}

export function BlurredMatchCard({ match, onUpgradeClick }: BlurredMatchCardProps) {
  return (
    <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 relative overflow-hidden">
      {/* Blurred content */}
      <div className="blur-sm select-none pointer-events-none">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-gray-300" />
          <div>
            <h3 className="font-semibold text-gray-900">{match.name}</h3>
            <p className="text-sm text-gray-600">
              {match.role} at {match.company}
            </p>
          </div>
        </div>
        <p className="text-sm text-gray-500">{match.reason}</p>
      </div>

      {/* Overlay with lock and upgrade prompt */}
      <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
        <div className="text-center px-4">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-gray-100 flex items-center justify-center">
            <svg
              className="w-5 h-5 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Upgrade to see full profile
          </p>
          {onUpgradeClick && (
            <button
              onClick={onUpgradeClick}
              className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
            >
              Upgrade Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
