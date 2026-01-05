import React, { useState, useEffect } from 'react';
import { Search, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { MediaItem, Genre, Platform } from '../../types';
import { api } from '../../services/api';
import { getCategoryColor } from '../../utils/categoryColors';
import { ConfirmModal } from '../common/ConfirmModal';

export const UpdateMediaItem: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Cursor pagination
  const [cursors, setCursors] = useState<Array<{ name: string; id: number } | null>>([null]);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [hasPrevPage, setHasPrevPage] = useState(false);

  // Edit mode
  const [selectedItem, setSelectedItem] = useState<MediaItem | null>(null);
  const [year, setYear] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);

  // Available genres and platforms
  const [genres, setGenres] = useState<Genre[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Success message
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadPage(0, null);
  }, []);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  const loadPage = async (pageNum: number, cursor: { name: string; id: number } | null) => {
    setSearchLoading(true);
    try {
      const response = await api.searchMediaItemsCursor({
        query: searchQuery,
        cursorName: cursor?.name,
        cursorId: cursor?.id,
        limit: 20,
      });

      setSearchResults(response.items);
      setHasNextPage(response.hasMore);
      setHasPrevPage(pageNum > 0);
      setCurrentPage(pageNum);
      setTotalCount(response.totalCount);
      setTotalPages(Math.ceil(response.totalCount / 20));

      // Store next cursor if available
      if (response.hasMore && response.nextCursor) {
        setCursors(prev => {
          const newCursors = [...prev];
          if (pageNum + 1 >= newCursors.length) {
            newCursors.push(response.nextCursor!);
          }
          return newCursors;
        });
      }

      setHasSearched(true);
    } catch (error) {
      console.error('Failed to load items', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSearch = () => {
    // Reset pagination state
    setCurrentPage(0);
    setCursors([null]);
    loadPage(0, null);
  };

  const handleNextPage = () => {
    if (hasNextPage && currentPage + 1 < cursors.length) {
      loadPage(currentPage + 1, cursors[currentPage + 1]);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      loadPage(currentPage - 1, cursors[currentPage - 1]);
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
    } catch (error) {
      console.error('Failed to load genres/platforms', error);
    }
  };

  const handleChooseItem = (item: MediaItem) => {
    setSelectedItem(item);
    setYear(item.year?.toString() || '');
    setSelectedGenres(item.genres.map(g => g.id));
    setSelectedPlatforms(item.platforms.map(p => p.id));
    // Load genres and platforms only when selecting an item
    loadGenresAndPlatforms();
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;

    try {
      await api.updateMediaItem(selectedItem.id, {
        category: selectedItem.category,
        name: selectedItem.name,
        year: year ? parseInt(year) : undefined,
        genreIds: selectedGenres,
        platformIds: selectedPlatforms,
      });

      setSuccessMessage('Item updated successfully!');
      setSelectedItem(null);
      // Reload current page
      loadPage(currentPage, cursors[currentPage]);
    } catch (error: any) {
      alert(error.message || 'Failed to update item');
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    try {
      await api.deleteMediaItem(selectedItem.id);
      setSuccessMessage('Item deleted successfully!');
      setSelectedItem(null);
      setDeleteConfirm(false);
      // Reload from first page after deletion
      setCurrentPage(0);
      setCursors([null]);
      loadPage(0, null);
    } catch (error: any) {
      alert(error.message || 'Failed to delete item');
      setDeleteConfirm(false);
    }
  };

  const handleCancel = () => {
    setSelectedItem(null);
    setYear('');
    setSelectedGenres([]);
    setSelectedPlatforms([]);
  };

  if (selectedItem) {
    return (
      <div className="space-y-4">
        {successMessage && (
          <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
            {successMessage}
          </div>
        )}

        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">Update Media Item</h3>
          <button
            onClick={handleCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
          >
            Back to Search
          </button>
        </div>

        <div className="bg-gray-800 p-6 rounded border border-gray-700 space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Category</label>
            <div className={`px-3 py-2 rounded ${getCategoryColor(selectedItem.category)} text-white inline-block`}>
              {selectedItem.category}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Name (Cannot be changed)</label>
            <input
              type="text"
              value={selectedItem.name}
              disabled
              className="w-full px-3 py-2 bg-gray-600 text-gray-400 rounded border border-gray-600 cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Year</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 1999"
              min="1800"
              max="2100"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Genres</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded">
              {genres.map((genre) => (
                <label key={genre.id} className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={selectedGenres.includes(genre.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGenres([...selectedGenres, genre.id]);
                      } else {
                        setSelectedGenres(selectedGenres.filter(id => id !== genre.id));
                      }
                    }}
                  />
                  {genre.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Platforms</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded">
              {platforms.map((platform) => (
                <label key={platform.id} className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlatforms([...selectedPlatforms, platform.id]);
                      } else {
                        setSelectedPlatforms(selectedPlatforms.filter(id => id !== platform.id));
                      }
                    }}
                  />
                  {platform.name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 justify-between pt-4">
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium flex items-center gap-2"
            >
              <Trash2 size={18} />
              Delete Item
            </button>
            <button
              onClick={handleUpdate}
              disabled={selectedGenres.length === 0 || selectedPlatforms.length === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
            >
              Update Item
            </button>
          </div>
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

  return (
    <div className="space-y-4">
      {successMessage && (
        <div className="bg-green-900 border border-green-700 text-green-200 px-4 py-3 rounded">
          {successMessage}
        </div>
      )}

      <h3 className="text-xl font-bold text-white">Update Media Item</h3>

      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for items to update..."
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={searchLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
        >
          <Search size={20} />
        </button>
      </div>

      {/* Media Search Results */}
      {hasSearched && (
        <div className="overflow-x-auto">
          {searchLoading && searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : searchResults.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No results found.</div>
          ) : (
            <>
              <table className="w-full">
                <thead className="bg-gray-700 text-gray-300 text-sm">
                  <tr>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Year</th>
                    <th className="px-4 py-3 text-left">Genres</th>
                    <th className="px-4 py-3 text-left">Platforms</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {searchResults.map((item) => (
                    <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800">
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.category)} text-white`}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                      <td className="px-4 py-3 text-gray-300">{item.year || '-'}</td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {item.genres.map(g => g.name).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-gray-300 text-sm">
                        {item.platforms.map(p => p.name).join(', ')}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleChooseItem(item)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium"
                        >
                          Choose
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-4">
                  <button
                    onClick={handlePrevPage}
                    disabled={!hasPrevPage || searchLoading}
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
                  </span>
                  <button
                    onClick={handleNextPage}
                    disabled={!hasNextPage || searchLoading}
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
      )}
    </div>
  );
};