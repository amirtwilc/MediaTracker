import React, { useState, useEffect, useRef } from 'react';
import { Edit2, Trash2, X, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserMediaListItem, Genre, Platform } from '../../types';
import { api } from '../../services/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { StarRating } from '../common/StarRating';
import { getCategoryColor } from '../../utils/categoryColors';

interface CachedPage {
  items: UserMediaListItem[];
  cursor: { name: string; id: number } | null;
  hasMore: boolean;
  totalCount: number;
}

interface PageCache {
  [key: string]: CachedPage;
}

export const MyMediaList: React.FC = () => {
  const [items, setItems] = useState<UserMediaListItem[]>([]);
  const [allItems, setAllItems] = useState<UserMediaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Edit mode state
  const [editState, setEditState] = useState<Partial<UserMediaListItem>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);
  const [wishToExperienceFilter, setWishToExperienceFilter] = useState(false);

  // Sorting (client-side only for now)
  const [sortConfig, setSortConfig] = useState<Array<{ key: string; direction: 'asc' | 'desc' }>>([]);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number | null }>({
    show: false,
    id: null,
  });

  // Available options for filters
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [allPlatforms, setAllPlatforms] = useState<string[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  // Cursor-based pagination state
  const [cursors, setCursors] = useState<Array<{ name: string; id: number } | null>>([null]);
  const [pageCache, setPageCache] = useState<PageCache>({});
  const [prefetchInProgress, setPrefetchInProgress] = useState<Set<number>>(new Set());
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    loadGenresAndPlatforms();
    loadAllItemsForFilters();
    loadPage(0);
  }, []);

  // Reload when filters change
  useEffect(() => {
    if (!loading) {
      handleSearch();
    }
  }, [searchQuery, filterCategories, filterGenres, filterPlatforms, wishToExperienceFilter]);

  // Prefetch adjacent pages when current page changes
  useEffect(() => {
    if (items.length > 0) {
      // Prefetch next page if it exists
      if (hasNextPage && currentPage + 1 < cursors.length) {
        prefetchPage(currentPage + 1);
      }
      // Prefetch previous page if it exists
      if (currentPage > 0) {
        prefetchPage(currentPage - 1);
      }
    }
  }, [currentPage]);

  const loadGenresAndPlatforms = async () => {
    try {
      const [genresData, platformsData] = await Promise.all([
        api.getAllGenres(),
        api.getAllPlatforms(),
      ]);
      setGenres(genresData);
      setPlatforms(platformsData);
    } catch (error) {
      console.error('Failed to load genres/platforms', error);
    }
  };

  const loadAllItemsForFilters = async () => {
    try {
      // Load all items to populate filter options
      const data = await api.getMyMediaList(0, 1000);
      setAllItems(data);

      // Extract unique genres and platforms
      const genresSet = new Set<string>();
      const platformsSet = new Set<string>();

      data.forEach(item => {
        item.mediaItem.genres.forEach(g => genresSet.add(g.name));
        item.mediaItem.platforms.forEach(p => platformsSet.add(p.name));
      });

      setAllGenres(Array.from(genresSet).sort());
      setAllPlatforms(Array.from(platformsSet).sort());
    } catch (error) {
      console.error('Failed to load items for filters', error);
    }
  };

  const getCacheKey = (page: number): string => {
    const filters = {
      searchQuery,
      categories: filterCategories.sort(),
      genres: filterGenres.sort(),
      platforms: filterPlatforms.sort(),
      wishToExperience: wishToExperienceFilter,
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

    const category = filterCategories.length === 1 ? filterCategories[0] : undefined;

    const response = await api.getMyMediaListCursor({
      searchQuery: searchQuery || '',
      category,
      genreIds,
      platformIds,
      wishToExperience: wishToExperienceFilter || undefined,
      cursorName: cursor?.name,
      cursorId: cursor?.id,
      limit: 20,
    });

    // Apply client-side sorting if needed
    let sortedItems = response.items;
    if (sortConfig.length > 0) {
      sortedItems = applySorting([...response.items]);
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
      setItems(cached.items);
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
    // Reset pagination
    setCurrentPage(0);
    setCursors([null]);
    setPageCache({});
    loadPage(0);
  };

  const applySorting = (itemsToSort: UserMediaListItem[]): UserMediaListItem[] => {
    if (sortConfig.length === 0) return itemsToSort;

    return [...itemsToSort].sort((a, b) => {
      for (const sort of sortConfig) {
        let comparison = 0;

        switch (sort.key) {
          case 'name':
            comparison = a.mediaItem.name.localeCompare(b.mediaItem.name);
            break;
          case 'year':
            comparison = (a.mediaItem.year || 0) - (b.mediaItem.year || 0);
            break;
          case 'experienced':
            comparison = (a.experienced ? 1 : 0) - (b.experienced ? 1 : 0);
            break;
          case 'reexperience':
            comparison = (a.wishToReexperience ? 1 : 0) - (b.wishToReexperience ? 1 : 0);
            break;
          case 'rating':
            comparison = (a.rating || 0) - (b.rating || 0);
            break;
        }

        if (comparison !== 0) {
          return sort.direction === 'asc' ? comparison : -comparison;
        }
      }

      return 0;
    });
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
      await api.updateMyListItem(id, editState);

      // Clear cache and reload
      setPageCache({});
      setCursors([null]);
      await loadAllItemsForFilters();
      await loadPage(currentPage);

      setEditingId(null);
      setEditState({});
    } catch (error) {
      console.error('Failed to update item', error);
    }
  };

  const handleRemove = (id: number) => {
    setDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.id) {
      try {
        await api.removeFromMyList(deleteConfirm.id);

        // Clear cache and reload
        setPageCache({});
        setCursors([null]);
        await loadAllItemsForFilters();
        await loadPage(0);
      } catch (error) {
        console.error('Failed to remove item', error);
      }
    }
    setDeleteConfirm({ show: false, id: null });
  };

  const handleSort = (key: string) => {
    setSortConfig(current => {
      const existing = current.find(s => s.key === key);
      if (existing) {
        if (existing.direction === 'asc') {
          return current.map(s => s.key === key ? { ...s, direction: 'desc' as 'desc' } : s);
        } else {
          return current.filter(s => s.key !== key);
        }
      } else {
        return [...current, { key, direction: 'asc' as 'asc' }];
      }
    });

    // Reapply sorting to current items
    const sorted = applySorting(items);
    setItems(sorted);
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

  const hasActiveFilters = filterCategories.length > 0 || filterGenres.length > 0 ||
    filterPlatforms.length > 0 || wishToExperienceFilter;

  if (loading && items.length === 0) {
    return <div className="text-center py-8 text-gray-400">Loading your list...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search in your list by name..."
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2"
            title="Clear search"
          >
            <X size={20} />
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
      </div>  {/* Collapsible Filters */}
      {showFilters && (
        <div className="bg-gray-800 p-4 rounded border border-gray-700 space-y-4">
          <div className="flex items-center gap-4">
            <h3 className="text-white font-medium">Filters:</h3>
            <label className="flex items-center gap-2 text-white">
              <input
                type="checkbox"
                checked={wishToExperienceFilter}
                onChange={(e) => setWishToExperienceFilter(e.target.checked)}
                className="w-4 h-4"
              />
              Wish to Experience
            </label>
          </div>      <div>
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
          </div>      {allGenres.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Genres:</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {allGenres.map(genre => (
                  <button
                    key={genre}
                    onClick={() => toggleFilter(filterGenres, setFilterGenres, genre)}
                    className={`px-3 py-1 rounded text-sm ${filterGenres.includes(genre)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>
          )}      {allPlatforms.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Platforms:</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {allPlatforms.map(platform => (
                  <button
                    key={platform}
                    onClick={() => toggleFilter(filterPlatforms, setFilterPlatforms, platform)}
                    className={`px-3 py-1 rounded text-sm ${filterPlatforms.includes(platform)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                  >
                    {platform}
                  </button>
                ))}
              </div>
            </div>
          )}      {hasActiveFilters && (
            <button
              onClick={() => {
                setFilterCategories([]);
                setFilterGenres([]);
                setFilterPlatforms([]);
                setWishToExperienceFilter(false);
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}  {/* Active Sorts Display */}
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
      )}  {items.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {totalCount === 0 && allItems.length === 0
            ? 'No items in your list. Search and add some media!'
            : 'No items match your filters.'}
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
                    Re-experience {getSortIcon('reexperience')}
                  </th>
                  <th
                    className="px-4 py-3 text-left cursor-pointer hover:bg-gray-600"
                    onClick={() => handleSort('rating')}
                  >
                    Rating {getSortIcon('rating')}
                  </th>
                  <th className="px-4 py-3 text-left">Comment</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {items.map((item) => {
                  const isEditing = editingId === item.id;
                  const currentExperienced = isEditing ? editState.experienced : item.experienced; return (
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
                          <span>{item.experienced ? '✓' : '-'}</span>
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
                          <span>{item.wishToReexperience ? '✓' : '-'}</span>
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
                          <StarRating rating={item.rating} readonly />
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
                          <span className="text-sm text-gray-300">{item.comment || '-'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>      {/* Pagination */}
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
      )}  <ConfirmModal
        isOpen={deleteConfirm.show}
        title="Remove Item"
        message="Are you sure you want to remove this item from your list?"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ show: false, id: null })}
      />
    </div>
  );
};