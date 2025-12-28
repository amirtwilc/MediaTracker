import React, { useState, useEffect } from 'react';
import { ArrowLeft, UserPlus, Check, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { UserProfile as UserProfileType, UserMediaListItem } from '../../types';
import { api } from '../../services/api';
import { TruncatedList } from '../common/TruncatedList';
import { StarRating } from '../common/StarRating';
import { useAuth } from '../../contexts/AuthContext';

interface UserProfileProps {
  userId: number;
  onBack: () => void;
}


export const UserProfile: React.FC<UserProfileProps> = ({ userId, onBack }) => {
  const { user: currentUser, isAdmin } = useAuth();
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [items, setItems] = useState<UserMediaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategories, setFilterCategories] = useState<string[]>([]);
  const [filterGenres, setFilterGenres] = useState<string[]>([]);
  const [filterPlatforms, setFilterPlatforms] = useState<string[]>([]);

  // Available filter options
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [allPlatforms, setAllPlatforms] = useState<string[]>([]);

  // Sorting
  const [sortConfig, setSortConfig] = useState<Array<{key: string; direction: 'asc' | 'desc'}>>([]);

  const [error, setError] = useState<string>('');

  useEffect(() => {
    // Reset all state when userId changes
    setProfile(null);
    setItems([]);
    setFilterCategories([]);
    setFilterGenres([]);
    setFilterPlatforms([]);
    setSortConfig([]);
    setShowFilters(false);
    
    loadProfile();
    loadUserList();
  }, [userId]);

  useEffect(() => {
    // Extract unique genres and platforms
    const genres = new Set<string>();
    const platforms = new Set<string>();
    
    items.forEach(item => {
      item.mediaItem.genres.forEach(g => genres.add(g.name));
      item.mediaItem.platforms.forEach(p => platforms.add(p.name));
    });
    
    setAllGenres(Array.from(genres).sort());
    setAllPlatforms(Array.from(platforms).sort());
  }, [items]);

  const loadProfile = async () => {
    try {
      const data = await api.getUserProfile(userId);
      setProfile(data);
      setIsFollowing(data.isFollowing);
      setError(''); // Clear any previous errors
    } catch (error: any) {
      console.error('Failed to load profile', error);
      // Check if it's a privacy error
      if (error.message.includes('private') || error.message.includes('invisible')) {
        setError('This user has chosen to make their profile private.');
      } else {
        setError('Failed to load user profile.');
      }
    }
  };

  const loadUserList = async () => {
    setLoading(true);
    try {
      const data = await api.getUserMediaList(userId);
      setItems(data);
    } catch (error) {
      console.error('Failed to load user list', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      await api.followUser(userId, 7);
      setIsFollowing(true);
      loadProfile();
    } catch (error) {
      console.error('Failed to follow user', error);
    }
  };

  const handleUnfollow = async () => {
    try {
      await api.unfollowUser(userId);
      setIsFollowing(false);
      loadProfile();
    } catch (error) {
      console.error('Failed to unfollow user', error);
    }
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

  const filteredItems = items
    .filter(item => {
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

  const hasActiveFilters = filterCategories.length > 0 || filterGenres.length > 0 || filterPlatforms.length > 0;
  const showComment = (item: UserMediaListItem) => {
    // Show comment if: user is viewing their own list, OR the list owner is an admin
    return currentUser?.id === userId || profile?.role === 'ADMIN';
  };

  if (error) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="bg-gray-800 p-8 rounded border border-gray-700 text-center">
          <p className="text-gray-300 text-lg mb-4">{error}</p>
          <p className="text-gray-400 mb-6">This user's profile is not accessible.</p>
          <button
            onClick={handleUnfollow}
            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
          >
            Unfollow User
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded"
        >
          <ArrowLeft size={20} />
          Back
        </button>
        <div className="text-center py-8 text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Back Button and Profile Header */}
      <div className="flex items-start justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded"
        >
          <ArrowLeft size={20} />
          Back
        </button>

        <div className="flex-1 mx-6">
          <div className="bg-gray-800 p-6 rounded border border-gray-700">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-white">{profile.username}</h2>
                  <span
                    className={`px-3 py-1 rounded text-sm ${
                      profile.role === 'ADMIN'
                        ? 'bg-purple-600 text-white'
                        : 'bg-gray-700 text-gray-200'
                    }`}
                  >
                    {profile.role}
                  </span>
                </div>
                {profile.email && (
                  <p className="text-gray-400 text-sm mb-2">{profile.email}</p>
                )}
                <div className="flex gap-6 text-sm text-gray-400">
                  <span>Joined: {new Date(profile.createdAt).toLocaleDateString()}</span>
                  <span>Last Active: {new Date(profile.lastActive).toLocaleDateString()}</span>
                  <span>Ratings: {profile.ratingsCount}</span>
                  <span>Followers: {profile.followersCount}</span>
                </div>
              </div>

              {currentUser?.id !== userId && (
                <div>
                  {isFollowing ? (
                    <button
                      onClick={handleUnfollow}
                      className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded flex items-center gap-2"
                    >
                      <Check size={18} />
                      Following
                    </button>
                  ) : (
                    <button
                      onClick={handleFollow}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-2"
                    >
                      <UserPlus size={18} />
                      Follow
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold text-white">{profile.username}'s Media List</h3>

      {/* Filter Toggle */}
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

      {/* Filters */}
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

      {/* Sort Display */}
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

      {/* List Table */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading list...</div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No items in list.</div>
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
                {showComment(filteredItems[0]) && (
                  <th className="px-4 py-3 text-left">Comment</th>
                )}
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredItems.map((item) => (
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
                    <span>{item.experienced ? '✓' : '-'}</span>
                  </td>
                      <td className="px-4 py-3 text-center">
                          <span>{item.wishToReexperience ? '✓' : '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                          <StarRating rating={item.rating} readonly />
                      </td>
                      {showComment(item) && (
                          <td className="px-4 py-3 text-sm text-gray-300">{item.comment || '-'}</td>
                      )}
                  </tr>
              ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};