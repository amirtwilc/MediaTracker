import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PaginationState } from '../../../types/media.types';

export interface MediaPaginationProps {
  paginationState: PaginationState;
  onNextPage: () => void;
  onPrevPage: () => void;
}

/**
 * Reusable pagination component
 */
export const MediaPagination: React.FC<MediaPaginationProps> = ({
  paginationState,
  onNextPage,
  onPrevPage,
}) => {
  const { currentPage, totalPages, totalCount, hasNextPage, hasPrevPage, loading } = paginationState;

  if (totalPages <= 1) {
    return null;
  }

  return (
    <div className="flex items-center justify-center gap-4 mt-4">
      <button
        onClick={onPrevPage}
        disabled={!hasPrevPage || loading}
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
        onClick={onNextPage}
        disabled={!hasNextPage || loading}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        Next
        <ChevronRight size={20} />
      </button>
    </div>
  );
};