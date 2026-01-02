import React, { useState, useEffect, useRef } from 'react';
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
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Error notification
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);

  // All available genres and platforms
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [allPlatforms, setAllPlatforms] = useState<string[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  // Sorting
  const [sortConfig, setSortConfig] = useState<Array<{key: string; direction: 'asc' | 'desc'}>>([]);

  // Added items tracking
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const [editingAddedId, setEditingAddedId] = useState<number | null>(null);
  const [editState, setEditState] = useState<Partial<UserMediaListItem>>({});
  const [userListItemIds, setUserListItemIds] = useState<Map<number, number>>(new Map());

  // Cursor-based pagination state
  const [cursors, setCursors] = useState<Array<{ name: string; id: number } | null>>([null]); // cursors[i] = cursor to get page i
  const [pageCache, setPageCache] = useState<PageCache>({});
  const [prefetchInProgress, setPrefetchInProgress] = useState<Set<number>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadGenresAndPlatforms();
    loadUserList();
    // Load all items on mount, sorted by year (newest first)
    setSortConfig([{ key: 'year', direction: 'desc' }]);
    handleInitialLoad();
  }, []);

  useEffect(() => {
    // Reset pagination when filters change
    if (hasSearched) {
      handleSearch();
    }
  }, [filterCategories, filterGenres, filterPlatforms, sortConfig]);

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
    if (hasSearched && results.length > 0) {
      // Prefetch next page if it exists
      if (hasNextPage && currentPage + 1 < cursors.length) {
        prefetchPage(currentPage + 1);
      }
      // Prefetch previous page if it exists
      if (currentPage > 0) {
        prefetchPage(currentPage - 1);
      }
    }
  }, [currentPage, hasSearched]);

  const loadUserList = async () => {
    try {
      const list = await api.getMyMediaList(0, 1000);
      const itemMap = new Map(list.map(item => [item.mediaItem.id, item.id]));
      setUserListItemIds(itemMap);
    } catch (error) {
      console.error('Failed to load user list', error);
    }
  };

  const loadGenresAndPlatforms = async () => {
    try {
      const [genresData, platformsData] = await Promise.all([
        api.getAllGenres(),
        api.getAllPlatforms(),
      ]);
      setGenres(genresData);
      setPlatforms(platformsData);
      setAllGenres(genresData.map(g => g.name).sort());
      setAllPlatforms(platformsData.map(p => p.name).sort());
    } catch (error) {
      console.error('Failed to load genres/platforms', error);
    }
  };

  const getCacheKey = (page: number): string => {
    const filters = {
      query,
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
      ? genres.filter(g => filterGenres.includes(g.name)).map(g => g.id)
      : undefined;

    const platformIds = filterPlatforms.length > 0
      ? platforms.filter(p => filterPlatforms.includes(p.name)).map(p => p.id)
      : undefined;

    // Only pass single category to backend, handle multiple categories client-side
    const category = filterCategories.length === 1 ? filterCategories[0] : undefined;

    const response = await api.searchMediaItemsCursor({
      query: query || '',
      category,
      genreIds,
      platformIds,
      cursorName: cursor?.name,
      cursorId: cursor?.id,
      limit: 20,
    });

    // Filter by categories client-side if multiple are selected
    let filteredItems = response.items;
    if (filterCategories.length > 1) {
      filteredItems = response.items.filter(item => 
        filterCategories.includes(item.category)
      );
    }

    // Apply client-side sorting if needed
    let sortedItems = filteredItems;
    if (sortConfig.length > 0) {
      sortedItems = applySorting([...filteredItems]);
    }

    return {
      items: sortedItems,
      cursor: response.nextCursor || null,
      hasMore: response.hasMore,
      totalCount: response.totalCount,
    };
  };

  const prefetchPage = async (pageNum: number) => {
    const cacheKey = getCacheKey(pageNum);
    
    // Don't prefetch if already cached or in progress
    if (pageCache[cacheKey] || prefetchInProgress.has(pageNum)) {
      return;
    }

    // Don't prefetch if we don't have the cursor
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

      // Update cursors array if we got a next cursor
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

    // Check cache first
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

    // Abort any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);

    try {
      const cursor = cursors[pageNum];
      const result = await fetchPage(pageNum, cursor, abortControllerRef.current.signal);

      // Cache the result
      setPageCache(prev => ({
        ...prev,
        [cacheKey]: result,
      }));

      // Update cursors array
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
    // Reset pagination state
    setCurrentPage(0);
    setCursors([null]);
    setPageCache({});
    setHasSearched(true);
    
    await loadPage(0);
  };

  const handleInitialLoad = async () => {
    setHasSearched(true);
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
    setSortConfig([]);
    setHasSearched(false);
    setResults([]);
    setCurrentPage(0);
    setCursors([null]);
    setPageCache({});
  };

  const applySorting = (items: MediaItem[]) => {
    if (sortConfig.length === 0) return items;

    return [...items].sort((a, b) => {
      for (const sort of sortConfig) {
        let comparison = 0;

        switch (sort.key) {
          case 'name':
            comparison = a.name.localeCompare(b.name);
            break;
          case 'year':
            comparison = (a.year || 0) - (b.year || 0);
            break;
          case 'category':
            comparison = a.category.localeCompare(b.category);
            break;
          case 'avgRating':
            comparison = (a.avgRating || 0) - (b.avgRating || 0);
            break;
        }

        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }

      return 0;
    });
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => {
      const existing = prev.find(s => s.key === key);
      if (existing) {
        if (existing.direction === 'asc') {
          return prev.map(s => s.key === key ? { ...s, direction: 'desc' as 'desc' } : s);
        } else {
          return prev.filter(s => s.key !== key);
        }
      } else {
        return [...prev, { key, direction: 'asc' as 'asc' }];
      }
    });
  };

  const getSortIcon = (key: string) => {
    const sort = sortConfig.find(s => s.key === key);
    if (!sort) return null;
    
    const index = sortConfig.findIndex(s => s.key === key);
    return (
      <span className="ml-1 text-blue-400 text-xs">
        {sort.direction === 'asc' ? '↑' : '↓'}
        {sortConfig.length > 1 && <sup>{index + 1}</sup>}
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
      const result = await api.addToMyList(mediaItemId);
      setAddedItems(new Set(addedItems).add(mediaItemId));
      setEditingAddedId(mediaItemId);
      setUserListItemIds(new Map(userListItemIds).set(mediaItemId, result.id));
      setEditState({
        experienced: false,
        wishToReexperience: false,
        rating: undefined,
        comment: '',
      });
      setErrorMessage('');
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to add item');
    }
  };

  const handleSaveUpdate = async (mediaItemId: number) => {
    const listItemId = userListItemIds.get(mediaItemId);
    if (!listItemId) return;

    try {
      await api.updateMyListItem(listItemId, editState);
      setEditingAddedId(null);
      setEditState({});
    } catch (error) {
      console.error('Failed to update item', error);
    }
  };

  const hasActiveFilters = filterCategories.length > 0 || filterGenres.length > 0 || filterPlatforms.length > 0;

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
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for movies, series, or games..."
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
        >
          <Search size={20} />
        </button>
        {(hasSearched || query) && (
          <button
            onClick={handleClearSearch}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2"
            title="Clear search"
          >
            <X size={20} />
            Clear
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
            <label className="block text-sm text-gray-300 mb-2">Categories:</label>
            <div className="flex flex-wrap gap-2">
              {['MOVIE', 'SERIES', 'GAME'].map(cat => (
                <button
                  key={cat}
                  onClick={() => toggleFilter(filterCategories, setFilterCategories, cat)}
                  className={`px-3 py-1 rounded text-sm ${
                    filterCategories.includes(cat)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {allGenres.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Genres:</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {allGenres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleFilter(filterGenres, setFilterGenres, genre)}
                    className={`px-3 py-1 rounded text-sm ${
                      filterGenres.includes(genre)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allPlatforms.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Platforms:</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {allPlatforms.map(platform => (
                  <button
                    key={platform}
                    onClick={() => toggleFilter(filterPlatforms, setFilterPlatforms, platform)}
                    className={`px-3 py-1 rounded text-sm ${
                      filterPlatforms.includes(platform)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {platform}
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

      {/* Active Sorts Display */}
      {sortConfig.length > 0 && (
        <div className="bg-gray-800 p-3 rounded border border-gray-700">
          <span className="text-sm text-gray-300">Active sorts: </span>
          {sortConfig.map((sort, idx) => (
            <span key={sort.key} className="text-sm text-blue-400 ml-2">
              {sort.key} {sort.direction === 'asc' ? '↑' : '↓'}
              {idx < sortConfig.length - 1 && ' → '}
            </span>
          ))}
          <button
            onClick={() => setSortConfig([])}
            className="ml-4 text-sm text-red-400 hover:text-red-300"
          >
            Clear sorts
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : results.length === 0 && hasSearched ? (
        <div className="text-center py-8 text-gray-400">
          No results found. Try a different search term.
        </div>
      ) : results.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700 text-gray-300 text-sm">
                <tr>
                  <th 
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('category')}
                  >
                    Category {getSortIcon('category')}
                  </th>
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
                  const isAdded = addedItems.has(item.id);
                  const isEditing = editingAddedId === item.id;
                  const currentExperienced = isEditing ? editState.experienced : false;

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
                        ) : isAdded || userListItemIds.has(item.id) ? (
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
              Page {currentPage + 1}
              {totalPages > 0 && ` of ${totalPages}`}
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
        </>
      ) : null}
    </div>
  );
};