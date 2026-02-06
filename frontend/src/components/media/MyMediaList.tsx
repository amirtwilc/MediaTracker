import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, X } from 'lucide-react';
import type { UserMediaListItem } from '../../types';
import { api } from '../../api';
import { ConfirmModal } from '../common/ConfirmModal';
import { StarRating } from '../common/StarRating';
import { getCategoryColor } from '../../utils/categoryColors';
import { MediaSearch } from './shared/MediaSearch';
import { MediaFilters } from './shared/MediaFilters';
import { MediaPagination } from './shared/MediaPagination';
import { MediaTable, MediaTableColumn } from './shared/MediaTable';
import { useMediaPagination } from '../../hooks/useMediaPagination';
import { useFilters } from '../../hooks/useFilters';
import { useDebounce } from '../../hooks/useDebounce';
import { useSort } from '../../hooks/useSort';
import { useAlert } from '../../hooks/useAlert';
import { AlertContainer } from '../common/Alert';
import type { Cursor, PaginationMode, SortConfig, MediaFilters as MediaFiltersType } from '../../types/media.types';

export const MyMediaList: React.FC = () => {
  const {
    filters,
    availableFilters,
    setSearchQuery,
    setCategories,
    setGenres,
    setPlatforms,
    setWishToExperience,
    setAvailableGenres,
    setAvailablePlatforms,
    toggleFilter,
    clearAllFilters,
    hasActiveFilters,
  } = useFilters({ includeWishToExperience: true });

  const debouncedSearchQuery = useDebounce(filters.searchQuery, 500);

  const { sortConfig, paginationMode, handleSort } = useSort();

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
      // Map frontend sort keys to backend enum
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
        searchQuery: debouncedSearchQuery || undefined,
        categories,
        genreIds,
        platformIds,
        wishToExperience: currentFilters.wishToExperience || undefined,
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
        searchQuery: debouncedSearchQuery || undefined,
        categories,
        genreIds,
        platformIds,
        wishToExperience: currentFilters.wishToExperience || undefined,
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
      genres: filters.genres,
      platforms: filters.platforms,
      wishToExperience: filters.wishToExperience,
    },
    sortConfig,
    paginationMode,
  });

  // UI state
  const { alert, showSuccess, handleApiError } = useAlert();
  const [showFilters, setShowFilters] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<Partial<UserMediaListItem>>({});
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number | null }>({
    show: false,
    id: null,
  });

  const isInitialMount = useRef(true);

  const loadAvailableFilters = async () => {
    try {
      const categories = filters.categories.length > 0 ? filters.categories : undefined;

      const [genresData, platformsData] = await Promise.all([
        api.filters.getMyListGenres({
          searchQuery: debouncedSearchQuery || undefined,
          categories,
        }),
        api.filters.getMyListPlatforms({
          searchQuery: debouncedSearchQuery || undefined,
          categories,
        }),
      ]);

      setAvailableGenres(genresData);
      setAvailablePlatforms(platformsData);
    } catch (error) {
      handleApiError(error, 'Failed to load available filters');
    }
  };

  // Initial load
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadPage(0);
      loadAvailableFilters();
    }
  }, []);

  // Reload when filters change
  useEffect(() => {
    if (!isInitialMount.current) {
      resetPagination();
      loadAvailableFilters();
    }
  }, [debouncedSearchQuery, filters.categories, filters.genres, filters.platforms, filters.wishToExperience]);

  // Reload when sort changes
  useEffect(() => {
    if (!isInitialMount.current && sortConfig !== null) {
      resetPagination();
    }
  }, [sortConfig]);

  const handleStartEdit = (item: UserMediaListItem) => {
    setEditingId(item.id);
    setEditState({
      experienced: item.experienced,
      wishToReexperience: item.wishToReexperience,
      rating: item.rating,
      comment: item.comment || '',
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditState({});
  };

  const handleSaveEdit = async (id: number) => {
    try {
      await api.userMedia.updateMyListItem(id, editState);
      setEditingId(null);
      setEditState({});
      
      // Reload current page
      await loadPage(paginationState.currentPage, true);
      await loadAvailableFilters();
    } catch (error) {
      handleApiError(error, 'Failed to update item');
    }
  };

  const handleRemove = (id: number) => {
    setDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await api.userMedia.removeFromMyList(deleteConfirm.id);
        
        // Reload current page
        await loadPage(paginationState.currentPage, true);
        await loadAvailableFilters();
        showSuccess('Item removed from your list');
      } catch (error) {
        handleApiError(error, 'Failed to remove item');
      }
    }
    setDeleteConfirm({ show: false, id: null });
  };

  // Table columns configuration
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
      render: (item) => {
        const isEditing = editingId === item.id;
        const currentExperienced = isEditing ? editState.experienced : item.experienced;

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
          <span>{item.experienced ? '✓' : '-'}</span>
        );
      },
    },
    {
      key: 'reexperience',
      label: 'Re-experience',
      sortable: true,
      align: 'center',
      render: (item) => {
        const isEditing = editingId === item.id;
        const currentExperienced = isEditing ? editState.experienced : item.experienced;

        return isEditing && currentExperienced ? (
          <input
            type="checkbox"
            checked={editState.wishToReexperience || false}
            onChange={(e) => setEditState({
              ...editState,
              wishToReexperience: e.target.checked
            })}
            className="w-4 h-4"
          />
        ) : (
          <span>{item.wishToReexperience ? '✓' : '-'}</span>
        );
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (item) => {
        const isEditing = editingId === item.id;
        const currentExperienced = isEditing ? editState.experienced : item.experienced;

        return isEditing && currentExperienced ? (
          <div className="flex items-center w-[220px]">
            <StarRating
              rating={editState.rating}
              onChange={(rating) => setEditState({ ...editState, rating })}
            />
          </div>
        ) : (
          <div className="flex items-center w-[220px]">
            <StarRating rating={item.rating} readonly />
          </div>
        );
      },
    },
    {
      key: 'comment',
      label: 'Comment',
      render: (item) => {
        const isEditing = editingId === item.id;

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
          <span className="text-sm text-gray-300">{item.comment || '-'}</span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      align: 'right',
      render: (item) => {
        const isEditing = editingId === item.id;

        return (
          <div className="flex gap-2 justify-end">
            {isEditing ? (
              <>
                <button
                  onClick={() => handleSaveEdit(item.id)}
                  className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                  title="Save changes"
                >
                  Save
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Cancel"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <button
                onClick={() => handleStartEdit(item)}
                className="p-1 hover:bg-gray-700 rounded text-blue-400"
                title="Edit"
              >
                <Edit2 size={16} />
              </button>
            )}
            <button
              onClick={() => handleRemove(item.id)}
              className="p-1 hover:bg-gray-700 rounded text-red-400"
              title="Delete"
            >
              <Trash2 size={16} />
            </button>
          </div>
        );
      },
    },
  ];

  if (paginationState.loading && items.length === 0) {
    return <div className="text-center py-8 text-gray-400">Loading your list...</div>;
  }

  return (
    <div className="space-y-4">
      <AlertContainer alert={alert} />

      <MediaSearch
        value={filters.searchQuery}
        onChange={setSearchQuery}
        placeholder="Search in your list by name..."
      />

      <MediaFilters
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        hasActiveFilters={hasActiveFilters}
        filterCategories={filters.categories}
        filterGenres={filters.genres}
        filterPlatforms={filters.platforms}
        wishToExperience={filters.wishToExperience}
        onCategoriesChange={setCategories}
        onGenresChange={setGenres}
        onPlatformsChange={setPlatforms}
        onWishToExperienceChange={setWishToExperience}
        availableGenres={availableFilters.genres}
        availablePlatforms={availableFilters.platforms}
        toggleFilter={toggleFilter}
        onClearAll={clearAllFilters}
        showWishToExperience={true}
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

      <MediaTable
        columns={columns}
        items={items}
        sortConfig={sortConfig}
        onSort={handleSort}
        emptyMessage={
          paginationState.totalCount === 0
            ? 'No items in your list. Search and add some media!'
            : 'No items match your filters.'
        }
      />

      <MediaPagination
        paginationState={paginationState}
        onNextPage={handleNextPage}
        onPrevPage={handlePrevPage}
      />

      <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Remove Item"
        message="Are you sure you want to remove this item from your list?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ show: false, id: null })}
      />
    </div>
  );
};