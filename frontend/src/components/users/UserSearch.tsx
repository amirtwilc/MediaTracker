import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Check,
  X,
  Loader2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users as UsersIcon,
} from 'lucide-react';
import { UserProfile } from '../../api/api.types';
import { api, ApiError, NetworkError, TimeoutError } from '../../api';
import { ThresholdModal } from '../common/ThresholdModal';
import { formatDate } from '../../utils/DateUtil';

// Constants
const ITEMS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 500;

// Types
interface UserSearchProps {
  onViewUser: (userId: number) => void;
}

interface SortConfig {
  by: string;
  direction: 'asc' | 'desc';
}

interface AlertState {
  type: 'success' | 'error' | null;
  message: string;
}

/**
 * Loading Skeleton
 */
const UserSearchSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="bg-gray-800 p-4 rounded border border-gray-700 animate-pulse">
        <div className="h-4 bg-gray-700 rounded w-1/4 mb-2"></div>
        <div className="h-3 bg-gray-700 rounded w-1/2"></div>
      </div>
    ))}
  </div>
);

/**
 * Empty State
 */
const EmptyState: React.FC<{ hasSearch: boolean }> = ({ hasSearch }) => (
  <div className="text-center py-12">
    <UsersIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-300 mb-2">
      No users found
    </h3>
    <p className="text-sm text-gray-500 max-w-sm mx-auto">
      {hasSearch
        ? 'Try adjusting your search or filters to find users'
        : 'No users are registered yet'}
    </p>
  </div>
);

/**
 * User Search Component
 */
export const UserSearch: React.FC<UserSearchProps> = ({ onViewUser }) => {
  // Data state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Search and filter state
  const [username, setUsername] = useState('');
  const [debouncedUsername, setDebouncedUsername] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [adminOnly, setAdminOnly] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    by: 'lastActive',
    direction: 'desc',
  });

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingFollowIds, setLoadingFollowIds] = useState<Set<number>>(new Set());
  const [alert, setAlert] = useState<AlertState>({ type: null, message: '' });

  // Follow modal state
  const [followModalUserId, setFollowModalUserId] = useState<number | null>(null);
  const [followModalUsername, setFollowModalUsername] = useState('');

  // Refs
  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);
  const hasSearchedRef = useRef(false);
  const isMountedRef = useRef(false);

  /**
   * Load users on mount
   */
  useEffect(() => {
    // Load all users on mount, sorted by last active
    isMountedRef.current = true;
    hasSearchedRef.current = true;
    loadUsers(0);
  }, []); // Only run on mount

  /**
   * Debounce username input
   */
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedUsername(username);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [username]);

  /**
   * Load users when search parameters change (after mount)
   */
  useEffect(() => {
    // Skip on mount (handled by first useEffect)
    if (!isMountedRef.current) {
      return;
    }

    loadUsers(0);
  }, [debouncedUsername, adminOnly, sortConfig]);

  /**
   * Show alert with auto-dismiss
   */
  const showAlert = useCallback((type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert({ type: null, message: '' }), 3000);
  }, []);

  /**
   * Load users from API
   */
  const loadUsers = useCallback(
    async (page: number, showRefreshIndicator = false) => {
      if (showRefreshIndicator) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      hasSearchedRef.current = true;
      setCurrentPage(page);

      try {
        const response = await api.users.searchUsersBasic({
          username: debouncedUsername || undefined,
          adminOnly,
          sortBy: sortConfig.by,
          sortDirection: sortConfig.direction,
          page,
          size: ITEMS_PER_PAGE,
        });

        setUsers(response.content);
        setTotalPages(response.totalPages);

        if (showRefreshIndicator) {
          showAlert('success', 'Users list refreshed');
        }
      } catch (error) {
        if (error instanceof ApiError) {
          showAlert('error', error.message);
        } else if (error instanceof NetworkError) {
          showAlert('error', 'Network error. Please check your connection.');
        } else if (error instanceof TimeoutError) {
          showAlert('error', 'Request timeout. Please try again.');
        } else {
          showAlert('error', 'Failed to load users');
        }
        console.error('Failed to load users', error);
        setUsers([]);
        setTotalPages(0);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedUsername, adminOnly, sortConfig, showAlert]
  );

  /**
   * Handle manual search button click
   */
  const handleSearch = useCallback(() => {
    hasSearchedRef.current = true;
    loadUsers(0);
  }, [loadUsers]);

  /**
   * Handle refresh
   */
  const handleRefresh = useCallback(() => {
    loadUsers(currentPage, true);
  }, [loadUsers, currentPage]);

  /**
   * Handle clear search
   */
  const handleClearSearch = useCallback(() => {
    setUsername('');
    setDebouncedUsername('');
  }, []);

  /**
   * Handle sort column click
   */
  const handleSort = useCallback((column: string) => {
    setSortConfig((prev) => {
      if (prev.by === column) {
        return { by: column, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        return { by: column, direction: 'desc' };
      }
    });
  }, []);

  /**
   * Get sort icon for column
   */
  const getSortIcon = useCallback(
    (column: string) => {
      if (sortConfig.by !== column) return null;
      return (
        <span className="ml-1 text-blue-400">
          {sortConfig.direction === 'desc' ? '↓' : '↑'}
        </span>
      );
    },
    [sortConfig]
  );

  /**
   * Handle follow button click
   */
  const handleFollowClick = useCallback((userId: number, username: string) => {
    setFollowModalUserId(userId);
    setFollowModalUsername(username);
  }, []);

  /**
   * Handle follow confirmation
   */
  const handleConfirmFollow = useCallback(
    async (threshold: number | null) => {
      if (followModalUserId === null) return;

      setLoadingFollowIds((prev) => new Set(prev).add(followModalUserId));

      try {
        // Pass threshold directly - null means no notifications
        await api.follows.followUser(followModalUserId, threshold ?? 0);

        // Optimistically update UI
        setUsers((prev) =>
          prev.map((user) =>
            user.id === followModalUserId ? { ...user, isFollowing: true } : user
          )
        );

        showAlert('success', `Successfully followed ${followModalUsername}`);
        setFollowModalUserId(null);
        setFollowModalUsername('');
      } catch (error) {
        if (error instanceof ApiError) {
          showAlert('error', error.message);
        } else if (error instanceof NetworkError) {
          showAlert('error', 'Network error. Please check your connection.');
        } else if (error instanceof TimeoutError) {
          showAlert('error', 'Request timeout. Please try again.');
        } else {
          showAlert('error', 'Failed to follow user');
        }
        console.error('Failed to follow user', error);
      } finally {
        setLoadingFollowIds((prev) => {
          const next = new Set(prev);
          next.delete(followModalUserId);
          return next;
        });
      }
    },
    [followModalUserId, followModalUsername, showAlert]
  );

  /**
   * Handle unfollow
   */
  const handleUnfollow = useCallback(
    async (userId: number, e: React.MouseEvent) => {
      e.stopPropagation();

      if (loadingFollowIds.has(userId)) return;

      setLoadingFollowIds((prev) => new Set(prev).add(userId));

      try {
        await api.follows.unfollowUser(userId);

        // Optimistically update UI
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, isFollowing: false } : user
          )
        );

        showAlert('success', 'Successfully unfollowed user');
      } catch (error) {
        if (error instanceof ApiError) {
          showAlert('error', error.message);
        } else if (error instanceof NetworkError) {
          showAlert('error', 'Network error. Please check your connection.');
        } else if (error instanceof TimeoutError) {
          showAlert('error', 'Request timeout. Please try again.');
        } else {
          showAlert('error', 'Failed to unfollow user');
        }
        console.error('Failed to unfollow user', error);

        // Revert optimistic update on error
        setUsers((prev) =>
          prev.map((user) =>
            user.id === userId ? { ...user, isFollowing: true } : user
          )
        );
      } finally {
        setLoadingFollowIds((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    },
    [loadingFollowIds, showAlert]
  );

  /**
   * Handle page change
   */
  const handlePageChange = useCallback(
    (page: number) => {
      loadUsers(page);
    },
    [loadUsers]
  );

  /**
   * Get sort label
   */
  const getSortLabel = (by: string): string => {
    const labels: Record<string, string> = {
      registrationDate: 'Registration Date',
      lastActive: 'Last Active',
      ratingsCount: 'Ratings',
      followersCount: 'Followers',
    };
    return labels[by] || by;
  };

  const hasActiveFilters = adminOnly;
  const hasSearched = hasSearchedRef.current;

  return (
    <div className="space-y-4">
      {/* Alert Messages */}
      {alert.type && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            alert.type === 'success'
              ? 'bg-green-900 bg-opacity-20 border border-green-700 text-green-400'
              : 'bg-red-900 bg-opacity-20 border border-red-700 text-red-400'
          }`}
          role="alert"
        >
          {alert.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span>{alert.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">User Search</h2>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing || !hasSearched}
          className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Refresh users"
        >
          <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search users by username..."
            className="w-full px-4 py-2 pr-10 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
            aria-label="Search users"
          />
          {username && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
              aria-label="Clear search"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Filter Controls */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded border border-gray-700 transition-colors"
        >
          <Filter size={18} />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
          {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          {hasActiveFilters && !showFilters && (
            <span className="ml-2 px-2 py-0.5 bg-blue-600 text-xs rounded font-medium">
              Active
            </span>
          )}
        </button>

        {sortConfig.by && hasSearched && (
          <div className="text-sm text-gray-400">
            Sorted by:{' '}
            <span className="text-blue-400">{getSortLabel(sortConfig.by)}</span>
            {' '}({sortConfig.direction === 'desc' ? 'Newest/Highest First' : 'Oldest/Lowest First'})
          </div>
        )}
      </div>

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-4">
          <h3 className="text-white font-medium">Filters</h3>

          <div>
            <label className="block text-sm text-gray-300 mb-2">User Type:</label>
            <div className="flex gap-2">
              <button
                onClick={() => setAdminOnly(false)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  !adminOnly
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All Users
              </button>
              <button
                onClick={() => setAdminOnly(true)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  adminOnly
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
              onClick={() => setAdminOnly(false)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Results */}
      {isLoading ? (
        <UserSearchSkeleton />
      ) : users.length === 0 ? (
        <EmptyState hasSearch={!!debouncedUsername || adminOnly} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full" role="table">
              <thead className="bg-gray-700 text-gray-300 text-sm">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left">
                    Username
                  </th>
                  <th scope="col" className="px-4 py-3 text-left">
                    Role
                  </th>
                  <th scope="col" className="px-4 py-3 text-left">
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('registrationDate')}
                  >
                    Registration{getSortIcon('registrationDate')}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('lastActive')}
                  >
                    Last Active{getSortIcon('lastActive')}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('ratingsCount')}
                  >
                    Ratings{getSortIcon('ratingsCount')}
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600 transition-colors"
                    onClick={() => handleSort('followersCount')}
                  >
                    Followers{getSortIcon('followersCount')}
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {users.map((user) => {
                  const isFollowLoading = loadingFollowIds.has(user.id);

                  return (
                    <tr
                      key={user.id}
                      className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors"
                      onClick={() => onViewUser(user.id)}
                    >
                      <td className="px-4 py-3 text-white font-medium">
                        {user.username}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'ADMIN'
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
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-300">
                        {user.lastActive ? formatDate(user.lastActive) : '-'}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {user.ratingsCount}
                      </td>
                      <td className="px-4 py-3 text-center text-gray-300">
                        {user.followersCount}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div
                          className="flex gap-2 justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {user.isFollowing ? (
                            <button
                              onClick={(e) => handleUnfollow(user.id, e)}
                              disabled={isFollowLoading}
                              className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[90px] justify-center"
                              aria-label={`Unfollow ${user.username}`}
                            >
                              {isFollowLoading ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <>
                                  <Check size={14} />
                                  Following
                                </>
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleFollowClick(user.id, user.username);
                              }}
                              disabled={isFollowLoading}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[90px] justify-center"
                              aria-label={`Follow ${user.username}`}
                            >
                              <UserPlus size={14} />
                              Follow
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              className="flex items-center justify-center gap-4"
              role="navigation"
              aria-label="Pagination"
            >
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0 || isLoading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                aria-label="Previous page"
              >
                <ChevronLeft size={20} />
                Previous
              </button>
              <span className="text-gray-300">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1 || isLoading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                aria-label="Next page"
              >
                Next
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}

      {/* Follow Modal */}
      <ThresholdModal
        isOpen={followModalUserId !== null}
        username={followModalUsername}
        isLoading={followModalUserId !== null && loadingFollowIds.has(followModalUserId)}
        onConfirm={handleConfirmFollow}
        onCancel={() => {
          setFollowModalUserId(null);
          setFollowModalUsername('');
        }}
      />
    </div>
  );
};