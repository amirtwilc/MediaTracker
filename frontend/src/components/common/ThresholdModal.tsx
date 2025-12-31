import React, { useState } from 'react';

interface ThresholdModalProps {
  isOpen: boolean;
  username: string;
  onConfirm: (threshold: number | null) => void;
  onCancel: () => void;
}

export const ThresholdModal: React.FC<ThresholdModalProps> = ({
  isOpen,
  username,
  onConfirm,
  onCancel,
}) => {
  const [threshold, setThreshold] = useState<number>(7);
  const [noNotifications, setNoNotifications] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm(noNotifications ? null : threshold);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
        <h3 className="text-xl font-bold text-white mb-4">Follow {username}</h3>
        <p className="text-gray-300 mb-6">
          Get notified when {username} rates items above a certain threshold.
        </p>

        <div className="space-y-4 mb-6">
          <label className="flex items-center gap-2 text-white cursor-pointer">
            <input
              type="checkbox"
              checked={noNotifications}
              onChange={(e) => setNoNotifications(e.target.checked)}
              className="w-4 h-4"
            />
            Don't notify me about ratings
          </label>

          {!noNotifications && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Notify me when rating is at least:
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-white font-bold text-lg w-8">{threshold}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>1</span>
                <span>10</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Follow
          </button>
        </div>
      </div>
    </div>
  );
};