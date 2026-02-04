import { useState, useCallback, useRef, useEffect } from 'react';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertState {
  type: AlertType | null;
  message: string;
}

interface UseAlertOptions {
  autoHideDuration?: number; // milliseconds, default 3000
}

interface UseAlertReturn {
  alert: AlertState;
  showAlert: (type: AlertType, message: string) => void;
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
  hideAlert: () => void;
  handleApiError: (error: unknown, defaultMessage?: string) => void;
}

/**
 * Managing alert notifications
 * 
 * Features:
 * - Auto-hide after configurable duration
 * - Type-specific helper methods (showSuccess, showError, etc.)
 * - Automatic API error handling with proper error types
 * - Cleanup on unmount to prevent memory leaks
 * 
 * @example
 * const { showSuccess, showError, handleApiError } = useAlert();
 * 
 * // Simple usage
 * showSuccess('Item saved!');
 * 
 * // In catch block
 * try {
 *   await saveData();
 * } catch (error) {
 *   handleApiError(error, 'Failed to save data');
 * }
 */
export function useAlert(options: UseAlertOptions = {}): UseAlertReturn {
  const { autoHideDuration = 5000 } = options;
  
  const [alert, setAlert] = useState<AlertState>({ type: null, message: '' });
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearExistingTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const hideAlert = useCallback(() => {
    clearExistingTimeout();
    setAlert({ type: null, message: '' });
  }, [clearExistingTimeout]);

  const showAlert = useCallback((type: AlertType, message: string) => {
    clearExistingTimeout();
    setAlert({ type, message });
    
    // Auto-hide after duration
    timeoutRef.current = setTimeout(() => {
      setAlert({ type: null, message: '' });
    }, autoHideDuration);
  }, [autoHideDuration, clearExistingTimeout]);

  const showSuccess = useCallback((message: string) => {
    showAlert('success', message);
  }, [showAlert]);

  const showError = useCallback((message: string) => {
    showAlert('error', message);
  }, [showAlert]);

  const showWarning = useCallback((message: string) => {
    showAlert('warning', message);
  }, [showAlert]);

  const showInfo = useCallback((message: string) => {
    showAlert('info', message);
  }, [showAlert]);

  const handleApiError = useCallback((error: unknown, defaultMessage = 'An error occurred') => {
    console.error(defaultMessage, error);

    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;
      const errorMessage = (error as { message?: string }).message;

      switch (errorName) {
        case 'ApiError':
          showError(errorMessage || defaultMessage);
          return;
        
        case 'NetworkError':
          showError('Network error. Please check your connection.');
          return;
        
        case 'TimeoutError':
          showError('Request timeout. Please try again.');
          return;
        
        case 'ValidationError':
          showError(errorMessage || 'Invalid data. Please check your input.');
          return;
        
        case 'AuthenticationError':
        case 'UnauthorizedError':
          showError('Authentication failed. Please log in again.');
          return;
        
        case 'ForbiddenError':
          showError('You do not have permission to perform this action.');
          return;
        
        case 'NotFoundError':
          showError('The requested resource was not found.');
          return;
      }
    }

    if (error && typeof error === 'object' && 'response' in error) {
      const response = (error as { response?: { status?: number; data?: { message?: string } } }).response;
      
      if (response?.data?.message) {
        showError(response.data.message);
        return;
      }
      
      if (response?.status) {
        switch (response.status) {
          case 400:
            showError('Bad request. Please check your input.');
            return;
          case 401:
            showError('Authentication required. Please log in.');
            return;
          case 403:
            showError('Access denied.');
            return;
          case 404:
            showError('Resource not found.');
            return;
          case 500:
            showError('Server error. Please try again later.');
            return;
        }
      }
    }

    // Fallback to default message
    showError(defaultMessage);
  }, [showError]);

  //Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      clearExistingTimeout();
    };
  }, [clearExistingTimeout]);

  return {
    alert,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideAlert,
    handleApiError,
  };
}