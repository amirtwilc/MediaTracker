import { useState, useCallback } from 'react';
import { SortConfig, PaginationMode } from '../types/media.types';

export interface UseSortReturn {
  sortConfig: SortConfig | null;
  paginationMode: PaginationMode;
  handleSort: (key: string) => void;
  setSortConfig: (config: SortConfig | null) => void;
}

/**
 * Hook to manage sort state and pagination mode switching
 */
export function useSort(): UseSortReturn {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [paginationMode, setPaginationMode] = useState<PaginationMode>('cursor');

  /**
   * Handle sort toggle (3-state: asc -> desc -> none)
   */
  const handleSort = useCallback((key: string) => {
    setSortConfig(current => {
      if (!current || current.key !== key) {
        // First click: sort ascending, switch to offset pagination
        setPaginationMode('offset');
        return { key, direction: 'asc' };
      } else if (current.direction === 'asc') {
        // Second click: sort descending, stay in offset pagination
        return { key, direction: 'desc' };
      } else {
        // Third click: remove sort, switch back to cursor pagination
        setPaginationMode('cursor');
        return null;
      }
    });
  }, []);

  return {
    sortConfig,
    paginationMode,
    handleSort,
    setSortConfig,
  };
}