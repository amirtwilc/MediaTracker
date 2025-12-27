import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, X } from 'lucide-react';
import { UserMediaListItem } from '../../types';
import { api } from '../../services/api';
import { ConfirmModal } from '../common/ConfirmModal';
import { TruncatedList } from '../common/TruncatedList';
import { StarRating } from '../common/StarRating';

export const MyMediaList: React.FC = () => {
  const [items, setItems] = useState<UserMediaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Edit mode state
  const [editState, setEditState] = useState<Partial<UserMediaListItem>>({});
  
  // Filters
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
      const data = await api.getMyMediaList();
      setItems(data);
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
          // Change to descending
          return current.map(s => s.key === key ? { ...s, direction: 'desc' as 'desc' } : s);
        } else {
          // Remove this sort
          return current.filter(s => s.key !== key);
        }
      } else {
        // Add new sort (ascending)
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

  const filteredItems = items
    .filter(item => {
      // Category filter
      if (filterCategories.length > 0 && !filterCategories.includes(item.mediaItem.category)) {
        return false;
      }
      
      // Genre filter (at least one genre matches)
      if (filterGenres.length > 0) {
        const hasMatchingGenre = item.mediaItem.genres.some(g => filterGenres.includes(g.name));
        if (!hasMatchingGenre) return false;
      }
      
      // Platform filter (at least one platform matches)
      if (filterPlatforms.length > 0) {
        const hasMatchingPlatform = item.mediaItem.platforms.some(p => filterPlatforms.includes(p.name));
        if (!hasMatchingPlatform) return false;
      }
      
      // Wish to experience filter
      if (wishToExperienceFilter) {
        if (item.experienced && !item.wishToReexperience) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      // Apply multiple sorts in order
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

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading your list...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
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

        {/* Category Filter */}
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

        {/* Genre Filter */}
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

        {/* Platform Filter */}
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

        {/* Clear Filters */}
        {(filterCategories.length > 0 || filterGenres.length > 0 || filterPlatforms.length > 0 || wishToExperienceFilter) && (
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
              {filteredItems.map((item) => {
                const isEditing = editingId === item.id;
                const currentExperienced = isEditing ? editState.experienced : item.experienced;
                
                return (
                  <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-200">
                        {item.mediaItem.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white font-medium">{item.mediaItem.name}</td>
                    <td className="px-4 py-3 text-gray-300">{item.mediaItem.year || '-'}</td>
                    <td className="px-4 py-3">
                      <TruncatedList items={item.mediaItem.genres.map(g => g.name)} />
                    </td>
                    <td className="px-4 py-3">
                      <TruncatedList items={item.mediaItem.platforms.map(p => p.name)} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isEditing ? (
                        <input
                          type="checkbox"
                          checked={currentExperienced || false}
                          onChange={(e) => setEditState({
                            ...editState,
                            experienced: e.target.checked,
                            // Reset rating and reexperience if unchecking experienced
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

      {/* Delete Confirmation Modal */}
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