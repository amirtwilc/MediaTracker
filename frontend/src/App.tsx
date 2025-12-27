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

const App: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const [activeView, setActiveView] = useState<'myList' | 'search' | 'follow' | 'admin'>('myList');
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

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Media Tracker</h1>
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
              onClick={() => setActiveView('myList')}
              className={`px-4 py-3 font-medium whitespace-nowrap ${
                activeView === 'myList'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              My List
            </button>
            <button
              onClick={() => setActiveView('search')}
              className={`px-4 py-3 font-medium whitespace-nowrap ${
                activeView === 'search'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Search Media
            </button>
            <button
              onClick={() => setActiveView('follow')}
              className={`px-4 py-3 font-medium whitespace-nowrap ${
                activeView === 'follow'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Follow
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveView('admin')}
                className={`px-4 py-3 font-medium whitespace-nowrap ${
                  activeView === 'admin'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Admin Panel
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeView === 'myList' && <MyMediaList />}
        {activeView === 'search' && <SearchMedia />}
        {activeView === 'follow' && <FollowManagement />}
        {activeView === 'admin' && isAdmin && <AdminPanel />}
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