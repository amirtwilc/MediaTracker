import React, { useState } from 'react';

interface TruncatedListProps {
  items: string[];
  maxVisible?: number;
}

export const TruncatedList: React.FC<TruncatedListProps> = ({ items, maxVisible = 2 }) => {
  const [showAll, setShowAll] = useState(false);
  
  if (items.length === 0) return <span className="text-gray-500">-</span>;
  
  const visible = showAll ? items : items.slice(0, maxVisible);
  const remaining = items.length - maxVisible;

  return (
    <div className="relative inline-block">
      <span className="text-gray-200">
        {visible.join(', ')}
        {!showAll && remaining > 0 && (
          <button
            onMouseEnter={() => setShowAll(true)}
            onMouseLeave={() => setShowAll(false)}
            className="ml-1 text-blue-400 hover:text-blue-300"
          >
            +{remaining}
          </button>
        )}
      </span>
    </div>
  );
};