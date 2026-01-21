import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, UserPlus, Check, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { UserProfile as UserProfileType, UserMediaListItem } from '../../types';
import { api } from '../../services/api';
import { StarRating } from '../common/StarRating';
import { useAuth } from '../../contexts/AuthContext';
import { ThresholdModal } from '../common/ThresholdModal';
import { getCategoryColor } from '../../utils/categoryColors';
import { ConfirmModal } from '../common/ConfirmModal';

interface UserProfileProps {
  userId: number;
  onBack: () => void;
}

interface CachedPage {
  items: UserMediaListItem[];
  cursor: { name: string; id: number } | null;
  hasMore: boolean;
  totalCount: number;
}

interface PageCache {
  [key: string]: CachedPage;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onBack }) => {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [items, setItems] = useState<UserMediaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentThreshold, setCurrentThreshold] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);

  const [followModal, setFollowModal] = useState<{ show: boolean }>({ show: false });
  const [unfollowConfirm, setUnfollowConfirm] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [newThreshold, setNewThreshold] = useState<number>(7);

  // Pagination mode
  const [paginationMode, setPaginationMode] = useState<'cursor' | 'offset'>('cursor');

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Cursor-based pagination state
  const [cursors, setCursors] = useState<Array<{ name: string; id: number } | null>>([null]);
  const [pageCache, setPageCache] = useState<PageCache>({});
  const [prefetchInProgress, setPrefetchInProgress] = useState<Set<number>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);

  const [error, setError] = useState<string>('');

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Initial load only
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadProfile();
      loadPage(0);
    }
  }, []);

  // Reload when filters change (but not on initial mount)
  useEffect(() => {
    if (!isInitialMount.current) {
      handleSearch();
    }
  }, [debouncedSearchQuery, filterCategories]);

  // Reload when sort changes
  useEffect(() => {
    if (!isInitialMount.current && sortConfig !== null) {
      handleSearch();
    }
  }, [sortConfig]);

  // Prefetch adjacent pages when current page changes
  useEffect(() => {
    if (items.length > 0 && paginationMode === 'cursor') {
      if (hasNextPage && currentPage + 1 < cursors.length) {
        prefetchPage(currentPage + 1);
      }
      if (currentPage > 0) {
        prefetchPage(currentPage - 1);
      }
    }
  }, [currentPage]);

  const getCacheKey = (page: number): string => {
    const filters = {
      searchQuery: debouncedSearchQuery,
      categories: filterCategories.sort(),
      sort: sortConfig,
    };
    return `${page}-${JSON.stringify(filters)}`;
  };

  const fetchPage = async (
    pageNum: number,
    cursor: { name: string; id: number } | null,
    signal?: AbortSignal
  ): Promise<CachedPage> => {
    const categories = filterCategories.length > 0 ? filterCategories : undefined;

    if (paginationMode === 'offset' && sortConfig) {
      // Map frontend sort keys to backend enum
      const sortByMap: { [key: string]: string } = {
        'name': 'NAME',
        'year': 'YEAR',
        'experienced': 'EXPERIENCED',
        'reexperience': 'REEXPERIENCE',
        'rating': 'RATING',
      };

      const backendSortBy = sortByMap[sortConfig.key] || 'NAME';
      const backendSortDirection = sortConfig.direction === 'asc' ? 'ASC' : 'DESC';

      // Use GraphQL sorted endpoint with offset pagination
      const response = await api.getUserMediaListSortedGraphQL({
        displayUserId: userId,
        searchQuery: debouncedSearchQuery || undefined,
        categories,
        page: pageNum,
        size: 20,
        sortBy: backendSortBy,
        sortDirection: backendSortDirection,
      });

      return {
        items: response.content,
        cursor: null,
        hasMore: pageNum < response.totalPages - 1,
        totalCount: response.totalElements,
      };
    } else {
      // Use GraphQL cursor endpoint (unsorted, default by name)
      const response = await api.getUserMediaListCursorGraphQL({
        displayUserId: userId,
        searchQuery: debouncedSearchQuery || undefined,
        categories,
        cursorName: cursor?.name,
        cursorId: cursor?.id,
        limit: 20,
      });

      return {
        items: response.items,
        cursor: response.nextCursor || null,
        hasMore: response.hasMore,
        totalCount: response.totalCount,
      };
    }
  };

  const prefetchPage = async (pageNum: number) => {
    const cacheKey = getCacheKey(pageNum);

    if (pageCache[cacheKey] || prefetchInProgress.has(pageNum)) {
      return;
    }

    if (pageNum >= cursors.length) {
      return;
    }

    setPrefetchInProgress(prev => new Set(prev).add(pageNum));

    try {
      const cursor = cursors[pageNum];
      const result = await fetchPage(pageNum, cursor);

      setPageCache(prev => ({
        ...prev,
        [cacheKey]: result,
      }));

      if (result.hasMore && result.cursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          if (pageNum + 1 >= newCursors.length) {
            newCursors.push(result.cursor);
          }
          return newCursors;
        });
      }
    } catch (error) {
      console.error(`Failed to prefetch page ${pageNum}`, error);
    } finally {
      setPrefetchInProgress(prev => {
        const newSet = new Set(prev);
        newSet.delete(pageNum);
        return newSet;
      });
    }
  };

  const loadPage = async (pageNum: number) => {
    const cacheKey = getCacheKey(pageNum);

    if (pageCache[cacheKey]) {
      const cached = pageCache[cacheKey];
      setItems(cached.items);
      setHasNextPage(cached.hasMore);
      setHasPrevPage(pageNum > 0);
      setCurrentPage(pageNum);
      setTotalCount(cached.totalCount);
      setTotalPages(Math.ceil(cached.totalCount / 20));
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);

    try {
      const cursor = cursors[pageNum];
      const result = await fetchPage(pageNum, cursor, abortControllerRef.current.signal);

      setPageCache(prev => ({
        ...prev,
        [cacheKey]: result,
      }));

      if (result.hasMore && result.cursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          if (pageNum + 1 >= newCursors.length) {
            newCursors.push(result.cursor);
          }
          return newCursors;
        });
      }

      setItems(result.items);
      setHasNextPage(result.hasMore);
      setHasPrevPage(pageNum > 0);
      setCurrentPage(pageNum);
      setTotalCount(result.totalCount);
      setTotalPages(Math.ceil(result.totalCount / 20));
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to load page', error);
        setItems([]);
        setHasNextPage(false);
        setHasPrevPage(false);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSearch = () => {
    setCurrentPage(0);
    if (paginationMode === 'cursor') {
      setCursors([null]);
    }
    setPageCache({});
    loadPage(0);
  };

  const handleNextPage = () => {
    if (hasNextPage) {
      loadPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      loadPage(currentPage - 1);
    }
  };

  const loadProfile = async () => {
    try {
      const data = await api.getUserProfile(userId);
      setProfile(data);
      setIsFollowing(data.isFollowing);
      // Fetch current threshold if following
      if (data.isFollowing) {
        try {
          const followData = await api.getFollowingGraphQL();
          const followRelation = followData.find(f => f.user.id === userId);
          if (followRelation) {
            setCurrentThreshold(followRelation.minimumRatingThreshold);
            setNewThreshold(followRelation.minimumRatingThreshold);
          }
        } catch (error) {
          console.error('Failed to load threshold', error);
        }
      }
      setError('');
    } catch (error: any) {
      console.error('Failed to load profile', error);
      if (error.message.includes('private') || error.message.includes('invisible')) {
        setError('This user has chosen to make their profile private.');
      } else {
        setError('Failed to load user profile.');
      }
    }
  };

  const handleFollowClick = () => {
    setFollowModal({ show: true });
  };

  const handleUpdateThreshold = async () => {
    try {
      await api.updateFollowThresholdGraphQL(userId, newThreshold);
      setCurrentThreshold(newThreshold);
      setEditingThreshold(false);
      await loadProfile();
    } catch (error) {
      console.error('Failed to update threshold', error);
    }
  };

  const handleFollowConfirm = async (threshold: number | null) => {
    try {
      await api.followUserGraphQL(userId, threshold === null ? 0 : threshold);
      setIsFollowing(true);
      loadProfile();
      setFollowModal({ show: false });
    } catch (error) {
      console.error('Failed to follow user', error);
    }
  };

  const handleUnfollowClick = () => {
    setUnfollowConfirm(true);
  };

  const handleUnfollowConfirm = async () => {
    try {
      await api.unfollowUserGraphQL(userId);
      setIsFollowing(false);
      setCurrentThreshold(null);
      setUnfollowConfirm(false);
      await loadProfile();
    } catch (error) {
      console.error('Failed to unfollow user', error);
      setUnfollowConfirm(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        // First click: sort ascending, switch to offset pagination
        setPaginationMode('offset');
        return { key, direction: 'asc' };
      } else if (current.direction === 'asc') {
        // Second click: sort descending, stay in offset pagination
        return { key, direction: 'desc' };
      } else {
        // Third click: remove sort, switch back to cursor pagination
        setPaginationMode('cursor');
        return null;
      }
    });
  };

  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;

    return (
      <span className="ml-1 text-blue-400 text-xs">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
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

  const hasActiveFilters = filterCategories.length > 0;
  const hasActiveSearch = searchQuery.trim().length > 0;

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="bg-gray-800 p-8 rounded border border-gray-700 text-center">
          <p className="text-gray-300 text-lg mb-4">{error}</p>
          <p className="text-gray-400 mb-6">This user's profile is not accessible.</p>
          {isFollowing && (
            <button
              onClick={handleUnfollowClick}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-2"
            >
              <Check size={18} />
              Following
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="text-center py-8 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back Button and Profile Header */}
      <div className="flex items-start justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="flex-1 mx-6">
          <div className="bg-gray-800 p-6 rounded border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white">{profile.username}</h2>
                  <span
                    className={`px-3 py-1 rounded text-sm ${profile.role === 'ADMIN'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-200'
                      }`}
                  >
                    {profile.role}
                  </span>
                </div>
                {profile.email && (
                  <p className="text-gray-400 text-sm mb-2">{profile.email}</p>
                )}
                <div className="flex gap-6 text-sm text-gray-400">
                  <span>Joined: {new Date(profile.createdAt).toLocaleDateString()}</span>
                  <span>Last Active: {new Date(profile.lastActive).toLocaleDateString()}</span>
                  <span>Ratings: {profile.ratingsCount}</span>
                  <span>Followers: {profile.followersCount}</span>
                </div>
              </div>

              {currentUser?.id !== userId && (
                <div>
                  {isFollowing ? (
                    <div>
                      {editingThreshold ? (
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <label className="flex items-center gap-2 text-white cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newThreshold === 0}
                                onChange={(e) => setNewThreshold(e.target.checked ? 0 : 7)}
                                className="w-4 h-4"
                              />
                              <span className="text-sm">Don't notify me about ratings</span>
                            </label>
                          </div>
                          {newThreshold > 0 && (
                            <div className="flex items-center gap-2 bg-gray-700 px-3 py-2 rounded">
                              <span className="text-gray-300 text-sm">Threshold:</span>
                              <input
                                type="number"
                                min="1"
                                max="10"
                                value={newThreshold}
                                onChange={(e) => setNewThreshold(Number(e.target.value))}
                                className="w-16 px-2 py-1 bg-gray-600 text-white rounded text-sm"
                              />
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleUpdateThreshold}
                              className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => {
                                setEditingThreshold(false);
                                setNewThreshold(currentThreshold || 7);
                              }}
                              className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={handleUnfollowClick}
                              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-2"
                            >
                              <Check size={18} />
                              Following
                            </button>
                            <button
                              onClick={() => setEditingThreshold(true)}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                            >
                              Edit Threshold
                            </button>
                          </div>
                          <p className="text-sm text-gray-400">
                            {currentThreshold === 0 || currentThreshold === null
                              ? 'No rating notification specified'
                              : `Notify when rating ≥ ${currentThreshold}`
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={handleFollowClick}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
                    >
                      <UserPlus size={18} />
                      Follow
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white">{profile.username}'s Media List</h3>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
            }}
            placeholder="Search by media name..."
            className="w-full pl-10 pr-10 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          {hasActiveSearch && (
            <button
              onClick={() => {
                setSearchQuery('');
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center gap-4">
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
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-800 p-4 rounded border border-gray-700 space-y-4">
          <h3 className="text-white font-medium">Filters:</h3>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Categories:</label>
            <div className="flex flex-wrap gap-2">
              {['MOVIE', 'SERIES', 'GAME'].map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleFilter(filterCategories, setFilterCategories, cat)}
                  className={`px-3 py-1 rounded text-sm ${filterCategories.includes(cat)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {(hasActiveFilters || hasActiveSearch) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategories([]);
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Sort Display */}
      {sortConfig && (
        <div className="bg-gray-800 p-3 rounded border border-gray-700">
          <span className="text-sm text-gray-300">Active sort: </span>
          <span className="text-sm text-blue-400 ml-2">
            {sortConfig.key} {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
          <button
            onClick={() => setSortConfig(null)}
            className="ml-4 text-sm text-red-400 hover:text-red-300"
          >
            Clear sort
          </button>
        </div>
      )}

      {/* List Table */}
      {loading && items.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Loading list...</div>
      ) : totalCount === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {hasActiveFilters || hasActiveSearch ? 'No items match your filters.' : 'No items in list.'}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 text-gray-300 text-sm">
                <tr>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('name')}
                  >
                    Name {getSortIcon('name')}
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('year')}
                  >
                    Year {getSortIcon('year')}
                  </th>
                  <th className="px-4 py-3 text-left">Genre</th>
                  <th className="px-4 py-3 text-left">Platform</th>
                  <th
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('experienced')}
                  >
                    Experienced {getSortIcon('experienced')}
                  </th>
                  <th
                    className="px-4 py-3 text-center cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('reexperience')}
                  >
                    Re-experience {getSortIcon('reexperience')}</th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('rating')}
                  >
                    Rating {getSortIcon('rating')}
                  </th>
                  <th className="px-4 py-3 text-left">Comment</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.mediaItem.category)} text-white`}>
                        {item.mediaItem.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{item.mediaItem.name}</td>
                    <td className="px-4 py-3 text-gray-300">{item.mediaItem.year || '-'}</td>
                    <td className="px-4 py-3 text-gray-200 text-sm">
                      {item.mediaItem.genres.map(g => g.name).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-gray-200 text-sm">
                      {item.mediaItem.platforms.map(p => p.name).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span>{item.experienced ? '✓' : '-'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span>{item.wishToReexperience ? '✓' : '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StarRating rating={item.rating} readonly />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{item.comment || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-4">
              <button
                onClick={handlePrevPage}
                disabled={!hasPrevPage || loading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <ChevronLeft size={20} />
                Previous
              </button>
              <span className="text-gray-300">
                Page {currentPage + 1} of {totalPages}
                {totalCount > 0 && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({totalCount} items)
                  </span>
                )}
                {prefetchInProgress.size > 0 && (
                  <span className="ml-2 text-xs text-blue-400">(prefetching...)</span>
                )}
              </span>
              <button
                onClick={handleNextPage}
                disabled={!hasNextPage || loading}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Next
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={unfollowConfirm}
        title="Unfollow User"
        message={`Are you sure you want to unfollow ${profile?.username}?`}
        onConfirm={handleUnfollowConfirm}
        onCancel={() => setUnfollowConfirm(false)}
      />
      <ThresholdModal
        isOpen={followModal.show}
        username={profile.username}
        onConfirm={handleFollowConfirm}
        onCancel={() => setFollowModal({ show: false })}
      />
    </div>
  );
};