import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Bell, BellOff, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import type { Notification } from '../../types';
import { api, ApiError, NetworkError, TimeoutError } from '../../api';
import { StarRating } from '../common/StarRating';

// Constants
const MODAL_Z_INDEX = 'z-50';

interface NotificationsPanelProps {
  onClose: () => void;
}

interface AlertState {
  type: 'success' | 'error' | null;
  message: string;
}

/**
 * Format timestamp to relative time
 */
const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  
  // For older dates, show formatted date
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined 
  });
};

/**
 * Loading Skeleton Component
 */
const NotificationSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-gray-800 p-4 rounded border border-gray-700 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/4"></div>
      </div>
    ))}
  </div>
);

/**
 * Empty State Component
 */
const EmptyState: React.FC<{ filtered: boolean }> = ({ filtered }) => (
  <div className="text-center py-12">
    <div className="mb-4">
      {filtered ? (
        <BellOff className="w-16 h-16 text-gray-600 mx-auto" />
      ) : (
        <Bell className="w-16 h-16 text-gray-600 mx-auto" />
      )}
    </div>
    <h3 className="text-lg font-medium text-gray-300 mb-2">
      {filtered ? 'No unread notifications' : 'No notifications'}
    </h3>
    <p className="text-sm text-gray-500 max-w-sm mx-auto">
      {filtered
        ? "You're all caught up! Check back later for new notifications."
        : "When users you follow rate items, you'll see notifications here."}
    </p>
  </div>
);

/**
 * Notifications Panel Component
 */
export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ onClose }) => {
  // Data state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [loadingIds, setLoadingIds] = useState<Set<number>>(new Set());
  const [isMarkingAllRead, setIsMarkingAllRead] = useState(false);
  const [alert, setAlert] = useState<AlertState>({ type: null, message: '' });
  
  // Refs
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  /**
   * Load notifications
   */
  const loadNotifications = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const data = await api.notifications.getNotifications(showUnreadOnly);
      setNotifications(data);
      
      if (showRefreshIndicator) {
        showAlert('success', 'Notifications refreshed');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        showAlert('error', error.message);
      } else if (error instanceof NetworkError) {
        showAlert('error', 'Network error. Please check your connection.');
      } else if (error instanceof TimeoutError) {
        showAlert('error', 'Request timeout. Please try again.');
      } else {
        showAlert('error', 'Failed to load notifications');
      }
      console.error('Failed to load notifications', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [showUnreadOnly]);

  /**
   * Initial load
   */
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  /**
   * Show alert with auto-dismiss
   */
  const showAlert = useCallback((type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: null, message: '' }), 3000);
  }, []);

  /**
   * Handle Escape key
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  /**
   * Focus trap
   */
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    // Focus close button on open
    closeButtonRef.current?.focus();

    const focusableElements = panel.querySelectorAll<HTMLElement>(
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
  }, []);

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose]
  );

  /**
   * Handle mark as read
   */
  const handleMarkAsRead = useCallback(async (id: number) => {
    // Prevent duplicate requests
    if (loadingIds.has(id)) return;

    // Add to loading set
    setLoadingIds(prev => new Set(prev).add(id));

    try {
      await api.notifications.markNotificationAsRead(id);
      
      // Optimistically update UI
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, isRead: true } : notif
        )
      );
      
      showAlert('success', 'Marked as read');
    } catch (error) {
      if (error instanceof ApiError) {
        showAlert('error', error.message);
      } else if (error instanceof NetworkError) {
        showAlert('error', 'Network error. Please check your connection.');
      } else if (error instanceof TimeoutError) {
        showAlert('error', 'Request timeout. Please try again.');
      } else {
        showAlert('error', 'Failed to mark as read');
      }
      console.error('Failed to mark as read', error);
    } finally {
      // Remove from loading set
      setLoadingIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }, [loadingIds, showAlert]);

  /**
   * Handle mark all as read
   */
  const handleMarkAllAsRead = useCallback(async () => {
    if (isMarkingAllRead) return;

    const unreadNotifications = notifications.filter(n => !n.isRead);
    if (unreadNotifications.length === 0) {
      showAlert('error', 'No unread notifications to mark');
      return;
    }

    setIsMarkingAllRead(true);

    try {
      await api.notifications.markAllNotificationsAsRead();
      
      // Optimistically update UI
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, isRead: true }))
      );
      
      showAlert('success', 'All notifications marked as read');
    } catch (error) {
      if (error instanceof ApiError) {
        showAlert('error', error.message);
      } else if (error instanceof NetworkError) {
        showAlert('error', 'Network error. Please check your connection.');
      } else if (error instanceof TimeoutError) {
        showAlert('error', 'Request timeout. Please try again.');
      } else {
        showAlert('error', 'Failed to mark all as read');
      }
      console.error('Failed to mark all as read', error);
      
      // Reload on error to ensure consistency
      loadNotifications();
    } finally {
      setIsMarkingAllRead(false);
    }
  }, [isMarkingAllRead, notifications, showAlert, loadNotifications]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    loadNotifications(true);
  }, [loadNotifications]);

  /**
   * Toggle filter
   */
  const handleToggleFilter = useCallback(() => {
    setShowUnreadOnly(prev => !prev);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;
  const hasNotifications = notifications.length > 0;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 ${MODAL_Z_INDEX}`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notifications-title"
    >
      <div
        ref={panelRef}
        className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl border border-gray-700"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Bell className="text-blue-400" size={24} />
            <h2 id="notifications-title" className="text-xl font-bold text-white">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-400">
                  ({unreadCount} unread)
                </span>
              )}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close notifications panel"
          >
            <X size={24} />
          </button>
        </div>

        {/* Alert Messages */}
        {alert.type && (
          <div
            className={`mx-4 mt-4 p-3 rounded-lg flex items-center gap-2 ${
              alert.type === 'success'
                ? 'bg-green-900 bg-opacity-20 border border-green-700 text-green-400'
                : 'bg-red-900 bg-opacity-20 border border-red-700 text-red-400'
            }`}
            role="alert"
          >
            {alert.type === 'success' ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <span className="text-sm">{alert.message}</span>
          </div>
        )}

        {/* Controls */}
        <div className="p-4 border-b border-gray-700 flex gap-2 justify-between items-center">
          <div className="flex gap-2">
            <button
              onClick={handleToggleFilter}
              disabled={isLoading}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                showUnreadOnly 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              aria-pressed={showUnreadOnly}
            >
              {showUnreadOnly ? 'Show All' : 'Unread Only'}
            </button>
            
            <button
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              className="p-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Refresh notifications"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAllRead || !hasNotifications || unreadCount === 0 || isLoading}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isMarkingAllRead ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Marking...
              </>
            ) : (
              'Mark All Read'
            )}
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <NotificationSkeleton />
          ) : notifications.length === 0 ? (
            <EmptyState filtered={showUnreadOnly} />
          ) : (
            <div className="space-y-3" role="list">
              {notifications.map((notif) => {
                const isLoading = loadingIds.has(notif.id);
                
                return (
                  <div
                    key={notif.id}
                    role="listitem"
                    className={`p-4 rounded border transition-colors ${
                      notif.isRead
                        ? 'bg-gray-800 border-gray-700'
                        : 'bg-gray-700 bg-opacity-50 border-blue-500 border-l-4'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-white break-words">{notif.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <p className="text-xs text-gray-400">
                            {formatRelativeTime(notif.createdAt)}
                          </p>
                          {!notif.isRead && (
                            <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {!notif.isRead && (
                        <button
                          onClick={() => handleMarkAsRead(notif.id)}
                          disabled={isLoading}
                          className="flex-shrink-0 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px] flex items-center justify-center"
                          aria-label={`Mark notification from ${notif.message.split(' ')[0]} as read`}
                        >
                          {isLoading ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            'Mark Read'
                          )}
                        </button>
                      )}
                    </div>
                    
                    {/* Rating Display */}
                    {notif.rating && notif.rating > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <StarRating rating={notif.rating} readonly size={14} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer with notification count */}
        {hasNotifications && !isLoading && (
          <div className="p-3 border-t border-gray-700 text-center">
            <p className="text-xs text-gray-400">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
              {showUnreadOnly && ` (${notifications.length} unread)`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};