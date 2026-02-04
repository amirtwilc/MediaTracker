import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react';
import type { MediaItem, Genre, Platform } from '../../types';
import { api } from '../../api';
import { getCategoryColor } from '../../utils/categoryColors';
import { ConfirmModal } from '../common/ConfirmModal';
import { useAlert } from '../../hooks/useAlert';
import { AlertContainer } from '../common/Alert';

const ITEMS_PER_PAGE = 20;
const SUCCESS_MESSAGE_DURATION_MS = 3000;
const CURRENT_YEAR = new Date().getFullYear();
const MIN_YEAR = 1800;
const MAX_YEAR = CURRENT_YEAR + 10;

interface UpdateMediaItemProps {
  genres?: Genre[];
  platforms?: Platform[];
}

interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  cursors: Array<{ name: string; id: number } | null>;
}

export const UpdateMediaItem: React.FC<UpdateMediaItemProps> = ({
  genres: propsGenres,
  platforms: propsPlatforms,
}) => {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>(null);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    currentPage: 0,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    cursors: [null],
  });

  // Edit state
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [year, setYear] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reference data
  const [genres, setGenres] = useState<Genre[]>(propsGenres || []);
  const [platforms, setPlatforms] = useState<Platform[]>(propsPlatforms || []);
  const [isLoadingReferenceData, setIsLoadingReferenceData] = useState(false);

  // UI state
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { alert, showSuccess, showError, handleApiError } = useAlert();

  const loadGenresAndPlatforms = useCallback(async () => {
    // If we already have data from props, don't reload
    if ((propsGenres && propsGenres.length > 0) && (propsPlatforms && propsPlatforms.length > 0)) {
      setGenres(propsGenres);
      setPlatforms(propsPlatforms);
      return;
    }

    setIsLoadingReferenceData(true);
    try {
      const [genresData, platformsData] = await Promise.all([
        api.admin.getAllGenres(),
        api.admin.getAllPlatforms(),
      ]);
      setGenres(genresData);
      setPlatforms(platformsData);
    } catch (error) {
      handleApiError(error, 'Failed to load genres and platforms');
    } finally {
      setIsLoadingReferenceData(false);
    }
  }, [propsGenres, propsPlatforms]);

  //Update genres/platforms when props change
  useEffect(() => {
    if (propsGenres && propsGenres.length > 0) {
      setGenres(propsGenres);
    }
    if (propsPlatforms && propsPlatforms.length > 0) {
      setPlatforms(propsPlatforms);
    }
  }, [propsGenres, propsPlatforms]);

  const loadPage = useCallback(async (
    pageNum: number,
    cursor: { name: string; id: number } | null
  ) => {
    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await api.media.searchMediaItemsCursor({
        query: searchQuery || '',
        cursorName: cursor?.name,
        cursorId: cursor?.id,
        limit: ITEMS_PER_PAGE,
      });

      setSearchResults(response.items);

      const newTotalPages = Math.ceil(response.totalCount / ITEMS_PER_PAGE);

      setPagination(prev => {
        const newCursors = [...prev.cursors];
        
        // Store next cursor if available
        if (response.hasMore && response.nextCursor && pageNum + 1 >= newCursors.length) {
          newCursors.push(response.nextCursor);
        }

        return {
          currentPage: pageNum,
          totalPages: newTotalPages,
          totalCount: response.totalCount,
          hasNextPage: response.hasMore,
          hasPrevPage: pageNum > 0,
          cursors: newCursors,
        };
      });
    } catch (error) {
      handleApiError(error, 'Search failed');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSearch = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setPagination({
      currentPage: 0,
      totalPages: 0,
      totalCount: 0,
      hasNextPage: false,
      hasPrevPage: false,
      cursors: [null],
    });

    loadPage(0, null);
  }, [loadPage]);

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
  };

  const handleNextPage = useCallback(() => {
    if (pagination.hasNextPage && pagination.currentPage + 1 < pagination.cursors.length) {
      loadPage(pagination.currentPage + 1, pagination.cursors[pagination.currentPage + 1]);
    }
  }, [pagination, loadPage]);

  const handlePrevPage = useCallback(() => {
    if (pagination.currentPage > 0) {
      loadPage(pagination.currentPage - 1, pagination.cursors[pagination.currentPage - 1]);
    }
  }, [pagination, loadPage]);

  const handleChooseItem = useCallback(async (item: MediaItem) => {
    setSelectedItem(item);
    setYear(item.year?.toString() || '');
    setSelectedGenres(item.genres.map(g => g.id));
    setSelectedPlatforms(item.platforms.map(p => p.id));
    
    if (genres.length === 0 || platforms.length === 0) {
      await loadGenresAndPlatforms();
    }
  }, [genres.length, platforms.length, loadGenresAndPlatforms]);

  const validateUpdateForm = (): string | null => {
    if (selectedGenres.length === 0) {
      return 'Please select at least one genre';
    }

    if (selectedPlatforms.length === 0) {
      return 'Please select at least one platform';
    }

    if (year && (parseInt(year) < MIN_YEAR || parseInt(year) > MAX_YEAR)) {
      return `Year must be between ${MIN_YEAR} and ${MAX_YEAR}`;
    }

    return null;
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;

    // Validate form
    const validationError = validateUpdateForm();
    if (validationError) {
      showError(validationError);
      return;
    }

    setIsUpdating(true);

    try {
      await api.admin.updateMediaItem(selectedItem.id, {
        category: selectedItem.category,
        name: selectedItem.name,
        year: year ? parseInt(year) : undefined,
        genreIds: selectedGenres,
        platformIds: selectedPlatforms,
      });

      showSuccess('Item updated successfully!');
      setSelectedItem(null);
      
      // Reload current page to show updated data
      loadPage(pagination.currentPage, pagination.cursors[pagination.currentPage]);
    } catch (error) {
      handleApiError(error, 'Failed to update item');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    setIsDeleting(true);

    try {
      await api.admin.deleteMediaItem(selectedItem.id);
      showSuccess('Item deleted successfully!');
      setSelectedItem(null);
      setDeleteConfirm(false);
      
      // Reset to first page after deletion
      setPagination({
        currentPage: 0,
        totalPages: 0,
        totalCount: 0,
        hasNextPage: false,
        hasPrevPage: false,
        cursors: [null],
      });
      loadPage(0, null);
    } catch (error) {
      handleApiError(error, 'Failed to delete item');
      setDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = useCallback(() => {
    setSelectedItem(null);
    setYear('');
    setSelectedGenres([]);
    setSelectedPlatforms([]);
  }, []);

  const toggleGenre = (genreId: number) => {
    setSelectedGenres(prev =>
      prev.includes(genreId)
        ? prev.filter(id => id !== genreId)
        : [...prev, genreId]
    );
  };

  const togglePlatform = (platformId: number) => {
    setSelectedPlatforms(prev =>
      prev.includes(platformId)
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Edit view
  if (selectedItem) {
    return (
      <div className="space-y-4">
        <AlertContainer alert={alert} />

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Update Media Item</h3>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Back to Search
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded border border-gray-700 space-y-4">
          {isLoadingReferenceData ? (
            <div className="text-center py-8 text-gray-400">
              Loading genres and platforms...
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm text-gray-300 mb-2">Category</label>
                <div className={`px-3 py-2 rounded ${getCategoryColor(selectedItem.category)} text-white inline-block`}>
                  {selectedItem.category}
                </div>
              </div>

              <div>
                <label htmlFor="item-name" className="block text-sm text-gray-300 mb-2">
                  Name (Cannot be changed)
                </label>
                <input
                  id="item-name"
                  type="text"
                  value={selectedItem.name}
                  disabled
                  className="w-full px-3 py-2 bg-gray-600 text-gray-400 rounded border border-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="item-year" className="block text-sm text-gray-300 mb-2">
                  Year
                </label>
                <input
                  id="item-year"
                  type="number"
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  placeholder={`e.g., ${CURRENT_YEAR}`}
                  min={MIN_YEAR}
                  max={MAX_YEAR}
                  className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Genres ({selectedGenres.length} selected)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded border border-gray-600">
                  {genres.map((genre) => (
                    <label
                      key={genre.id}
                      className="flex items-center gap-2 text-white cursor-pointer hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedGenres.includes(genre.id)}
                        onChange={() => toggleGenre(genre.id)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">{genre.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Platforms ({selectedPlatforms.length} selected)
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded border border-gray-600">
                  {platforms.map((platform) => (
                    <label
                      key={platform.id}
                      className="flex items-center gap-2 text-white cursor-pointer hover:bg-gray-600 px-2 py-1 rounded transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlatforms.includes(platform.id)}
                        onChange={() => togglePlatform(platform.id)}
                        className="cursor-pointer"
                      />
                      <span className="text-sm">{platform.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-between pt-4">
                <button
                  onClick={() => setDeleteConfirm(true)}
                  disabled={isDeleting || isUpdating}
                  className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 size={18} />
                  {isDeleting ? 'Deleting...' : 'Delete Item'}
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={isUpdating || isDeleting || isLoadingReferenceData}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isUpdating ? 'Updating...' : 'Update Item'}
                </button>
              </div>
            </>
          )}
        </div>

        <ConfirmModal
          isOpen={deleteConfirm}
          title="Delete Media Item"
          message={`Are you sure you want to delete "${selectedItem.name}"? This action cannot be undone and will remove this item from all user lists.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(false)}
        />
      </div>
    );
  }

  // Search view
  return (
    <div className="space-y-4">
      <AlertContainer alert={alert} />

      <h3 className="text-xl font-bold text-white">Update Media Item</h3>

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchInputChange(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !isSearching && handleSearch()}
          placeholder="Search for items to update..."
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
          aria-label="Search media items"
        />
        <button
          onClick={handleSearch}
          disabled={isSearching}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          aria-label="Search"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Search Results */}
      {hasSearched && (
        <div className="overflow-x-auto">
          {isSearching ? (
            <div className="text-center py-8 text-gray-400">
              Searching...
            </div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-2">No results found</p>
              <p className="text-sm text-gray-500">
                Try searching for a different term
              </p>
            </div>
          ) : (
            <>
              <table className="w-full" role="table">
                <thead className="bg-gray-700 text-gray-300 text-sm">
                  <tr>
                    <th className="px-4 py-3 text-left" scope="col">Category</th>
                    <th className="px-4 py-3 text-left" scope="col">Name</th>
                    <th className="px-4 py-3 text-left" scope="col">Year</th>
                    <th className="px-4 py-3 text-left" scope="col">Genres</th>
                    <th className="px-4 py-3 text-left" scope="col">Platforms</th>
                    <th className="px-4 py-3 text-right" scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {searchResults.map((item) => (
                    <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.category)} text-white`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-gray-300">{item.year || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {item.genres.length > 0 ? item.genres.map(g => g.name).join(', ') : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {item.platforms.length > 0 ? item.platforms.map(p => p.name).join(', ') : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleChooseItem(item)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                          aria-label={`Edit ${item.name}`}
                        >
                          Choose
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4" role="navigation" aria-label="Pagination">
                  <button
                    onClick={handlePrevPage}
                    disabled={!pagination.hasPrevPage || isSearching}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={20} />
                    Previous
                  </button>
                  <span className="text-gray-300" aria-live="polite">
                    Page {pagination.currentPage + 1} of {pagination.totalPages}
                    {pagination.totalCount > 0 && (
                      <span className="text-xs text-gray-400 ml-2">
                        ({pagination.totalCount} items)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={!pagination.hasNextPage || isSearching}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight size={20} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Initial State Message */}
      {!hasSearched && (
        <div className="text-center py-12 text-gray-400">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg mb-2">Search for media items to update</p>
          <p className="text-sm text-gray-500">
            Enter a search term and click the search button to find items
          </p>
        </div>
      )}
    </div>
  );
};