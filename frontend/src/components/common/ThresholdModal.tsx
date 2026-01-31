import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, BellOff, X } from 'lucide-react';

// Constants
const MIN_THRESHOLD = 1;
const MAX_THRESHOLD = 10;
const DEFAULT_THRESHOLD = 7;
const MODAL_Z_INDEX = 'z-50';

interface ThresholdModalProps {
  isOpen: boolean;
  username: string;
  currentThreshold?: number | null;
  isLoading?: boolean;
  onConfirm: (threshold: number | null) => void | Promise<void>;
  onCancel: () => void;
}

export const ThresholdModal: React.FC<ThresholdModalProps> = ({
  isOpen,
  username,
  currentThreshold,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);
  const [enableNotifications, setEnableNotifications] = useState(true);
  const modalRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Reset state when modal opens
   */
  useEffect(() => {
    if (isOpen) {
      // If editing existing follow, use current threshold
      if (currentThreshold !== undefined && currentThreshold !== null) {
        setThreshold(currentThreshold);
        setEnableNotifications(true);
      } else if (currentThreshold === null) {
        // Currently following without notifications
        setThreshold(DEFAULT_THRESHOLD);
        setEnableNotifications(false);
      } else {
        // New follow
        setThreshold(DEFAULT_THRESHOLD);
        setEnableNotifications(true);
      }
    }
  }, [isOpen, currentThreshold]);

  /**
   * Handle escape key
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, isLoading, onCancel]);

  /**
   * Focus trap
   */
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    cancelButtonRef.current?.focus();

    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget && !isLoading) {
        onCancel();
      }
    },
    [isLoading, onCancel]
  );

  /**
   * Handle confirm
   */
  const handleConfirm = useCallback(async () => {
    if (isLoading) return;

    // Validate threshold
    const finalThreshold = enableNotifications ? threshold : null;

    if (enableNotifications && (threshold < MIN_THRESHOLD || threshold > MAX_THRESHOLD)) {
      return; // Should not happen due to input constraints
    }

    await onConfirm(finalThreshold);
  }, [isLoading, enableNotifications, threshold, onConfirm]);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 ${MODAL_Z_INDEX}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="threshold-modal-title"
      aria-describedby="threshold-modal-description"
    >
      <div
        ref={modalRef}
        className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700 shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <h3 id="threshold-modal-title" className="text-xl font-bold text-white">
            Follow {username}
          </h3>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="text-gray-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Description */}
        <p id="threshold-modal-description" className="text-gray-300 mb-6">
          Choose whether you want to receive notifications when {username} rates items.
        </p>

        {/* Notification Options */}
        <div className="space-y-4 mb-6">
          {/* Enable/Disable Toggle */}
          <div className="bg-gray-700 rounded-lg p-4 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="flex items-center h-6">
                <input
                  type="radio"
                  name="notification-type"
                  checked={enableNotifications}
                  onChange={() => setEnableNotifications(true)}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-white font-medium">
                  <Bell size={16} />
                  <span>Enable notifications</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Get notified when {username} rates items at or above your threshold
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="flex items-center h-6">
                <input
                  type="radio"
                  name="notification-type"
                  checked={!enableNotifications}
                  onChange={() => setEnableNotifications(false)}
                  disabled={isLoading}
                  className="w-4 h-4 text-blue-600 cursor-pointer"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 text-white font-medium">
                  <BellOff size={16} />
                  <span>Follow silently</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  Follow {username} without receiving notifications
                </p>
              </div>
            </label>
          </div>

          {/* Threshold Slider */}
          {enableNotifications && (
            <div className="bg-gray-700 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Minimum rating threshold: <span className="text-white text-lg">{threshold}</span>
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min={MIN_THRESHOLD}
                  max={MAX_THRESHOLD}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  disabled={isLoading}
                  className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  aria-label="Rating threshold"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{MIN_THRESHOLD}</span>
                  <span className="text-gray-300">
                    Notify when rating ≥ {threshold}
                  </span>
                  <span>{MAX_THRESHOLD}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <button
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 min-w-[100px]"
          >
            {isLoading ? 'Processing...' : 'Follow'}
          </button>
        </div>
      </div>
    </div>
  );
};