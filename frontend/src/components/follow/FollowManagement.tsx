import React, { useState, useEffect, useCallback } from 'react';
import type { User, UserFollow } from '../../types';
import { api, ApiError, NetworkError, TimeoutError } from '../../api';
import { ConfirmModal } from '../common/ConfirmModal';
import { useAlert } from '../../hooks/useAlert';
import { AlertContainer } from '../common/Alert';
import { 
  Users, 
  UserPlus, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Search,
  Bell,
  BellOff 
} from 'lucide-react';

const NO_THRESHOLD_VALUE = 0;

type TabType = 'following' | 'followers';

interface UnfollowConfirmState {
  show: boolean;
  userId: number | null;
  username: string;
}

interface FollowManagementProps {
  onViewUser: (userId: number) => void;
}

const EmptyState: React.FC<{
  type: 'following' | 'followers';
}> = ({ type }) => {
  return (
    <div className="text-center py-12">
      <div className="mb-4">
        {type === 'following' ? (
          <UserPlus className="w-16 h-16 text-gray-600 mx-auto" />
        ) : (
          <Users className="w-16 h-16 text-gray-600 mx-auto" />
        )}
      </div>
      <h3 className="text-lg font-medium text-gray-300 mb-2">
        {type === 'following' ? "You're not following anyone yet" : "No followers yet"}
      </h3>
      <p className="text-sm text-gray-500 max-w-sm mx-auto">
        {type === 'following'
          ? "Start following users to get notified about their ratings and discover what they're watching"
          : "When other users follow you, they'll appear here"}
      </p>
    </div>
  );
};

export const FollowManagement: React.FC<FollowManagementProps> = ({ onViewUser }) => {
  // Data state
  const [following, setFollowing] = useState<UserFollow[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [filteredFollowing, setFilteredFollowing] = useState<UserFollow[]>([]);
  const [filteredFollowers, setFilteredFollowers] = useState<User[]>([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState<TabType>('following');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUnfollowing, setIsUnfollowing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { alert, showSuccess, showError, handleApiError } = useAlert();
  
  const [unfollowConfirm, setUnfollowConfirm] = useState<UnfollowConfirmState>({
    show: false,
    userId: null,
    username: '',
  });

  const loadData = useCallback(async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const [followingData, followersData] = await Promise.all([
        api.follows.getFollowing(),
        api.follows.getFollowers(),
      ]);
      
      setFollowing(followingData);
      setFollowers(followersData);
      setFilteredFollowing(followingData);
      setFilteredFollowers(followersData);
      
      if (showRefreshIndicator) {
        showSuccess('Follow list refreshed successfully');
      }
    } catch (error) {
      handleApiError(error, 'Failed to load follow data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter data when search query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredFollowing(following);
      setFilteredFollowers(followers);
      return;
    }

    const query = searchQuery.toLowerCase();
    
    setFilteredFollowing(
      following.filter(follow =>
        follow.user.username.toLowerCase().includes(query) ||
        follow.user.email?.toLowerCase().includes(query)
      )
    );
    
    setFilteredFollowers(
      followers.filter(user =>
        user.username.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      )
    );
  }, [searchQuery, following, followers]);

  const handleRefresh = useCallback(() => {
    setSearchQuery(''); // Clear search on refresh
    loadData(true);
  }, [loadData]);

  const handleUnfollow = useCallback(async () => {
    if (!unfollowConfirm.userId) return;

    setIsUnfollowing(true);

    try {
      await api.follows.unfollowUser(unfollowConfirm.userId);
      
      // Update local state immediately for better UX
      setFollowing(prev => prev.filter(f => f.user.id !== unfollowConfirm.userId));
      setFilteredFollowing(prev => prev.filter(f => f.user.id !== unfollowConfirm.userId));
      
      showSuccess(`Successfully unfollowed ${unfollowConfirm.username}`);
      setUnfollowConfirm({ show: false, userId: null, username: '' });
    } catch (error) {
      handleApiError(error, 'Failed to unfollow user');
    } finally {
      setIsUnfollowing(false);
    }
  }, [unfollowConfirm]);

  const handleUnfollowClick = useCallback((userId: number, username: string) => {
    setUnfollowConfirm({ show: true, userId, username });
  }, []);

  const handleCancelUnfollow = useCallback(() => {
    if (!isUnfollowing) {
      setUnfollowConfirm({ show: false, userId: null, username: '' });
    }
  }, [isUnfollowing]);

  const handleTabChange = useCallback((tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery(''); // Clear search when switching tabs
  }, []);

  const formatThreshold = (threshold: number | null): string => {
    if (threshold === NO_THRESHOLD_VALUE || threshold === null) {
      return 'No notifications';
    }
    return `Notify when rating ≥ ${threshold}`;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="text-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading follow data...</p>
      </div>
    );
  }

  const displayFollowing = filteredFollowing;
  const displayFollowers = filteredFollowers;

  return (
    <div className="space-y-4">
      <AlertContainer alert={alert} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Follow Management</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh follow data"
        >
          <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" role="tablist">
        <button
          role="tab"
          aria-selected={activeTab === 'following'}
          aria-controls="following-panel"
          onClick={() => handleTabChange('following')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            activeTab === 'following'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Following ({following.length})
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'followers'}
          aria-controls="followers-panel"
          onClick={() => handleTabChange('followers')}
          className={`px-4 py-2 rounded font-medium transition-colors ${
            activeTab === 'followers'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Followers ({followers.length})
        </button>
      </div>

      {/* Search Bar */}
      {(following.length > 0 || followers.length > 0) && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${activeTab}...`}
            className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            aria-label={`Search ${activeTab}`}
          />
        </div>
      )}

      {/* Following Tab */}
      {activeTab === 'following' && (
        <div id="following-panel" role="tabpanel" className="space-y-3">
          {displayFollowing.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-8 text-gray-400">
                No results found for "{searchQuery}"
              </div>
            ) : (
              <EmptyState type="following" />
            )
          ) : (
            displayFollowing.map((follow) => (
              <div
                key={follow.id}
                className="bg-gray-800 p-4 rounded border border-gray-700 flex justify-between items-center hover:bg-gray-700 transition-colors group"
              >
                <button
                  onClick={() => onViewUser(follow.user.id)}
                  className="flex-1 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 rounded -m-2 p-2"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <p className="text-white font-medium group-hover:text-blue-400 transition-colors">
                        {follow.user.username}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        {follow.minimumRatingThreshold === null ? (
                          <>
                            <BellOff size={14} className="text-gray-500" />
                            <p className="text-sm text-gray-500">
                              {formatThreshold(follow.minimumRatingThreshold)}
                            </p>
                          </>
                        ) : (
                          <>
                            <Bell size={14} className="text-blue-400" />
                            <p className="text-sm text-gray-400">
                              {formatThreshold(follow.minimumRatingThreshold)}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => handleUnfollowClick(follow.user.id, follow.user.username)}
                  className="ml-4 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                  aria-label={`Unfollow ${follow.user.username}`}
                >
                  Unfollow
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Followers Tab */}
      {activeTab === 'followers' && (
        <div id="followers-panel" role="tabpanel" className="space-y-3">
          {displayFollowers.length === 0 ? (
            searchQuery ? (
              <div className="text-center py-8 text-gray-400">
                No results found for "{searchQuery}"
              </div>
            ) : (
              <EmptyState type="followers" />
            )
          ) : (
            displayFollowers.map((user) => (
              <button
                key={user.id}
                onClick={() => onViewUser(user.id)}
                className="w-full bg-gray-800 p-4 rounded border border-gray-700 hover:bg-gray-700 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 group"
              >
                <p className="text-white font-medium group-hover:text-blue-400 transition-colors">
                  {user.username}
                </p>
                <p className="text-sm text-gray-400 mt-1">{user.email}</p>
              </button>
            ))
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={unfollowConfirm.show}
        title="Unfollow User"
        message={`Are you sure you want to unfollow ${unfollowConfirm.username}? You will no longer receive notifications about their ratings.`}
        confirmText="Unfollow"
        confirmVariant="danger"
        isLoading={isUnfollowing}
        onConfirm={handleUnfollow}
        onCancel={handleCancelUnfollow}
      />
    </div>
  );
};