import React from 'react';
import { SortConfig } from '../../../types/media.types';

export interface MediaTableColumn<T = any> {
  key: string;
  label: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  headerClassName?: string;
  cellClassName?: string;
  render: (item: T, index: number) => React.ReactNode;
}

export interface MediaTableProps<T = any> {
  columns: MediaTableColumn<T>[];
  items: T[];
  sortConfig: SortConfig | null;
  onSort?: (key: string) => void;
  emptyMessage?: string;
}

/**
 * Reusable table component with sortable headers
 */
export const MediaTable = <T,>({
  columns,
  items,
  sortConfig,
  onSort,
  emptyMessage = 'No items to display',
}: MediaTableProps<T>) => {
  const getSortIcon = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) return null;

    return (
      <span className="ml-1 text-blue-400 text-xs">
        {sortConfig.direction === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-700 text-gray-300 text-sm">
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-4 py-3 text-${column.align || 'left'} ${
                  column.sortable && onSort ? 'cursor-pointer hover:bg-gray-600' : ''
                } ${column.headerClassName || ''}`}
                onClick={column.sortable && onSort ? () => onSort(column.key) : undefined}
              >
                {column.label}
                {column.sortable && getSortIcon(column.key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-sm">
          {items.map((item, index) => (
            <tr key={(item as any).id || index} className="border-b border-gray-700 hover:bg-gray-800">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`px-4 py-3 ${column.cellClassName || ''}`}
                >
                  {column.render(item, index)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};