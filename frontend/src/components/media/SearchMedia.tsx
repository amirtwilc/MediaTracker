import React, { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { MediaItem } from '../../types';
import { api } from '../../services/api';
import { TruncatedList } from '../common/TruncatedList';

export const SearchMedia: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await api.searchMediaItems(query, category || undefined);
      setResults(data);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (mediaItemId: number) => {
    try {
      await api.addToMyList(mediaItemId);
      alert('Added to your list!');
    } catch (error: any) {
      alert(error.message || 'Failed to add item');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for movies, series, or games..."
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600"
        >
          <option value="">All Categories</option>
          <option value="MOVIE">Movie</option>
          <option value="SERIES">Series</option>
          <option value="GAME">Game</option>
        </select>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
        >
          <Search size={20} />
        </button>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Searching...</div>}

      {!loading && results.length > 0 && (
        <div className="grid gap-3">
          {results.map((item) => (
            <div key={item.id} className="bg-gray-800 p-4 rounded border border-gray-700 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-gray-700 text-xs rounded">{item.category}</span>
                  <h3 className="text-white font-medium">{item.name}</h3>
                  {item.year && <span className="text-gray-400 text-sm">({item.year})</span>}
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>
                    <span className="font-medium">Genres:</span>{' '}
                    <TruncatedList items={item.genres.map(g => g.name)} />
                  </div>
                  <div>
                    <span className="font-medium">Platforms:</span>{' '}
                    <TruncatedList items={item.platforms.map(p => p.name)} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleAdd(item.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium flex items-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No results found. Try a different search term.
        </div>
      )}
    </div>
  );
};