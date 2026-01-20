import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Plus, Check, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MediaItem, UserMediaListItem, Genre, Platform } from '../../types';
import { api } from '../../services/api';
import { StarRating } from '../common/StarRating';
import { getCategoryColor } from '../../utils/categoryColors';

interface CachedPage {
  items: MediaItem[];
  cursor: { name: string; id: number } | null;
  hasMore: boolean;
  totalCount: number;
}

interface PageCache {
  [key: string]: CachedPage;
}

export const SearchMedia: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [paginationMode, setPaginationMode] = useState<'cursor' | 'offset'>('cursor');

  // Error notification
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);

  // Available genres and platforms (filtered by search query and categories only)
  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);

  // Sorting - single sort only
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Added items tracking
  const [editingAddedId, setEditingAddedId] = useState<number | null>(null);
  const [editState, setEditState] = useState<Partial<UserMediaListItem>>({});

  // Cursor-based pagination state
  const [cursors, setCursors] = useState<Array<{ name: string; id: number } | null>>([null]);
  const [pageCache, setPageCache] = useState<PageCache>({});
  const [prefetchInProgress, setPrefetchInProgress] = useState<Set<number>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);
  const isInitialMount = useRef(true);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 500);
    return () => clearTimeout(timer);
  }, [query]);

  // Initial load
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      loadAvailableFilters();
      handleSearch();
    }
  }, []);

  // Reload when filters/search change
  useEffect(() => {
    if (!isInitialMount.current) {
      handleSearch();
    }
  }, [debouncedQuery, filterCategories, filterGenres, filterPlatforms]);

  // Reload available filters when query or categories change (but NOT when genres/platforms change)
  useEffect(() => {
    if (!isInitialMount.current) {
      loadAvailableFilters();
    }
  }, [debouncedQuery, filterCategories]);

  // Trigger search when sort changes
  useEffect(() => {
    if (!isInitialMount.current && sortConfig !== null) {
      handleSearch();
    }
  }, [sortConfig]);

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Prefetch adjacent pages when current page changes
  useEffect(() => {
    if (results.length > 0) {
      if (hasNextPage && currentPage + 1 < cursors.length) {
        prefetchPage(currentPage + 1);
      }
      if (currentPage > 0) {
        prefetchPage(currentPage - 1);
      }
    }
  }, [currentPage]);

  const loadAvailableFilters = async () => {
    try {
      const categories = filterCategories.length > 0 ? filterCategories : undefined;

      const [genresData, platformsData] = await Promise.all([
        api.getAvailableMediaGenresGraphQL({
          query: debouncedQuery || undefined,
          categories
        }),
        api.getAvailableMediaPlatformsGraphQL({
          query: debouncedQuery || undefined,
          categories
        }),
      ]);

      setAvailableGenres(genresData);
      setAvailablePlatforms(platformsData);
    } catch (error) {
      console.error('Failed to load available filters', error);
    }
  };

  const getCacheKey = (page: number): string => {
    const filters = {
      query: debouncedQuery,
      categories: filterCategories.sort(),
      genres: filterGenres.sort(),
      platforms: filterPlatforms.sort(),
      sort: sortConfig,
    };
    return `${page}-${JSON.stringify(filters)}`;
  };

  const fetchPage = async (
    pageNum: number,
    cursor: { name: string; id: number } | null,
    signal?: AbortSignal
  ): Promise<CachedPage> => {
    const genreIds = filterGenres.length > 0
      ? availableGenres.filter(g => filterGenres.includes(g.name)).map(g => g.id)
      : undefined;

    const platformIds = filterPlatforms.length > 0
      ? availablePlatforms.filter(p => filterPlatforms.includes(p.name)).map(p => p.id)
      : undefined;

    const categories = filterCategories.length > 0 ? filterCategories : undefined;

    if (paginationMode === 'offset' && sortConfig) {
  // Map frontend sort keys to backend enum
  const sortByMap: { [key: string]: string } = {
    'name': 'NAME',
    'year': 'YEAR',
    'avgRating': 'AVG_RATING',
  };

  const backendSortBy = sortByMap[sortConfig.key] || 'NAME';

  // Use GraphQL sorted endpoint with offset pagination
  const response = await api.searchMediaItemsSortedGraphQL({
    query: debouncedQuery || '',
    categories,
    genreIds,
    platformIds,
    page: pageNum,
    size: 20,
    sortBy: backendSortBy,
    sortDirection: sortConfig.direction.toUpperCase(),
  });

  return {
    items: response.content,
    cursor: null,
    hasMore: pageNum < response.totalPages - 1,
    totalCount: response.totalElements,
  };
} else {
      // Use GraphQL cursor endpoint (unsorted, default by name)
      const response = await api.searchMediaItemsGraphQL({
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
      setResults(cached.items);
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

      setResults(result.items);
      setHasNextPage(result.hasMore);
      setHasPrevPage(pageNum > 0);
      setCurrentPage(pageNum);
      setTotalCount(result.totalCount);
      setTotalPages(Math.ceil(result.totalCount / 20));
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search failed', error);
        setResults([]);
        setHasNextPage(false);
        setHasPrevPage(false);
        setTotalCount(0);
        setTotalPages(0);
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleSearch = async () => {
    setCurrentPage(0);
    if (paginationMode === 'cursor') {
      setCursors([null]);
    }
    setPageCache({});

    await loadPage(0);
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

  const handleClearSearch = () => {
    setQuery('');
    setFilterCategories([]);
    setFilterGenres([]);
    setFilterPlatforms([]);
    setSortConfig(null);
    setPaginationMode('cursor');
    setCurrentPage(0);
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

  const handleAdd = async (mediaItemId: number) => {
    try {
      const result = await api.addToMyListGraphQL(mediaItemId);
      setEditingAddedId(mediaItemId);
      setEditState({
        id: result.id, // Store the list item ID
        experienced: false,
        wishToReexperience: false,
        rating: undefined,
        comment: '',
      });

      // Update the item in current results to show as added
      setResults(prev => prev.map(item =>
        item.id === mediaItemId ? { ...item, inUserList: true } : item
      ));

      // Clear cache to force refresh on next page change
      setPageCache({});

      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to add item');
    }
  };

  const handleSaveUpdate = async (mediaItemId: number) => {
    try {
      // Use the stored list item ID from editState
      if (editState.id) {
        await api.updateMyListItemGraphQL(editState.id, editState);
        setEditingAddedId(null);
        setEditState({});
      }
    } catch (error) {
      console.error('Failed to update item', error);
    }
  };

  const hasActiveFilters = filterCategories.length > 0 || filterGenres.length > 0 || filterPlatforms.length > 0;
  const hasActiveSearch = query.trim().length > 0;

  return (
    <div className="space-y-4">
      {/* Error Notification */}
      {errorMessage && (
        <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded flex justify-between items-center">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage('')}
            className="text-red-200 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for movies, series, or games..."
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        {(hasActiveSearch || hasActiveFilters || sortConfig) && (
          <button
            onClick={handleClearSearch}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2"
            title="Clear all"
          >
            <X size={20} />
            Clear All
          </button>
        )}
      </div>

      {/* Filter Toggle Button */}
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

      {/* Collapsible Filters */}
      {showFilters && (
        <div className="bg-gray-800 p-4 rounded border border-gray-700 space-y-4">
          <h3 className="text-white font-medium">Filters:</h3>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Categories (OR - show if ANY match):</label>
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

          {availableGenres.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Genres (AND - show if ALL match) - {availableGenres.length} available:
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableGenres.map(genre => (
                  <button
                    key={genre.id}
                    onClick={() => toggleFilter(filterGenres, setFilterGenres, genre.name)}
                    className={`px-3 py-1 rounded text-sm ${filterGenres.includes(genre.name)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    {genre.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {availablePlatforms.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Platforms (AND - show if ALL match) - {availablePlatforms.length} available:
              </label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availablePlatforms.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => toggleFilter(filterPlatforms, setFilterPlatforms, platform.name)}
                    className={`px-3 py-1 rounded text-sm ${filterPlatforms.includes(platform.name)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    {platform.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterCategories([]);
                setFilterGenres([]);
                setFilterPlatforms([]);
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Active Sort Display */}
      {sortConfig && (
        <div className="bg-gray-800 p-3 rounded border border-gray-700">
          <span className="text-sm text-gray-300">Active sort: </span>
          <span className="text-sm text-blue-400 ml-2">
            {sortConfig.key} {sortConfig.direction === 'asc' ? '↑' : '↓'}
          </span>
          <button
            onClick={() => {
              setSortConfig(null);
              setPaginationMode('cursor');
            }}
            className="ml-4 text-sm text-red-400 hover:text-red-300"
          >
            Clear sort
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No results found. Try adjusting your search or filters.
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
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('avgRating')}
                  >
                    Avg Rating {getSortIcon('avgRating')}
                  </th>
                  <th className="px-4 py-3 text-left">Genre</th>
                  <th className="px-4 py-3 text-left">Platform</th>
                  <th className="px-4 py-3 text-center">Experienced</th>
                  <th className="px-4 py-3 text-center">Re-experience</th>
                  <th className="px-4 py-3 text-left">Rating</th>
                  <th className="px-4 py-3 text-left">Comment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {results.map((item) => {
                  const isEditing = editingAddedId === item.id;
                  const currentExperienced = isEditing ? editState.experienced : false;
                  const isInList = item.inUserList || false;

                  return (
                    <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.category)} text-white`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-gray-300">{item.year || '-'}</td>
                      <td className="px-4 py-3 text-gray-300">
                        {item.avgRating ? (
                          <span className="text-yellow-400 font-medium">
                            {item.avgRating.toFixed(1)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-200 text-sm">
                        {item.genres.map(g => g.name).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-gray-200 text-sm">
                        {item.platforms.map(p => p.name).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
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
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {isEditing && currentExperienced ? (
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
                          <span>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing && currentExperienced ? (
                          <StarRating
                            rating={editState.rating}
                            onChange={(rating) => setEditState({
                              ...editState,
                              rating
                            })}
                          />
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            maxLength={100}
                            value={editState.comment || ''}
                            onChange={(e) => setEditState({
                              ...editState,
                              comment: e.target.value
                            })}
                            placeholder="Add comment..."
                            className="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm"
                          />
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleSaveUpdate(item.id)}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs"
                            >
                              Update
                            </button>
                          </div>
                        ) : isInList ? (
                          <div className="flex items-center justify-end gap-2 text-green-400">
                            <Check size={16} />
                            <span className="text-xs">Added</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleAdd(item.id)}
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium flex items-center gap-2"
                          >
                            <Plus size={16} />
                            Add
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
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
    </div>
  );

};