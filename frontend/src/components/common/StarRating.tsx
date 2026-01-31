import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';

interface StarRatingProps {
  rating?: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  maxRating?: number;
  size?: number;
  showLabel?: boolean;
  label?: string;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  onChange,
  readonly = false,
  maxRating = 10,
  size = 16,
  showLabel = true,
  label,
}) => {
  const [hover, setHover] = useState(0);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Handle keyboard navigation
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (readonly) return;

      const currentRating = hover || rating || 0;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp':
          e.preventDefault();
          if (currentRating < maxRating) {
            const newRating = currentRating + 1;
            setHover(newRating);
            onChange?.(newRating);
          }
          break;

        case 'ArrowLeft':
        case 'ArrowDown':
          e.preventDefault();
          if (currentRating > 1) {
            const newRating = currentRating - 1;
            setHover(newRating);
            onChange?.(newRating);
          }
          break;

        case 'Home':
          e.preventDefault();
          setHover(1);
          onChange?.(1);
          break;

        case 'End':
          e.preventDefault();
          setHover(maxRating);
          onChange?.(maxRating);
          break;

        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
        case '6':
        case '7':
        case '8':
        case '9':
          e.preventDefault();
          const num = parseInt(e.key);
          if (num >= 1 && num <= maxRating) {
            setHover(num);
            onChange?.(num);
          }
          break;

        case 'Escape':
          setHover(0);
          setFocusedIndex(-1);
          containerRef.current?.blur();
          break;
      }
    },
    [readonly, rating, hover, maxRating, onChange]
  );

  /**
   * Handle star click
   */
  const handleStarClick = useCallback(
    (ratingValue: number) => {
      if (readonly) return;
      onChange?.(ratingValue);
      setHover(0);
    },
    [readonly, onChange]
  );

  /**
   * Handle star hover (mouse)
   */
  const handleStarHover = useCallback(
    (ratingValue: number) => {
      if (readonly) return;
      setHover(ratingValue);
    },
    [readonly]
  );

  /**
   * Handle touch events for mobile
   */
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (readonly) return;

      const touch = e.touches[0];
      const element = document.elementFromPoint(touch.clientX, touch.clientY);

      if (element?.getAttribute('data-rating')) {
        const ratingValue = parseInt(element.getAttribute('data-rating')!);
        setHover(ratingValue);
      }
    },
    [readonly]
  );

  const handleTouchEnd = useCallback(() => {
    if (readonly || hover === 0) return;
    onChange?.(hover);
    setHover(0);
  }, [readonly, hover, onChange]);

  /**
   * Reset hover when mouse leaves
   */
  const handleMouseLeave = useCallback(() => {
    if (!readonly) {
      setHover(0);
      setFocusedIndex(-1);
    }
  }, [readonly]);

  const currentRating = hover || rating || 0;
  const ratingLabel = label || `${currentRating}/${maxRating}`;

  return (
    <div className="inline-flex items-center gap-2">
      <div
        ref={containerRef}
        role="radiogroup"
        aria-label={readonly ? `Rating: ${rating} out of ${maxRating}` : 'Rate from 1 to 10'}
        aria-readonly={readonly}
        className="flex gap-1"
        onKeyDown={handleKeyDown}
        onMouseLeave={handleMouseLeave}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        tabIndex={readonly ? -1 : 0}
      >
        {[...Array(maxRating)].map((_, i) => {
          const ratingValue = i + 1;
          const isActive = ratingValue <= currentRating;

          return (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={ratingValue === rating}
              aria-label={`${ratingValue} star${ratingValue !== 1 ? 's' : ''}`}
              data-rating={ratingValue}
              onClick={() => handleStarClick(ratingValue)}
              onMouseEnter={() => handleStarHover(ratingValue)}
              onFocus={() => setFocusedIndex(i)}
              onBlur={() => setFocusedIndex(-1)}
              disabled={readonly}
              tabIndex={-1}
              className={`transition-all ${
                readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'
              } ${focusedIndex === i ? 'ring-2 ring-blue-500 rounded' : ''} focus:outline-none`}
            >
              <Star
                size={size}
                className={`transition-colors ${
                  isActive
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-600 hover:text-gray-500'
                }`}
              />
            </button>
          );
        })}
      </div>

      {/* Rating Label */}
      {showLabel && (rating > 0 || hover > 0) && (
        <span className="text-sm text-gray-400 font-medium min-w-[3rem]" aria-live="polite">
          {ratingLabel}
        </span>
      )}

      {/* Screen reader only instructions */}
      {!readonly && (
        <span className="sr-only">
          Use arrow keys to select rating, or press a number key from 1 to {maxRating}
        </span>
      )}
    </div>
  );
};