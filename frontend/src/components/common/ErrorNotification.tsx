import React, { useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';

interface ErrorNotificationProps {
  message: string;
  onClose: () => void;
  autoHideDuration?: number;
}

/**
 * Error notification banner component
 * Displays error messages with auto-hide functionality
 * 
 * @example
 * <ErrorNotification 
 *   message="Failed to save item"
 *   onClose={() => setError('')}
 *   autoHideDuration={5000}
 * />
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  message,
  onClose,
  autoHideDuration = 5000,
}) => {
  useEffect(() => {
    if (message && autoHideDuration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, autoHideDuration);
      return () => clearTimeout(timer);
    }
  }, [message, autoHideDuration, onClose]);

  if (!message) return null;

  return (
    <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded flex justify-between items-center">
      <div className="flex items-center gap-2">
        <AlertCircle size={18} className="flex-shrink-0" />
        <span>{message}</span>
      </div>
      <button
        onClick={onClose}
        className="text-red-200 hover:text-white transition-colors"
        aria-label="Close error message"
      >
        <X size={18} />
      </button>
    </div>
  );
};
