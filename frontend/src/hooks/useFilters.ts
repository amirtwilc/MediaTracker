import { useState, useCallback } from 'react';
import { Genre, Platform } from '../types';
import { MediaFilters, AvailableFilters } from '../types/media.types';

export interface UseFiltersProps {
  includeWishToExperience?: boolean;
}

export interface UseFiltersReturn {
  filters: MediaFilters;
  availableFilters: AvailableFilters;
  setSearchQuery: (query: string) => void;
  setCategories: (categories: string[]) => void;
  setGenres: (genres: string[]) => void;
  setPlatforms: (platforms: string[]) => void;
  setWishToExperience: (value: boolean) => void;
  setAvailableGenres: (genres: Genre[]) => void;
  setAvailablePlatforms: (platforms: Platform[]) => void;
  toggleFilter: (currentArray: string[], value: string) => string[];
  clearAllFilters: () => void;
  hasActiveFilters: boolean;
}

/**
 * Hook to manage filter state
 */
export function useFilters({ includeWishToExperience = false }: UseFiltersProps = {}): UseFiltersReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [wishToExperience, setWishToExperience] = useState(false);

  const [availableGenres, setAvailableGenres] = useState<Genre[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([]);

  /**
   * Toggle a value in a filter array
   */
  const toggleFilter = useCallback((currentArray: string[], value: string): string[] => {
    if (currentArray.includes(value)) {
      return currentArray.filter(v => v !== value);
    } else {
      return [...currentArray, value];
    }
  }, []);

  /**
   * Clear all filters
   */
  const clearAllFilters = useCallback(() => {
    setCategories([]);
    setGenres([]);
    setPlatforms([]);
    if (includeWishToExperience) {
      setWishToExperience(false);
    }
  }, [includeWishToExperience]);

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = 
    categories.length > 0 || 
    genres.length > 0 || 
    platforms.length > 0 || 
    (includeWishToExperience && wishToExperience);

  return {
    filters: {
      searchQuery,
      categories,
      genres,
      platforms,
      ...(includeWishToExperience ? { wishToExperience } : {}),
    },
    availableFilters: {
      genres: availableGenres,
      platforms: availablePlatforms,
    },
    setSearchQuery,
    setCategories,
    setGenres,
    setPlatforms,
    setWishToExperience,
    setAvailableGenres,
    setAvailablePlatforms,
    toggleFilter,
    clearAllFilters,
    hasActiveFilters,
  };
}