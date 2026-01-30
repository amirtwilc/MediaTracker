import React from 'react';
import { X } from 'lucide-react';

export interface MediaSearchProps {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  showClearButton?: boolean;
}

/**
 * Reusable search input component
 */
export const MediaSearch: React.FC<MediaSearchProps> = ({
  value,
  onChange,
  onClear,
  placeholder = 'Search...',
  showClearButton = true,
}) => {
  const handleClear = () => {
    onChange('');
    if (onClear) {
      onClear();
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
      />
      {showClearButton && value && (
        <button
          onClick={handleClear}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded flex items-center gap-2"
          title="Clear search"
        >
          <X size={20} />
        </button>
      )}
    </div>
  );
};