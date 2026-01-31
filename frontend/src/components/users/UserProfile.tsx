import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, UserPlus, Check, Search, X } from 'lucide-react';
import { UserMediaListItem } from '../../types';
import { UserProfile as UserProfileType } from '../../api/api.types';
import { api } from '../../api';
import { StarRating } from '../common/StarRating';
import { useAuth } from '../../contexts/AuthContext';
import { ThresholdModal } from '../common/ThresholdModal';
import { getCategoryColor } from '../../utils/categoryColors';
import { ConfirmModal } from '../common/ConfirmModal';
import { MediaFilters } from '../media/shared/MediaFilters';
import { MediaPagination } from '../media/shared/MediaPagination';
import { MediaTable, MediaTableColumn } from '../media/shared/MediaTable';
import { useMediaPagination } from '../../hooks/useMediaPagination';
import { useFilters } from '../../hooks/useFilters';
import { useDebounce } from '../../hooks/useDebounce';
import { useSort } from '../../hooks/useSort';
import { Cursor, PaginationMode, SortConfig, MediaFilters as MediaFiltersType } from '../../types/media.types';

interface UserProfileProps {
  userId: number;
  onBack: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId, onBack }) => {
  const { user: currentUser } = useAuth();

  // Profile state
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [error, setError] = useState<string>('');
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentThreshold, setCurrentThreshold] = useState<number | null>(null);

  // Filters (only categories for UserProfile)
  const {
    filters,
    setSearchQuery,
    setCategories,
    toggleFilter,
    clearAllFilters,
    hasActiveFilters,
  } = useFilters();

  const debouncedSearchQuery = useDebounce(filters.searchQuery, 500);

  // Sort management
  const { sortConfig, paginationMode, handleSort } = useSort();

  // Fetch function for pagination hook
  const fetchPage = async ({
    page,
    cursor,
    filters: currentFilters,
    sortConfig: currentSortConfig,
    paginationMode: currentMode,
  }: {
    page: number;
    cursor: Cursor | null;
    filters: MediaFiltersType;
    sortConfig: SortConfig | null;
    paginationMode: PaginationMode;
  }) => {
    const categories = currentFilters.categories.length > 0 ? currentFilters.categories : undefined;

    if (currentMode === 'offset' && currentSortConfig) {
      const sortByMap: { [key: string]: string } = {
        'name': 'NAME',
        'year': 'YEAR',
        'experienced': 'EXPERIENCED',
        'reexperience': 'REEXPERIENCE',
        'rating': 'RATING',
      };

      const backendSortBy = sortByMap[currentSortConfig.key] || 'NAME';
      const backendSortDirection = currentSortConfig.direction === 'asc' ? 'ASC' : 'DESC';

      const response = await api.userMedia.getUserMediaListSorted({
        displayUserId: userId,
        searchQuery: debouncedSearchQuery || undefined,
        categories,
        page,
        size: 20,
        sortBy: backendSortBy,
        sortDirection: backendSortDirection,
      });

      return {
        items: response.content,
        cursor: null,
        hasMore: page < response.totalPages - 1,
        totalCount: response.totalElements,
      };
    } else {
      const response = await api.userMedia.getUserMediaListCursor({
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

  // Pagination hook
  const {
    items,
    paginationState,
    loadPage,
    handleNextPage,
    handlePrevPage,
    resetPagination,
  } = useMediaPagination<UserMediaListItem>({
    fetchFunction: fetchPage,
    filters: {
      searchQuery: debouncedSearchQuery,
      categories: filters.categories,
      genres: [],
      platforms: [],
    },
    sortConfig,
    paginationMode,
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [followModal, setFollowModal] = useState<{ show: boolean }>({ show: false });
  const [unfollowConfirm, setUnfollowConfirm] = useState(false);
  const [editingThreshold, setEditingThreshold] = useState(false);
  const [newThreshold, setNewThreshold] = useState<number>(7);

  const isInitialMount = useRef(true);

  // Load profile
  const loadProfile = async () => {
    try {
      const data = await api.users.getUserProfile(userId);
      setProfile(data);
      setIsFollowing(data.isFollowing);

      if (data.isFollowing) {
        try {
          const followData = await api.follows.getFollowing();
          const followRelation = followData.find(f => String(f.user.id) === String(userId));
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

  // Initial load
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadProfile();
      loadPage(0);
    }
  }, []);

  // Reload when filters change
  useEffect(() => {
    if (!isInitialMount.current) {
      resetPagination();
    }
  }, [debouncedSearchQuery, filters.categories]);

  // Reload when sort changes
  useEffect(() => {
    if (!isInitialMount.current && sortConfig !== null) {
      resetPagination();
    }
  }, [sortConfig]);

  // Follow handlers
  const handleFollowClick = () => {
    setFollowModal({ show: true });
  };

  const handleFollowConfirm = async (threshold: number | null) => {
    try {
      await api.follows.followUser(userId, threshold === null ? 0 : threshold);
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
      await api.follows.unfollowUser(userId);
      setIsFollowing(false);
      setCurrentThreshold(null);
      setUnfollowConfirm(false);
      await loadProfile();
    } catch (error) {
      console.error('Failed to unfollow user', error);
      setUnfollowConfirm(false);
    }
  };

  const handleUpdateThreshold = async () => {
    try {
      await api.follows.updateFollowThreshold(userId, newThreshold);
      setCurrentThreshold(newThreshold);
      setEditingThreshold(false);
      await loadProfile();
    } catch (error) {
      console.error('Failed to update threshold', error);
    }
  };

  // Table columns configuration (read-only)
  const columns: MediaTableColumn<UserMediaListItem>[] = [
    {
      key: 'category',
      label: 'Category',
      render: (item) => (
        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.mediaItem.category)} text-white`}>
          {item.mediaItem.category}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (item) => <span className="text-white font-medium">{item.mediaItem.name}</span>,
    },
    {
      key: 'year',
      label: 'Year',
      sortable: true,
      render: (item) => <span className="text-gray-300">{item.mediaItem.year || '-'}</span>,
    },
    {
      key: 'genre',
      label: 'Genre',
      render: (item) => (
        <span className="text-gray-200 text-sm">
          {item.mediaItem.genres.map(g => g.name).join(', ')}
        </span>
      ),
    },
    {
      key: 'platform',
      label: 'Platform',
      render: (item) => (
        <span className="text-gray-200 text-sm">
          {item.mediaItem.platforms.map(p => p.name).join(', ')}
        </span>
      ),
    },
    {
      key: 'experienced',
      label: 'Experienced',
      sortable: true,
      align: 'center',
      render: (item) => <span>{item.experienced ? '✓' : '-'}</span>,
    },
    {
      key: 'reexperience',
      label: 'Re-experience',
      sortable: true,
      align: 'center',
      render: (item) => <span>{item.wishToReexperience ? '✓' : '-'}</span>,
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (item) => <StarRating rating={item.rating} readonly />,
    },
    {
      key: 'comment',
      label: 'Comment',
      render: (item) => <span className="text-sm text-gray-300">{item.comment || '-'}</span>,
    },
  ];

  const hasActiveSearch = filters.searchQuery.trim().length > 0;

  // Error state
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

  // Loading state
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
                    className={`px-3 py-1 rounded text-sm ${
                      profile.role === 'ADMIN'
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
                              : `Notify when rating ≥ ${currentThreshold}`}
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
            value={filters.searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by media name..."
            className="w-full pl-10 pr-10 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
          {hasActiveSearch && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Filters (categories only) */}
      <MediaFilters
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        filterCategories={filters.categories}
        filterGenres={[]}
        filterPlatforms={[]}
        onCategoriesChange={setCategories}
        onGenresChange={() => {}}
        onPlatformsChange={() => {}}
        availableGenres={[]}
        availablePlatforms={[]}
        toggleFilter={toggleFilter}
        onClearAll={() => {
          setSearchQuery('');
          clearAllFilters();
        }}
        showGenres={false}
        showPlatforms={false}
      />

      {/* Active Sort Display */}
      {sortConfig && (
        <div className="bg-gray-800 p-3 rounded border border-gray-700">
          <span className="text-sm text-gray-300">Active sort: </span>
          <span className="text-sm text-blue-400 ml-2">
            {sortConfig.key} {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
          <button
            onClick={() => handleSort(sortConfig.key)}
            className="ml-4 text-sm text-red-400 hover:text-red-300"
          >
            Clear sort
          </button>
        </div>
      )}

      {/* Table */}
      {paginationState.loading && items.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Loading list...</div>
      ) : (
        <>
          <MediaTable
            columns={columns}
            items={items}
            sortConfig={sortConfig}
            onSort={handleSort}
            emptyMessage={
              hasActiveFilters || hasActiveSearch
                ? 'No items match your filters.'
                : 'No items in list.'
            }
          />

          <MediaPagination
            paginationState={paginationState}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
          />
        </>
      )}

      {/* Modals */}
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