import React, { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { Bell, LogOut, Loader2 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { LoadingScreen } from './components/common/LoadingScreen';
import { NotificationsPanel } from './components/notifications/NotificationsPanel';
import { useNotifications } from './hooks/useNotifications';
import { useNavigation } from './hooks/useNavigation';
import { api } from './api';

// Lazy load heavy components for better performance
const MyMediaList = lazy(() => import('./components/media/MyMediaList').then(m => ({ default: m.MyMediaList })));
const SearchMedia = lazy(() => import('./components/media/SearchMedia').then(m => ({ default: m.SearchMedia })));
const FollowManagement = lazy(() => import('./components/follow/FollowManagement').then(m => ({ default: m.FollowManagement })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel').then(m => ({ default: m.AdminPanel })));
const UserSearch = lazy(() => import('./components/users/UserSearch').then(m => ({ default: m.UserSearch })));
const UserProfile = lazy(() => import('./components/users/UserProfile').then(m => ({ default: m.UserProfile })));
const AdvancedUserSearch = lazy(() => import('./components/users/AdvancedUserSearch').then(m => ({ default: m.AdvancedUserSearch })));
const Settings = lazy(() => import('./components/settings/Settings').then(m => ({ default: m.Settings })));

// Constants
const NOTIFICATION_BADGE_MAX = 99;

// Types
type MainView = 'myList' | 'search' | 'follow' | 'admin' | 'users' | 'settings';
type UsersSubView = 'search' | 'advanced';

/**
 * Navigation Item Component
 */
interface NavItemProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-3 font-medium whitespace-nowrap transition-colors ${
      isActive
        ? 'text-white border-b-2 border-blue-500'
        : 'text-gray-400 hover:text-white'
    }`}
    aria-current={isActive ? 'page' : undefined}
  >
    {label}
  </button>
);

/**
 * Tab Item Component
 */
interface TabItemProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ label, isActive, onClick }) => (
  <button
    role="tab"
    aria-selected={isActive}
    onClick={onClick}
    className={`px-4 py-2 font-medium transition-colors ${
      isActive
        ? 'text-white border-b-2 border-blue-500'
        : 'text-gray-400 hover:text-white'
    }`}
  >
    {label}
  </button>
);

/**
 * Header Component
 */
interface HeaderProps {
  username: string;
  isAdmin: boolean;
  unreadCount: number;
  isLoadingUnread: boolean;
  isLoggingOut: boolean;
  onNotificationsClick: () => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({
  username,
  isAdmin,
  unreadCount,
  isLoadingUnread,
  isLoggingOut,
  onNotificationsClick,
  onLogout,
}) => {
  const formattedUnreadCount = useMemo(() => {
    return unreadCount > NOTIFICATION_BADGE_MAX 
      ? `${NOTIFICATION_BADGE_MAX}+` 
      : unreadCount.toString();
  }, [unreadCount]);

  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src={`${process.env.PUBLIC_URL}/logo.png`}
            alt="Media Tracker Logo"
            className="h-8 w-8"
          />
          <h1 className="text-2xl font-bold">Media Tracker</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <span className="text-gray-400 text-sm sm:text-base">
            {username}
            {isAdmin && (
              <span className="ml-2 px-2 py-1 bg-purple-600 text-xs rounded font-medium">
                ADMIN
              </span>
            )}
          </span>
          
          <button
            onClick={onNotificationsClick}
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
                {formattedUnreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={onLogout}
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
  );
};

/**
 * Navigation Component
 */
interface NavigationProps {
  currentView: MainView;
  isAdmin: boolean;
  onNavigate: (view: MainView) => void;
  hasSelectedUser: boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  currentView,
  isAdmin,
  onNavigate,
  hasSelectedUser,
}) => (
  <nav className="bg-gray-800 border-b border-gray-700" role="navigation">
    <div className="container mx-auto px-4">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        <NavItem 
          label="My List" 
          isActive={currentView === 'myList'} 
          onClick={() => onNavigate('myList')} 
        />
        <NavItem 
          label="Search Media" 
          isActive={currentView === 'search'} 
          onClick={() => onNavigate('search')} 
        />
        <NavItem 
          label="Follow" 
          isActive={currentView === 'follow'} 
          onClick={() => onNavigate('follow')} 
        />
        {isAdmin && (
          <NavItem 
            label="Admin Panel" 
            isActive={currentView === 'admin'} 
            onClick={() => onNavigate('admin')} 
          />
        )}
        <NavItem 
          label="Users" 
          isActive={currentView === 'users' && !hasSelectedUser} 
          onClick={() => onNavigate('users')} 
        />
        <NavItem 
          label="Settings" 
          isActive={currentView === 'settings'} 
          onClick={() => onNavigate('settings')} 
        />
      </div>
    </div>
  </nav>
);

/**
 * Users View Component
 */
interface UsersViewProps {
  subView: UsersSubView;
  onSubViewChange: (view: UsersSubView) => void;
  onViewUser: (userId: number) => void;
}

const UsersView: React.FC<UsersViewProps> = ({ subView, onSubViewChange, onViewUser }) => (
  <div className="space-y-6">
    <div className="flex gap-2 border-b border-gray-700" role="tablist">
      <TabItem
        label="User Search"
        isActive={subView === 'search'}
        onClick={() => onSubViewChange('search')}
      />
      <TabItem
        label="Advanced Search"
        isActive={subView === 'advanced'}
        onClick={() => onSubViewChange('advanced')}
      />
    </div>

    <div role="tabpanel">
      <Suspense fallback={<LoadingScreen />}>
        {subView === 'search' ? (
          <UserSearch onViewUser={onViewUser} />
        ) : (
          <AdvancedUserSearch onViewUser={onViewUser} />
        )}
      </Suspense>
    </div>
  </div>
);

/**
 * Main Content Router Component
 */
interface MainContentProps {
  currentView: MainView;
  selectedUserId: number | null;
  usersSubView: UsersSubView;
  isAdmin: boolean;
  onViewUser: (userId: number) => void;
  onBackFromProfile: () => void;
  onUsersSubViewChange: (view: UsersSubView) => void;
}

const MainContent: React.FC<MainContentProps> = ({
  currentView,
  selectedUserId,
  usersSubView,
  isAdmin,
  onViewUser,
  onBackFromProfile,
  onUsersSubViewChange,
}) => {
  return (
    <Suspense fallback={<LoadingScreen />}>
      {currentView === 'myList' && <MyMediaList />}
      
      {currentView === 'search' && <SearchMedia />}
      
      {currentView === 'follow' && (
        <FollowManagement onViewUser={onViewUser} />
      )}
      
      {currentView === 'admin' && isAdmin && <AdminPanel />}
      
      {currentView === 'users' && !selectedUserId && (
        <UsersView
          subView={usersSubView}
          onSubViewChange={onUsersSubViewChange}
          onViewUser={onViewUser}
        />
      )}
      
      {currentView === 'users' && selectedUserId && (
        <UserProfile
          key={selectedUserId}
          userId={selectedUserId}
          onBack={onBackFromProfile}
        />
      )}
      
      {currentView === 'settings' && <Settings />}
    </Suspense>
  );
};

/**
 * Main App Component
 */
const App: React.FC = () => {
  const { user, logout, isAdmin, isLoading } = useAuth();
  const { 
    unreadCount, 
    isLoadingUnread, 
    loadUnreadCount 
  } = useNotifications(user);
  
  const {
    currentView,
    selectedUserId,
    usersSubView,
    navigateToView,
    viewUser,
    backFromProfile,
    setUsersSubView,
  } = useNavigation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  /**
   * Handle logout with loading state and error recovery
   */
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Force logout even on error to prevent user being stuck
      logout();
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout]);

  /**
   * Handle notifications panel close
   */
  const handleNotificationsClose = useCallback(() => {
    setShowNotifications(false);
    // Reload count after closing to catch any changes
    loadUnreadCount();
  }, [loadUnreadCount]);

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
        <Header
          username={user.username}
          isAdmin={isAdmin}
          unreadCount={unreadCount}
          isLoadingUnread={isLoadingUnread}
          isLoggingOut={isLoggingOut}
          onNotificationsClick={() => setShowNotifications(true)}
          onLogout={handleLogout}
        />

        <Navigation
          currentView={currentView}
          isAdmin={isAdmin}
          onNavigate={navigateToView}
          hasSelectedUser={!!selectedUserId}
        />

        <main className="container mx-auto px-4 py-6" role="main">
          <MainContent
            currentView={currentView}
            selectedUserId={selectedUserId}
            usersSubView={usersSubView}
            isAdmin={isAdmin}
            onViewUser={viewUser}
            onBackFromProfile={backFromProfile}
            onUsersSubViewChange={setUsersSubView}
          />
        </main>

        {showNotifications && (
          <NotificationsPanel onClose={handleNotificationsClose} />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default App;
