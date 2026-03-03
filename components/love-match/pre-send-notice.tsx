'use client';

interface PreSendNoticeProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  sharedFields: {
    nickname?: string;
    gender?: string;
    country?: string;
    self_description?: string;
    interests?: string;
    core_values?: string;
    ideal_day?: string;
  };
}

export function PreSendNotice({ isOpen, onConfirm, onCancel, sharedFields }: PreSendNoticeProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-xl">
        <div className="mb-5">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Before you send</h2>
          <p className="text-sm text-gray-500">
            The following profile information will be shared anonymously with your match.
          </p>
        </div>

        <div className="space-y-2 mb-5">
          {sharedFields.nickname && (
            <div className="flex justify-between text-sm py-2 border-b border-gray-100">
              <span className="font-medium text-gray-600">Nickname</span>
              <span className="text-gray-800">{sharedFields.nickname}</span>
            </div>
          )}
          {sharedFields.gender && (
            <div className="flex justify-between text-sm py-2 border-b border-gray-100">
              <span className="font-medium text-gray-600">Gender</span>
              <span className="text-gray-800">{sharedFields.gender}</span>
            </div>
          )}
          {sharedFields.country && (
            <div className="flex justify-between text-sm py-2 border-b border-gray-100">
              <span className="font-medium text-gray-600">Location</span>
              <span className="text-gray-800">{sharedFields.country}</span>
            </div>
          )}
          {sharedFields.self_description && (
            <div className="text-sm py-2 border-b border-gray-100">
              <span className="font-medium text-gray-600 block mb-1">Self Description</span>
              <span className="text-gray-800 line-clamp-2">{sharedFields.self_description}</span>
            </div>
          )}
          {sharedFields.interests && (
            <div className="text-sm py-2 border-b border-gray-100">
              <span className="font-medium text-gray-600 block mb-1">Interests</span>
              <span className="text-gray-800 line-clamp-2">{sharedFields.interests}</span>
            </div>
          )}
          {sharedFields.core_values && (
            <div className="text-sm py-2 border-b border-gray-100">
              <span className="font-medium text-gray-600 block mb-1">Core Values</span>
              <span className="text-gray-800 line-clamp-2">{sharedFields.core_values}</span>
            </div>
          )}
          {sharedFields.ideal_day && (
            <div className="text-sm py-2">
              <span className="font-medium text-gray-600 block mb-1">Ideal Day</span>
              <span className="text-gray-800 line-clamp-2">{sharedFields.ideal_day}</span>
            </div>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 mb-5 text-sm text-green-800">
          Your real name, contact info, and employer will <strong>NOT</strong> be shared until a mutual match is made.
        </div>

        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 bg-pink-500 text-white font-semibold rounded-lg hover:bg-pink-600 transition-colors"
          >
            Send Interest
          </button>
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
