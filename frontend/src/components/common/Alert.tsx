import React from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import type { AlertType } from '../../hooks/useAlert';

interface AlertProps {
  type: AlertType;
  message: string;
  onClose?: () => void;
  className?: string;
}

/**
 * Alert notification component
 * Displays color-coded messages with appropriate icons
 * 
 * @example
 * <Alert type="success" message="Data saved successfully!" />
 * <Alert type="error" message="Failed to load data" onClose={hideAlert} />
 */
export const Alert: React.FC<AlertProps> = ({ 
  type, 
  message, 
  onClose,
  className = '' 
}) => {
  const icons = {
    success: <CheckCircle size={20} />,
    error: <AlertCircle size={20} />,
    warning: <AlertTriangle size={20} />,
    info: <Info size={20} />,
  };

  const styles = {
    success: 'bg-green-900 bg-opacity-20 border-green-700 text-green-400',
    error: 'bg-red-900 bg-opacity-20 border-red-700 text-red-400',
    warning: 'bg-yellow-900 bg-opacity-20 border-yellow-700 text-yellow-400',
    info: 'bg-blue-900 bg-opacity-20 border-blue-700 text-blue-400',
  };

  return (
    <div
      className={`p-4 rounded-lg border flex items-center gap-3 ${styles[type]} ${className}`}
      role="alert"
      aria-live="polite"
    >
      {icons[type]}
      <span className="flex-1">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-2 hover:opacity-70 transition-opacity"
          aria-label="Close alert"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
};

/**
 * Alert container for displaying the current alert from useAlert hook
 * Only renders if there's an active alert
 * 
 * @example
 * const { alert, hideAlert } = useAlert();
 * 
 * return (
 *   <div>
 *     <AlertContainer alert={alert} onClose={hideAlert} />
 *     {/* rest of component *\/}
 *   </div>
 * );
 */
interface AlertContainerProps {
  alert: { type: AlertType | null; message: string };
  onClose?: () => void;
  className?: string;
}

export const AlertContainer: React.FC<AlertContainerProps> = ({ 
  alert, 
  onClose,
  className 
}) => {
  if (!alert.type) return null;

  return <Alert type={alert.type} message={alert.message} onClose={onClose} className={className} />;
};