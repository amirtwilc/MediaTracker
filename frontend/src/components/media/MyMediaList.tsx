import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, X, Filter, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserMediaListItem } from '../../types';
import { api } from '../../services/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { TruncatedList } from '../common/TruncatedList';
import { StarRating } from '../common/StarRating';
import { getCategoryColor } from '../../utils/categoryColors';

export const MyMediaList: React.FC = () => {
  const [items, setItems] = useState<UserMediaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Edit mode state
  const [editState, setEditState] = useState<Partial<UserMediaListItem>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [allItems, setAllItems] = useState<UserMediaListItem[]>([]);
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);
  const [wishToExperienceFilter, setWishToExperienceFilter] = useState(false);
  
  // Sorting
  const [sortConfig, setSortConfig] = useState<Array<{key: string; direction: 'asc' | 'desc'}>>([]);
  
  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; id: number | null }>({
    show: false,
    id: null,
  });

  // Available options for filters
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [allPlatforms, setAllPlatforms] = useState<string[]>([]);

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    // Extract unique genres and platforms from items
    const genres = new Set<string>();
    const platforms = new Set<string>();
    
    items.forEach(item => {
      item.mediaItem.genres.forEach(g => genres.add(g.name));
      item.mediaItem.platforms.forEach(p => platforms.add(p.name));
    });
    
    setAllGenres(Array.from(genres).sort());
    setAllPlatforms(Array.from(platforms).sort());
  }, [items]);

  const loadList = async () => {
    try {
      const data = await api.getMyMediaList(0, 1000); // Load all items
      setAllItems(data);
      setItems(data.slice(0, 20)); // Show first 20
      setCurrentPage(0);
      setTotalPages(Math.ceil(data.length / 20));
    } catch (error) {
      console.error('Failed to load list', error);
    } finally {
      setLoading(false);
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
      await loadList();
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
        await loadList();
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

  const filteredItems = allItems
    .filter(item => {
      if (searchQuery && !item.mediaItem.name.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (filterCategories.length > 0 && !filterCategories.includes(item.mediaItem.category)) {
        return false;
      }
      
      if (filterGenres.length > 0) {
        const hasMatchingGenre = item.mediaItem.genres.some(g => filterGenres.includes(g.name));
        if (!hasMatchingGenre) return false;
      }
      
      if (filterPlatforms.length > 0) {
        const hasMatchingPlatform = item.mediaItem.platforms.some(p => filterPlatforms.includes(p.name));
        if (!hasMatchingPlatform) return false;
      }
      
      if (wishToExperienceFilter) {
        if (item.experienced && !item.wishToReexperience) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
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

  const paginatedItems = filteredItems.slice(currentPage * 20, (currentPage + 1) * 20);
  const filteredTotalPages = Math.ceil(filteredItems.length / 20);
  if (loading) {
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
      </div>

      {/* Collapsible Filters */}
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
          </div>

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
                setWishToExperienceFilter(false);
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

      {filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {items.length === 0 ? 'No items in your list. Search and add some media!' : 'No items match your filters.'}
        </div>
      ) : (
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
              {paginatedItems.map((item) => {
                const isEditing = editingId === item.id;
                const currentExperienced = isEditing ? editState.experienced : item.experienced;
                
                return (
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
        </div>
      )}

      {filteredTotalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4">
          <button
            onClick={() => {
              setCurrentPage(prev => prev - 1);
              setItems(filteredItems.slice((currentPage - 1) * 20, currentPage * 20));
            }}
            disabled={currentPage === 0}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Previous
          </button>
          <span className="text-gray-300">
            Page {currentPage + 1} of {filteredTotalPages}
          </span>
          <button
            onClick={() => {
              setCurrentPage(prev => prev + 1);
              setItems(filteredItems.slice((currentPage + 1) * 20, (currentPage + 2) * 20));
            }}
            disabled={currentPage >= filteredTotalPages - 1}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      )}
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