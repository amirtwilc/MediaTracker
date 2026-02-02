import React, { useState, useEffect, useRef } from 'react';
import { Plus, Check, X } from 'lucide-react';
import type { MediaItem, UserMediaListItem } from '../../types';
import { StarRating } from '../common/StarRating';
import { getCategoryColor } from '../../utils/categoryColors';
import { api } from '../../api';
import { MediaFilters } from './shared/MediaFilters';
import { MediaPagination } from './shared/MediaPagination';
import { MediaTable, MediaTableColumn } from './shared/MediaTable';
import { useMediaPagination } from '../../hooks/useMediaPagination';
import { useFilters } from '../../hooks/useFilters';
import { useDebounce } from '../../hooks/useDebounce';
import { useSort } from '../../hooks/useSort';
import type { Cursor, PaginationMode, SortConfig, MediaFilters as MediaFiltersType } from '../../types/media.types';

export const SearchMedia: React.FC = () => {
  // Filters and search
  const {
    filters,
    availableFilters,
    setSearchQuery,
    setCategories,
    setGenres,
    setPlatforms,
    setAvailableGenres,
    setAvailablePlatforms,
    toggleFilter,
    clearAllFilters,
    hasActiveFilters,
  } = useFilters();

  const debouncedQuery = useDebounce(filters.searchQuery, 500);

  // Sort management
  const { sortConfig, paginationMode, handleSort, setSortConfig } = useSort();

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
    const genreIds = currentFilters.genres.length > 0
      ? availableFilters.genres.filter(g => currentFilters.genres.includes(g.name)).map(g => g.id)
      : undefined;

    const platformIds = currentFilters.platforms.length > 0
      ? availableFilters.platforms.filter(p => currentFilters.platforms.includes(p.name)).map(p => p.id)
      : undefined;

    const categories = currentFilters.categories.length > 0 ? currentFilters.categories : undefined;

    if (currentMode === 'offset' && currentSortConfig) {
      const sortByMap: { [key: string]: string } = {
        'name': 'NAME',
        'year': 'YEAR',
        'avgRating': 'AVG_RATING',
      };

      const backendSortBy = sortByMap[currentSortConfig.key] || 'NAME';

      const response = await api.media.searchMediaItemsSorted({
        query: debouncedQuery || '',
        categories,
        genreIds,
        platformIds,
        page,
        size: 20,
        sortBy: backendSortBy,
        sortDirection: currentSortConfig.direction.toUpperCase(),
      });

      return {
        items: response.content,
        cursor: null,
        hasMore: page < response.totalPages - 1,
        totalCount: response.totalElements,
      };
    } else {
      const response = await api.media.searchMediaItemsCursor({
        query: debouncedQuery || '',
        categories,
        genreIds,
        platformIds,
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
  } = useMediaPagination<MediaItem>({
    fetchFunction: fetchPage,
    filters: {
      searchQuery: debouncedQuery,
      categories: filters.categories,
      genres: filters.genres,
      platforms: filters.platforms,
    },
    sortConfig,
    paginationMode,
  });

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [editingAddedId, setEditingAddedId] = useState<number | null>(null);
  const [editState, setEditState] = useState<Partial<UserMediaListItem>>({});

  const isInitialMount = useRef(true);

  // Load available filters
  const loadAvailableFilters = async () => {
    try {
      const categories = filters.categories.length > 0 ? filters.categories : undefined;

      const [genresData, platformsData] = await Promise.all([
        api.filters.getAvailableMediaGenres({
          query: debouncedQuery || undefined,
          categories,
        }),
        api.filters.getAvailableMediaPlatforms({
          query: debouncedQuery || undefined,
          categories,
        }),
      ]);

      setAvailableGenres(genresData);
      setAvailablePlatforms(platformsData);
    } catch (error) {
      console.error('Failed to load available filters', error);
    }
  };

  // Initial load
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadAvailableFilters();
      loadPage(0);
    }
  }, []);

  // Reload when filters/search change
  useEffect(() => {
    if (!isInitialMount.current) {
      resetPagination();
    }
  }, [debouncedQuery, filters.categories, filters.genres, filters.platforms]);

  // Reload available filters when query or categories change
  useEffect(() => {
    if (!isInitialMount.current) {
      loadAvailableFilters();
    }
  }, [debouncedQuery, filters.categories]);

  // Reload when sort changes
  useEffect(() => {
    if (!isInitialMount.current && sortConfig !== null) {
      resetPagination();
    }
  }, [sortConfig]);

  // Auto-hide error message
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Add item handler
  const handleAdd = async (mediaItemId: number) => {
    try {
      const result = await api.userMedia.addToMyList(mediaItemId);
      setEditingAddedId(mediaItemId);
      setEditState({
        id: result.id,
        experienced: false,
        wishToReexperience: false,
        rating: undefined,
        comment: '',
      });

      items.forEach(item => {
        if (item.id === mediaItemId) {
          item.inUserList = true;
        }
      });

      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to add item');
    }
  };

  // Update item handler
  const handleSaveUpdate = async (mediaItemId: number) => {
    try {
      if (editState.id) {
        await api.userMedia.updateMyListItem(editState.id, editState);
        setEditingAddedId(null);
        setEditState({});
      }
    } catch (error) {
      console.error('Failed to update item', error);
    }
  };

  // Clear all handler
  const handleClearAll = () => {
    setSearchQuery('');
    clearAllFilters();
    setSortConfig(null);
  };

  // Table columns configuration
  const columns: MediaTableColumn<MediaItem>[] = [
    {
      key: 'category',
      label: 'Category',
      render: (item) => (
        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.category)} text-white`}>
          {item.category}
        </span>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (item) => <span className="text-white font-medium">{item.name}</span>,
    },
    {
      key: 'year',
      label: 'Year',
      sortable: true,
      render: (item) => <span className="text-gray-300">{item.year || '-'}</span>,
    },
    {
      key: 'avgRating',
      label: 'Avg Rating',
      sortable: true,
      render: (item) => (
        item.avgRating ? (
          <span className="text-yellow-400 font-medium">{item.avgRating.toFixed(1)}</span>
        ) : (
          <span>-</span>
        )
      ),
    },
    {
      key: 'genre',
      label: 'Genre',
      render: (item) => (
        <span className="text-gray-200 text-sm">
          {item.genres.map(g => g.name).join(', ')}
        </span>
      ),
    },
    {
      key: 'platform',
      label: 'Platform',
      render: (item) => (
        <span className="text-gray-200 text-sm">
          {item.platforms.map(p => p.name).join(', ')}
        </span>
      ),
    },
    {
      key: 'experienced',
      label: 'Experienced',
      align: 'center',
      render: (item) => {
        const isEditing = editingAddedId === item.id;
        const currentExperienced = isEditing ? editState.experienced : false;

        return isEditing ? (
          <input
            type="checkbox"
            checked={currentExperienced || false}
            onChange={(e) => setEditState({
              ...editState,
              experienced: e.target.checked,
              ...(e.target.checked ? {} : { rating: undefined, wishToReexperience: false })
            })}
            className="w-4 h-4"
          />
        ) : (
          <span>-</span>
        );
      },
    },
    {
      key: 'reexperience',
      label: 'Re-experience',
      align: 'center',
      render: (item) => {
        const isEditing = editingAddedId === item.id;
        const currentExperienced = isEditing ? editState.experienced : false;

        return isEditing && currentExperienced ? (
          <input
            type="checkbox"
            checked={editState.wishToReexperience || false}
            onChange={(e) => setEditState({ ...editState, wishToReexperience: e.target.checked })}
            className="w-4 h-4"
          />
        ) : (
          <span>-</span>
        );
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      render: (item) => {
        const isEditing = editingAddedId === item.id;
        const currentExperienced = isEditing ? editState.experienced : false;

        if (isEditing && currentExperienced) {
          return (
            <div className="flex items-center w-[220px]">
              <StarRating
                rating={editState.rating}
                onChange={(rating) => setEditState({ ...editState, rating })}
              />
            </div>
          );
        }
        
        return (
          <div className="flex items-center w-[220px]">
            <StarRating rating={undefined} readonly showLabel={false} />
          </div>
        );
      },
    },
    {
      key: 'comment',
      label: 'Comment',
      render: (item) => {
        const isEditing = editingAddedId === item.id;

        return isEditing ? (
          <input
            type="text"
            maxLength={100}
            value={editState.comment || ''}
            onChange={(e) => setEditState({ ...editState, comment: e.target.value })}
            placeholder="Add comment..."
            className="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm"
          />
        ) : (
          <span>-</span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (item) => {
        const isEditing = editingAddedId === item.id;
        const isInList = item.inUserList || false;

        if (isEditing) {
          return (
            <button
              onClick={() => handleSaveUpdate(item.id)}
              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
            >
              Update
            </button>
          );
        }

        if (isInList) {
          return (
            <div className="flex items-center justify-end gap-2 text-green-400">
              <Check size={16} />
              <span className="text-xs">Added</span>
            </div>
          );
        }

        return (
          <button
            onClick={() => handleAdd(item.id)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} />
            Add
          </button>
        );
      },
    },
  ];

  const hasActiveSearch = filters.searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Error Notification */}
      {errorMessage && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded flex justify-between items-center">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage('')} className="text-red-200 hover:text-white">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for movies, series, or games..."
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        {(hasActiveSearch || hasActiveFilters || sortConfig) && (
          <button
            onClick={handleClearAll}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2"
            title="Clear all"
          >
            <X size={20} />
            Clear All
          </button>
        )}
      </div>

      {/* Filters */}
      <MediaFilters
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        filterCategories={filters.categories}
        filterGenres={filters.genres}
        filterPlatforms={filters.platforms}
        onCategoriesChange={setCategories}
        onGenresChange={setGenres}
        onPlatformsChange={setPlatforms}
        availableGenres={availableFilters.genres}
        availablePlatforms={availableFilters.platforms}
        toggleFilter={toggleFilter}
        onClearAll={clearAllFilters}
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

      {/* Loading/Results */}
      {paginationState.loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : (
        <>
          <MediaTable
            columns={columns}
            items={items}
            sortConfig={sortConfig}
            onSort={handleSort}
            emptyMessage="No results found. Try adjusting your search or filters."
          />

          <MediaPagination
            paginationState={paginationState}
            onNextPage={handleNextPage}
            onPrevPage={handlePrevPage}
          />
        </>
      )}
    </div>
  );
};