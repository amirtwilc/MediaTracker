import React, { useState, useEffect, useCallback } from 'react';
import { Bell, LogOut, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { MyMediaList } from './components/media/MyMediaList';
import { SearchMedia } from './components/media/SearchMedia';
import { FollowManagement } from './components/follow/FollowManagement';
import { AdminPanel } from './components/admin/AdminPanel';
import { NotificationsPanel } from './components/notifications/NotificationsPanel';
import { UserSearch } from './components/users/UserSearch';
import { UserProfile } from './components/users/UserProfile';
import { AdvancedUserSearch } from './components/users/AdvancedUserSearch';
import { Settings } from './components/settings/Settings';
import { api } from './api';

// Constants
const NOTIFICATION_POLL_INTERVAL_MS = 30000; // 30 seconds
const NOTIFICATION_BADGE_MAX = 99;

// Types
type MainView = 'myList' | 'search' | 'follow' | 'admin' | 'users' | 'settings';
type UsersSubView = 'search' | 'advanced';

interface ViewState {
  main: MainView;
  usersSubView: UsersSubView;
  selectedUserId: number | null;
  previousView: MainView;
}

/**
 * Loading Screen Component
 */
const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading Media Tracker...</p>
      </div>
    </div>
  );
};

/**
 * Error Boundary Component
 */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg p-8 max-w-md w-full border border-gray-700 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-gray-400 mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Main App Component
 */
const App: React.FC = () => {
  const { user, logout, isAdmin, isLoading } = useAuth();

  // View state
  const [viewState, setViewState] = useState<ViewState>({
    main: 'myList',
    usersSubView: 'search',
    selectedUserId: null,
    previousView: 'users',
  });

  // UI state
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingUnread, setIsLoadingUnread] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Load unread notification count
   */
  const loadUnreadCount = useCallback(async () => {
    if (!user) return;

    try {
      setIsLoadingUnread(true);
      const count = await api.notifications.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count', error);
      // Don't show error to user - this is background polling
    } finally {
      setIsLoadingUnread(false);
    }
  }, [user]);

  /**
   * Set up notification polling
   */
  useEffect(() => {
    if (!user) return;

    // Load immediately
    loadUnreadCount();

    // Then poll at interval
    const interval = setInterval(loadUnreadCount, NOTIFICATION_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user, loadUnreadCount]);

  /**
   * Handle logout with loading state
   */
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even on error
      logout();
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout]);

  /**
   * Navigate to main view
   */
  const navigateToView = useCallback((view: MainView) => {
    setViewState(prev => ({
      ...prev,
      main: view,
      selectedUserId: null,
    }));
  }, []);

  /**
   * Navigate to user profile
   */
  const handleViewUser = useCallback((userId: number) => {
    setViewState(prev => ({
      ...prev,
      previousView: prev.main,
      selectedUserId: userId,
      main: 'users',
    }));
  }, []);

  /**
   * Go back from user profile
   */
  const handleBackFromProfile = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      selectedUserId: null,
      main: prev.previousView,
    }));
  }, []);

  /**
   * Change users sub-view
   */
  const setUsersSubView = useCallback((subView: UsersSubView) => {
    setViewState(prev => ({
      ...prev,
      usersSubView: subView,
    }));
  }, []);

  /**
   * Handle notifications panel close
   */
  const handleNotificationsClose = useCallback(() => {
    setShowNotifications(false);
    loadUnreadCount();
  }, [loadUnreadCount]);

  /**
   * Format unread count for badge
   */
  const formatUnreadCount = (count: number): string => {
    return count > NOTIFICATION_BADGE_MAX ? `${NOTIFICATION_BADGE_MAX}+` : count.toString();
  };

  // Show loading screen while initializing auth
  if (isLoading) {
    return <LoadingScreen />;
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Header */}
        <header className="bg-gray-800 border-b border-gray-700">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="Media Tracker Logo"
                className="h-8 w-8"
              />
              <h1 className="text-2xl font-bold">Media Tracker</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm sm:text-base">
                {user.username}
                {isAdmin && (
                  <span className="ml-2 px-2 py-1 bg-purple-600 text-xs rounded font-medium">
                    ADMIN
                  </span>
                )}
              </span>
              
              <button
                onClick={() => setShowNotifications(true)}
                className="relative p-2 hover:bg-gray-700 rounded transition-colors"
                aria-label="Show notifications"
                disabled={isLoadingUnread}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span 
                    className="absolute -top-1 -right-1 bg-red-500 text-xs min-w-[20px] h-5 rounded-full flex items-center justify-center px-1 font-medium"
                    aria-label={`${unreadCount} unread notifications`}
                  >
                    {formatUnreadCount(unreadCount)}
                  </span>
                )}
              </button>
              
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-700 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                aria-label="Logout"
                disabled={isLoggingOut}
              >
                {isLoggingOut ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <LogOut size={20} />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-gray-800 border-b border-gray-700" role="navigation">
          <div className="container mx-auto px-4">
            <div className="flex gap-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => navigateToView('myList')}
                className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                  viewState.main === 'myList'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-current={viewState.main === 'myList' ? 'page' : undefined}
              >
                My List
              </button>
              
              <button
                onClick={() => navigateToView('search')}
                className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                  viewState.main === 'search'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-current={viewState.main === 'search' ? 'page' : undefined}
              >
                Search Media
              </button>
              
              <button
                onClick={() => navigateToView('follow')}
                className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                  viewState.main === 'follow'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-current={viewState.main === 'follow' ? 'page' : undefined}
              >
                Follow
              </button>
              
              {isAdmin && (
                <button
                  onClick={() => navigateToView('admin')}
                  className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                    viewState.main === 'admin'
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  aria-current={viewState.main === 'admin' ? 'page' : undefined}
                >
                  Admin Panel
                </button>
              )}
              
              <button
                onClick={() => navigateToView('users')}
                className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                  viewState.main === 'users' && !viewState.selectedUserId
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-current={viewState.main === 'users' && !viewState.selectedUserId ? 'page' : undefined}
              >
                Users
              </button>
              
              <button
                onClick={() => navigateToView('settings')}
                className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
                  viewState.main === 'settings'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
                aria-current={viewState.main === 'settings' ? 'page' : undefined}
              >
                Settings
              </button>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6" role="main">
          {viewState.main === 'myList' && <MyMediaList />}
          
          {viewState.main === 'search' && <SearchMedia />}
          
          {viewState.main === 'follow' && (
            <FollowManagement onViewUser={handleViewUser} />
          )}
          
          {viewState.main === 'admin' && isAdmin && <AdminPanel />}
          
          {viewState.main === 'users' && !viewState.selectedUserId && (
            <div className="space-y-6">
              <div className="flex gap-2 border-b border-gray-700" role="tablist">
                <button
                  role="tab"
                  aria-selected={viewState.usersSubView === 'search'}
                  onClick={() => setUsersSubView('search')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    viewState.usersSubView === 'search'
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  User Search
                </button>
                <button
                  role="tab"
                  aria-selected={viewState.usersSubView === 'advanced'}
                  onClick={() => setUsersSubView('advanced')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    viewState.usersSubView === 'advanced'
                      ? 'text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Advanced Search
                </button>
              </div>

              <div role="tabpanel">
                {viewState.usersSubView === 'search' ? (
                  <UserSearch onViewUser={handleViewUser} />
                ) : (
                  <AdvancedUserSearch onViewUser={handleViewUser} />
                )}
              </div>
            </div>
          )}
          
          {viewState.main === 'users' && viewState.selectedUserId && (
            <UserProfile
              key={viewState.selectedUserId}
              userId={viewState.selectedUserId}
              onBack={handleBackFromProfile}
            />
          )}
          
          {viewState.main === 'settings' && <Settings />}
        </main>

        {/* Notifications Modal */}
        {showNotifications && (
          <NotificationsPanel onClose={handleNotificationsClose} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;