import { useState, useCallback, useEffect, useRef } from 'react';
import { api } from '../api';
import type { User } from '../types';

// Constants
const NOTIFICATION_POLL_INTERVAL_MS = 30000; // 30 seconds
const MAX_POLL_RETRIES = 3;
const RETRY_DELAY_MS = 5000;

interface UseNotificationsReturn {
  unreadCount: number;
  isLoadingUnread: boolean;
  loadUnreadCount: () => Promise<void>;
  error: string | null;
}

/**
 * Custom hook for managing notification state and polling
 * 
 * Features:
 * - Automatic polling with configurable interval
 * - Pauses when page is not visible (Page Visibility API)
 * - Retry logic for failed requests
 * - Cleanup on unmount
 */
export function useNotifications(user: User | null): UseNotificationsReturn {
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingUnread, setIsLoadingUnread] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const retryCountRef = useRef(0);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load unread notification count from API
   */
  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingUnread(true);
      setError(null);
      const count = await api.notifications.getUnreadCount();
      setUnreadCount(count);
      retryCountRef.current = 0; // Reset retry count on success
    } catch (err) {
      console.error('Failed to load unread count', err);
      setError('Failed to load notifications');
      
      // Retry logic with exponential backoff
      if (retryCountRef.current < MAX_POLL_RETRIES) {
        retryCountRef.current++;
        const delay = RETRY_DELAY_MS * retryCountRef.current;
        
        retryTimeoutRef.current = setTimeout(() => {
          loadUnreadCount();
        }, delay);
      }
    } finally {
      setIsLoadingUnread(false);
    }
  }, [user]);

  /**
   * Start polling for notifications
   */
  const startPolling = useCallback(() => {
    if (!user) return;

    // Load immediately
    loadUnreadCount();

    // Set up polling interval
    pollIntervalRef.current = setInterval(loadUnreadCount, NOTIFICATION_POLL_INTERVAL_MS);
  }, [user, loadUnreadCount]);

  /**
   * Stop polling
   */
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  /**
   * Handle page visibility changes
   */
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden - stop polling to save resources
        stopPolling();
      } else {
        // Page is visible - resume polling
        startPolling();
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Start polling if page is visible
    if (!document.hidden) {
      startPolling();
    }

    // Cleanup
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopPolling();
    };
  }, [user, startPolling, stopPolling]);

  return {
    unreadCount,
    isLoadingUnread,
    loadUnreadCount,
    error,
  };
}
