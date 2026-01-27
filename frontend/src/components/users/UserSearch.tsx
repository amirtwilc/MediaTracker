import React, { useState, useEffect } from 'react';
import { Search, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, UserPlus, Check, X } from 'lucide-react';
import { UserProfile } from '../api/api.types';
import { api } from '../api';
import { ThresholdModal } from '../common/ThresholdModal';

interface UserSearchProps {
  onViewUser: (userId: number) => void;
}

export const UserSearch: React.FC<UserSearchProps> = ({ onViewUser }) => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Search and filters
  const [username, setUsername] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [adminOnly, setAdminOnly] = useState<boolean | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState({ by: 'lastActive', direction: 'desc' });

  const [followModal, setFollowModal] = useState<{ show: boolean; userId: number; username: string }>({
    show: false,
    userId: 0,
    username: '',
  });

  // Following state
  const [followingUsers, setFollowingUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadUsers(0);
  }, []);

  // Watch for adminOnly changes
  useEffect(() => {
    loadUsers(0);
  }, [adminOnly]);

  // Watch for sortConfig changes
  useEffect(() => {
    loadUsers(currentPage);
  }, [sortConfig]);

  // Auto-search when username is cleared
  useEffect(() => {
    const timer = setTimeout(() => {
      if (username === '') {
        loadUsers(0);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [username]);

  const loadUsers = async (page: number) => {
    setLoading(true);
    setCurrentPage(page);

    try {
      const response = await api.users.searchUsersBasic({
        username: username || undefined,
        adminOnly: adminOnly ?? false,
        sortBy: sortConfig.by,
        sortDirection: sortConfig.direction,
        page,
        size: 20,
      });
      setUsers(response.content);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to load users', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadUsers(0);
  };

  const handleFollowClick = (userId: number, username: string) => {
    setFollowModal({ show: true, userId, username });
  };

  const handleFollowConfirm = async (threshold: number | null) => {
    try {
      await api.follows.followUser(followModal.userId, threshold === null ? 0 : threshold);
      setFollowingUsers(new Set(followingUsers).add(followModal.userId));
      loadUsers(currentPage);
      setFollowModal({ show: false, userId: 0, username: '' });
    } catch (error) {
      console.error('Failed to follow user', error);
    }
  };

  const handleUnfollow = async (userId: number) => {
    try {
      await api.follows.unfollowUser(userId);
      const newFollowing = new Set(followingUsers);
      newFollowing.delete(userId);
      setFollowingUsers(newFollowing);
      loadUsers(currentPage);
    } catch (error) {
      console.error('Failed to unfollow user', error);
    }
  };

  const handleSort = (column: string) => {
    setSortConfig(prev => {
      if (prev.by === column) {
        // Toggle direction for same column
        return { by: column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        // New column - default to desc (newest/highest first)
        return { by: column, direction: 'desc' };
      }
    });
  };

  const getSortIcon = (column: string) => {
    if (sortConfig.by !== column) return null;
    return (
      <span className="ml-1 text-blue-400">
        {sortConfig.direction === 'desc' ? '↓' : '↑'}
      </span>
    );
  };

  const toggleFilter = (filterArray: string[], setFilter: (val: string[]) => void, value: string) => {
    if (filterArray.includes(value)) {
      setFilter(filterArray.filter(v => v !== value));
    } else {
      setFilter([...filterArray, value]);
    }
  };

  const hasActiveFilters = adminOnly !== undefined;

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search users by username..."
            className="w-full px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          {username && (
            <button
              onClick={() => {
                setUsername('');
                loadUsers(0);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
              title="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700"
        >
          <Filter size={18} />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          {hasActiveFilters && !showFilters && (
            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-xs rounded">Active</span>
          )}
        </button>

        {sortConfig.by && (
          <div className="text-sm text-gray-400">
            Sorted by: <span className="text-blue-400">
              {sortConfig.by === 'registrationDate' && 'Registration Date'}
              {sortConfig.by === 'lastActive' && 'Last Active'}
              {sortConfig.by === 'ratingsCount' && 'Ratings'}
              {sortConfig.by === 'followersCount' && 'Followers'}
            </span>
            {' '}
            ({sortConfig.direction === 'desc' ? 'Newest/Highest First' : 'Oldest/Lowest First'})
          </div>
        )}
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="bg-gray-800 p-4 rounded border border-gray-700 space-y-4">
          <h3 className="text-white font-medium">Filters:</h3>

          <div>
            <label className="block text-sm text-gray-300 mb-2">User Type:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAdminOnly(undefined)}
                className={`px-3 py-1 rounded text-sm ${adminOnly === undefined
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                All Users
              </button>
              <button
                onClick={() => setAdminOnly(true)}
                className={`px-3 py-1 rounded text-sm ${adminOnly === true
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
              >
                Admins Only
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={() => setAdminOnly(undefined)}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading users...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No users found.</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 text-gray-300 text-sm">
                <tr>
                  <th className="px-4 py-3 text-left">Username</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('registrationDate')}
                  >
                    Registration Date{getSortIcon('registrationDate')}
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('lastActive')}
                  >
                    Last Active{getSortIcon('lastActive')}
                  </th>
                  <th
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('ratingsCount')}
                  >
                    Ratings{getSortIcon('ratingsCount')}
                  </th>
                  <th
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('followersCount')}
                  >
                    Followers{getSortIcon('followersCount')}
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer"
                    onClick={() => onViewUser(user.id)}
                  >
                    <td className="px-4 py-3 text-white font-medium">{user.username}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-xs ${user.role === 'ADMIN'
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-700 text-gray-200'
                          }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {user.email || <span className="text-gray-600">Hidden</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-300">
                      {user.lastActive
                        ? new Date(user.lastActive).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {user.ratingsCount}
                    </td>
                    <td className="px-4 py-3 text-center text-gray-300">
                      {user.followersCount}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end" onClick={(e) => e.stopPropagation()}>
                        {user.isFollowing ? (
                          <button
                            onClick={() => handleUnfollow(user.id)}
                            className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs flex items-center gap-1"
                          >
                            <Check size={14} />
                            Following
                          </button>
                        ) : (
                          <button
                            onClick={() => handleFollowClick(user.id, user.username)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1"
                          >
                            <UserPlus size={14} />
                            Follow
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => loadUsers(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-gray-300">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => loadUsers(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
      <ThresholdModal
        isOpen={followModal.show}
        username={followModal.username}
        onConfirm={handleFollowConfirm}
        onCancel={() => setFollowModal({ show: false, userId: 0, username: '' })}
      />
    </div>
  );
};