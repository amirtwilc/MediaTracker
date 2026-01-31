import { MediaItem, UserMediaListItem, Genre, Platform } from './index';

/**
 * Pagination mode - cursor for unsorted, offset for sorted
 */
export type PaginationMode = 'cursor' | 'offset';

/**
 * Sort configuration
 */
export interface SortConfig {
  key: string;
  direction: 'asc' | 'desc';
}

/**
 * Cursor for cursor-based pagination
 */
export interface Cursor {
  name: string;
  id: number;
}

/**
 * Filter state for media lists
 */
export interface MediaFilters {
  searchQuery: string;
  categories: string[];
  genres: string[];
  platforms: string[];
  wishToExperience?: boolean;
}

/**
 * Available filter options
 */
export interface AvailableFilters {
  genres: Genre[];
  platforms: Platform[];
}

/**
 * Pagination state
 */
export interface PaginationState {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  loading: boolean;
}

/**
 * Configuration for table columns
 */
export interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  render?: (item: any) => React.ReactNode;
}

/**
 * Props for media pagination hook
 */
export interface UseMediaPaginationProps<T> {
  fetchFunction: (params: {
    page: number;
    cursor: Cursor | null;
    filters: MediaFilters;
    sortConfig: SortConfig | null;
    paginationMode: PaginationMode;
  }) => Promise<{
    items: T[];
    cursor: Cursor | null;
    hasMore: boolean;
    totalCount: number;
  }>;
  filters: MediaFilters;
  sortConfig: SortConfig | null;
  paginationMode: PaginationMode;
}

/**
 * Return type for media pagination hook
 */
export interface UseMediaPaginationReturn<T> {
  items: T[];
  paginationState: PaginationState;
  cursors: (Cursor | null)[];
  loadPage: (pageNum: number, forceRefresh?: boolean) => Promise<void>;
  handleNextPage: () => void;
  handlePrevPage: () => void;
  resetPagination: () => void;
}