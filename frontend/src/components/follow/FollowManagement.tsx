import React, { useState, useEffect } from 'react';
import { User, UserFollow } from '../../types';
import { api } from '../../services/api';

export const FollowManagement: React.FC = () => {
  const [following, setFollowing] = useState<UserFollow[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>('following');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [followingData, followersData] = await Promise.all([
        api.getFollowing(),
        api.getFollowers(),
      ]);
      setFollowing(followingData);
      setFollowers(followersData);
    } catch (error) {
      console.error('Failed to load follow data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId: number) => {
    if (!window.confirm('Unfollow this user?')) return;
    
    try {
      await api.unfollowUser(userId);
      await loadData();
    } catch (error) {
      console.error('Failed to unfollow', error);
    }
  };

  const handleViewProfile = (userId: number) => {
    window.location.href = `#/user/${userId}`;
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('following')}
          className={`px-4 py-2 rounded ${
            activeTab === 'following'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Following ({following.length})
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          className={`px-4 py-2 rounded ${
            activeTab === 'followers'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Followers ({followers.length})
        </button>
      </div>

      {activeTab === 'following' ? (
        <div className="space-y-3">
          {following.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              You're not following anyone yet
            </div>
          ) : (
              following.map((follow) => (
                <div
                  key={follow.id}
                  className="bg-gray-800 p-4 rounded border border-gray-700 flex justify-between items-center cursor-pointer hover:bg-gray-750"
                  onClick={() => handleViewProfile(follow.user.id)}
                >
                  <div>
                  <p className="text-white font-medium">{follow.user.username}</p>
                  <p className="text-sm text-gray-400">
                    Notify when rating ≥ {follow.minimumRatingThreshold}
                  </p>
                </div>
                <button
                  onClick={() => handleUnfollow(follow.user.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Unfollow
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {followers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No followers yet
            </div>
          ) : (
            followers.map((user) => (
              <div
                key={user.id}
                className="bg-gray-800 p-4 rounded border border-gray-700 cursor-pointer hover:bg-gray-750"
                onClick={() => handleViewProfile(user.id)}
              >
                <p className="text-white font-medium">{user.username}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};