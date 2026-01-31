import React from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { Genre, Platform } from '../../../types';

export interface MediaFiltersProps {
  showFilters: boolean;
  onToggleFilters: () => void;
  hasActiveFilters: boolean;
  
  // Filter values
  filterCategories: string[];
  filterGenres: string[];
  filterPlatforms: string[];
  wishToExperience?: boolean;
  
  // Filter setters
  onCategoriesChange: (categories: string[]) => void;
  onGenresChange: (genres: string[]) => void;
  onPlatformsChange: (platforms: string[]) => void;
  onWishToExperienceChange?: (value: boolean) => void;
  
  // Available options
  availableGenres: Genre[];
  availablePlatforms: Platform[];
  
  // Toggle utility
  toggleFilter: (currentArray: string[], value: string) => string[];
  
  // Clear all
  onClearAll: () => void;
  
  // Conditional rendering
  showGenres?: boolean;
  showPlatforms?: boolean;
  showWishToExperience?: boolean;
}

/**
 * Reusable filter panel component
 */
export const MediaFilters: React.FC<MediaFiltersProps> = ({
  showFilters,
  onToggleFilters,
  hasActiveFilters,
  filterCategories,
  filterGenres,
  filterPlatforms,
  wishToExperience,
  onCategoriesChange,
  onGenresChange,
  onPlatformsChange,
  onWishToExperienceChange,
  availableGenres,
  availablePlatforms,
  toggleFilter,
  onClearAll,
  showGenres = true,
  showPlatforms = true,
  showWishToExperience = false,
}) => {
  return (
    <>
      {/* Filter Toggle Button */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleFilters}
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
          {showWishToExperience && onWishToExperienceChange && (
            <div className="flex items-center gap-4">
              <h3 className="text-white font-medium">Filters:</h3>
              <label className="flex items-center gap-2 text-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={wishToExperience || false}
                  onChange={(e) => onWishToExperienceChange(e.target.checked)}
                  className="w-4 h-4"
                />
                Wish to Experience
              </label>
            </div>
          )}

          {!showWishToExperience && <h3 className="text-white font-medium">Filters:</h3>}

          {/* Categories */}
          <div>
            <label className="block text-sm text-gray-300 mb-2">Categories:</label>
            <div className="flex flex-wrap gap-2">
              {['MOVIE', 'SERIES', 'GAME'].map(cat => (
                <button
                  key={cat}
                  onClick={() => onCategoriesChange(toggleFilter(filterCategories, cat))}
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

          {/* Genres */}
          {showGenres && availableGenres.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Genres:</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availableGenres.map(genre => (
                  <button
                    key={genre.id}
                    onClick={() => onGenresChange(toggleFilter(filterGenres, genre.name))}
                    className={`px-3 py-1 rounded text-sm ${
                      filterGenres.includes(genre.name)
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

          {/* Platforms */}
          {showPlatforms && availablePlatforms.length > 0 && (
            <div>
              <label className="block text-sm text-gray-300 mb-2">Platforms:</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {availablePlatforms.map(platform => (
                  <button
                    key={platform.id}
                    onClick={() => onPlatformsChange(toggleFilter(filterPlatforms, platform.name))}
                    className={`px-3 py-1 rounded text-sm ${
                      filterPlatforms.includes(platform.name)
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

          {/* Clear All */}
          {hasActiveFilters && (
            <button
              onClick={onClearAll}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              Clear all filters
            </button>
          )}
        </div>
      )}
    </>
  );
};