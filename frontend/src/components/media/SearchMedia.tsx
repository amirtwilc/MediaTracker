import React, { useState, useEffect } from 'react';
import { Search, Plus, Check, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { MediaItem, UserMediaListItem } from '../../types';
import { api } from '../../services/api';
import { StarRating } from '../common/StarRating';
import { getCategoryColor } from '../../utils/categoryColors';

export const SearchMedia: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [allResults, setAllResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

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

  // Sorting
  const [sortConfig, setSortConfig] = useState<Array<{key: string; direction: 'asc' | 'desc'}>>([]);

  // Added items tracking
  const [addedItems, setAddedItems] = useState<Set<number>>(new Set());
  const [editingAddedId, setEditingAddedId] = useState<number | null>(null);
  const [editState, setEditState] = useState<Partial<UserMediaListItem>>({});
  const [userListItemIds, setUserListItemIds] = useState<Map<number, number>>(new Map());

  useEffect(() => {
    loadLatestItems();
    loadGenresAndPlatforms();
    loadUserList();
  }, []);

  useEffect(() => {
    if (query || filterCategories.length > 0 || filterGenres.length > 0 || filterPlatforms.length > 0) {
      applyFiltersAndSearch();
    } else if (hasSearched) {
      // When all filters are cleared, reload latest items
      loadLatestItems();
    }
  }, [filterCategories, filterGenres, filterPlatforms]);

  // Auto-hide error message after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => {
        setErrorMessage('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  const loadUserList = async () => {
    try {
      const list = await api.getMyMediaList(0, 1000);
      const itemMap = new Map(list.map(item => [item.mediaItem.id, item.id]));
      setUserListItemIds(itemMap);
    } catch (error) {
      console.error('Failed to load user list', error);
    }
  };

  const loadLatestItems = async () => {
    setLoading(true);
    try {
      const data = await api.searchMediaItems('', undefined, 0, 200);
      const sorted = data.sort((a, b) => (b.year || 0) - (a.year || 0));
      setAllResults(sorted);
      setResults(sorted.slice(0, 20));
      setCurrentPage(0);
      setTotalPages(Math.ceil(sorted.length / 20));
      setHasSearched(false);
    } catch (error) {
      console.error('Failed to load items', error);
    } finally {
      setLoading(false);
    }
  };

  const loadGenresAndPlatforms = async () => {
    try {
      const [genresData, platformsData] = await Promise.all([
        api.getAllGenres(),
        api.getAllPlatforms(),
      ]);
      setAllGenres(genresData.map(g => g.name).sort());
      setAllPlatforms(platformsData.map(p => p.name).sort());
    } catch (error) {
      console.error('Failed to load genres/platforms', error);
    }
  };

  const applyFiltersAndSearch = async () => {
    setLoading(true);
    setHasSearched(true);
    setCurrentPage(0);

    try {
      // Fetch data based on query and category filter
      const data = await api.searchMediaItems(query || '', undefined, 0, 200);

      let filtered = data;

      // Apply category filter
      if (filterCategories.length > 0) {
        filtered = filtered.filter(item =>
          filterCategories.includes(item.category)
        );
      }

      // Apply genre filter
      if (filterGenres.length > 0) {
        filtered = filtered.filter(item =>
          item.genres.some(g => filterGenres.includes(g.name))
        );
      }

      // Apply platform filter
      if (filterPlatforms.length > 0) {
        filtered = filtered.filter(item =>
          item.platforms.some(p => filterPlatforms.includes(p.name))
        );
      }

      // Apply sorting
      const sorted = applySorting(filtered);
      
      setAllResults(sorted);
      setResults(sorted.slice(0, 20));
      setTotalPages(Math.max(1, Math.ceil(sorted.length / 20)));
    } catch (error) {
      console.error('Search failed', error);
      setAllResults([]);
      setResults([]);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    applyFiltersAndSearch();
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    const startIdx = page * 20;
    const endIdx = startIdx + 20;
    setResults(allResults.slice(startIdx, endIdx));
  };

  const handleClearSearch = () => {
    setQuery('');
    setFilterCategories([]);
    setFilterGenres([]);
    setFilterPlatforms([]);
    setSortConfig([]);
    setHasSearched(false);
    loadLatestItems();
  };

  const applySorting = (items: MediaItem[], config: Array<{ key: string; direction: 'asc' | 'desc' }> = sortConfig) => {
    if (config.length === 0) return items;

    return [...items].sort((a, b) => {
      for (const sort of config) {
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
      let newConfig;
      if (existing) {
        if (existing.direction === 'asc') {
          newConfig = prev.map(s => s.key === key ? { ...s, direction: 'desc' as 'desc' } : s);
        } else {
          newConfig = prev.filter(s => s.key !== key);
        }
      } else {
        newConfig = [...prev, { key, direction: 'asc' as 'asc' }];
      }
      
      // Apply sorting immediately to all results
      const sorted = applySorting(allResults, newConfig);
      setAllResults(sorted);
      
      // Update current page results
      const startIdx = currentPage * 20;
      const endIdx = startIdx + 20;
      setResults(sorted.slice(startIdx, endIdx));
      
      return newConfig;
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

          <div>
            <label className="block text-sm text-gray-300 mb-2">Genres:</label>
            {allGenres.length > 0 ? (
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
            ) : (
              <div className="text-sm text-gray-400">Loading genres...</div>
            )}
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Platforms:</label>
            {allPlatforms.length > 0 ? (
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
            ) : (
              <div className="text-sm text-gray-400">Loading platforms...</div>
            )}
          </div>

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
            onClick={() => {
              setSortConfig([]);
              const startIdx = currentPage * 20;
              const endIdx = startIdx + 20;
              setResults(allResults.slice(startIdx, endIdx));
            }}
            className="ml-4 text-sm text-red-400 hover:text-red-300"
          >
            Clear sorts
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading...</div>
      ) : results.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No results found. Try a different search term.
        </div>
      ) : (
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
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-gray-300">
                Page {currentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};