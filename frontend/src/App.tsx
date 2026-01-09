import React, { useState, useEffect } from 'react';
import { Bell, LogOut } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { AuthPage } from './components/auth/AuthPage';
import { MyMediaList } from './components/media/MyMediaList';
import { SearchMedia } from './components/media/SearchMedia';
import { FollowManagement } from './components/follow/FollowManagement';
import { AdminPanel } from './components/admin/AdminPanel';
import { NotificationsPanel } from './components/notifications/NotificationsPanel';
import { api } from './services/api';
import { UserSearch } from './components/users/UserSearch';
import { UserProfile } from './components/users/UserProfile';
import { AdvancedUserSearch } from './components/users/AdvancedUserSearch';
import { Settings } from './components/settings/Settings';

const App: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const [activeView, setActiveView] = useState<'myList' | 'search' | 'follow' | 'admin' | 'users' | 'settings'>('myList');
  const [usersSubView, setUsersSubView] = useState<'search' | 'advanced'>('search');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [previousView, setPreviousView] = useState<'myList' | 'search' | 'follow' | 'admin' | 'users' | 'settings'>('users');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const count = await api.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count', error);
    }
  };

  const handleViewUser = (userId: number) => {
    setPreviousView(activeView);
    setSelectedUserId(userId);
    setActiveView('users');
  };

  const handleBackFromProfile = () => {
    setSelectedUserId(null);
    setActiveView(previousView);
  };

  if (!user) {
    return <AuthPage />;
  }

  return (
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
            <span className="text-gray-400">
              {user.username}
              {isAdmin && <span className="ml-2 px-2 py-1 bg-purple-600 text-xs rounded">ADMIN</span>}
            </span>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-gray-700 rounded"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-700 rounded"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => {
                setActiveView('myList');
                setSelectedUserId(null);
              }}
              className={`px-4 py-3 font-medium whitespace-nowrap ${activeView === 'myList'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              My List
            </button>
            <button
              onClick={() => {
                setActiveView('search');
                setSelectedUserId(null);
              }}
              className={`px-4 py-3 font-medium whitespace-nowrap ${activeView === 'search'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Search Media
            </button>
            <button
              onClick={() => {
                setActiveView('follow');
                setSelectedUserId(null);
              }}
              className={`px-4 py-3 font-medium whitespace-nowrap ${activeView === 'follow'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Follow
            </button>
            {isAdmin && (
              <button
                onClick={() => {
                  setActiveView('admin');
                  setSelectedUserId(null);
                }}
                className={`px-4 py-3 font-medium whitespace-nowrap ${activeView === 'admin'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                Admin Panel
              </button>
            )}
            <button
              onClick={() => {
                setActiveView('users');
                setSelectedUserId(null);
              }}
              className={`px-4 py-3 font-medium whitespace-nowrap ${activeView === 'users' && !selectedUserId
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Users
            </button>
            <button
              onClick={() => {
                setActiveView('settings');
                setSelectedUserId(null);
              }}
              className={`px-4 py-3 font-medium whitespace-nowrap ${activeView === 'settings'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
                }`}
            >
              Settings
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeView === 'myList' && <MyMediaList />}
        {activeView === 'search' && <SearchMedia />}
        {activeView === 'follow' && <FollowManagement onViewUser={handleViewUser} />}
        {activeView === 'admin' && isAdmin && <AdminPanel />}
        {activeView === 'users' && !selectedUserId && (
          <div className="space-y-6">
            <div className="flex gap-2 border-b border-gray-700">
              <button
                onClick={() => setUsersSubView('search')}
                className={`px-4 py-2 font-medium ${usersSubView === 'search'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                User Search
              </button>
              <button
                onClick={() => setUsersSubView('advanced')}
                className={`px-4 py-2 font-medium ${usersSubView === 'advanced'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                  }`}
              >
                Advanced Search
              </button>
            </div>

            {usersSubView === 'search' ? (
              <UserSearch onViewUser={handleViewUser} />
            ) : (
              <AdvancedUserSearch onViewUser={handleViewUser} />
            )}
          </div>
        )}
        {activeView === 'users' && selectedUserId && (
          <UserProfile
            key={selectedUserId}
            userId={selectedUserId}
            onBack={handleBackFromProfile}
          />
        )}
        {activeView === 'settings' && <Settings />}
      </main>

      {/* Notifications Modal */}
      {showNotifications && (
        <NotificationsPanel onClose={() => {
          setShowNotifications(false);
          loadUnreadCount();
        }} />
      )}
    </div>
  );
};

export default App;