import { useState, useRef, useCallback } from 'react';
import {
  UseMediaPaginationProps,
  UseMediaPaginationReturn,
  PaginationState,
  Cursor,
} from '../types/media.types';

/**
 * Hook to handle media pagination (cursor and offset modes)
 */
export function useMediaPagination<T>({
  fetchFunction,
  filters,
  sortConfig,
  paginationMode,
}: UseMediaPaginationProps<T>): UseMediaPaginationReturn<T> {
  // Items and pagination state
  const [items, setItems] = useState<T[]>([]);
  const [paginationState, setPaginationState] = useState<PaginationState>({
    currentPage: 0,
    totalPages: 0,
    totalCount: 0,
    hasNextPage: false,
    hasPrevPage: false,
    loading: true,
  });

  // Cursor tracking for cursor-based pagination
  const [cursors, setCursors] = useState<(Cursor | null)[]>([null]);

  // Abort controller for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Load a specific page
   */
  const loadPage = useCallback(
    async (pageNum: number, forceRefresh: boolean = false) => {
      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      setPaginationState(prev => ({ ...prev, loading: true }));

      try {
        const cursor = cursors[pageNum];
        const result = await fetchFunction({
          page: pageNum,
          cursor,
          filters,
          sortConfig,
          paginationMode,
        });

        // Update cursors if we got a new cursor
        if (result.hasMore && result.cursor) {
          setCursors(prev => {
            const newCursors = [...prev];
            if (pageNum + 1 >= newCursors.length) {
              newCursors.push(result.cursor);
            }
            return newCursors;
          });
        }

        // Update items and pagination state
        setItems(result.items);
        setPaginationState({
          currentPage: pageNum,
          totalPages: Math.ceil(result.totalCount / 20),
          totalCount: result.totalCount,
          hasNextPage: result.hasMore,
          hasPrevPage: pageNum > 0,
          loading: false,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Failed to load page', error);
          setItems([]);
          setPaginationState({
            currentPage: pageNum,
            totalPages: 0,
            totalCount: 0,
            hasNextPage: false,
            hasPrevPage: false,
            loading: false,
          });
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    [fetchFunction, filters, sortConfig, paginationMode, cursors]
  );

  /**
   * Navigate to next page
   */
  const handleNextPage = useCallback(() => {
    if (paginationState.hasNextPage && !paginationState.loading) {
      loadPage(paginationState.currentPage + 1);
    }
  }, [paginationState.hasNextPage, paginationState.loading, paginationState.currentPage, loadPage]);

  /**
   * Navigate to previous page
   */
  const handlePrevPage = useCallback(() => {
    if (paginationState.currentPage > 0 && !paginationState.loading) {
      loadPage(paginationState.currentPage - 1);
    }
  }, [paginationState.currentPage, paginationState.loading, loadPage]);

  /**
   * Reset pagination to first page
   */
  const resetPagination = useCallback(() => {
    if (paginationMode === 'cursor') {
      setCursors([null]);
    }
    loadPage(0);
  }, [paginationMode, loadPage]);

  return {
    items,
    paginationState,
    cursors,
    loadPage,
    handleNextPage,
    handlePrevPage,
    resetPagination,
  };
}