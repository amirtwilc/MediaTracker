import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    Search,
    Plus,
    X,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    CheckCircle,
    Users as UsersIcon,
    Film,
} from 'lucide-react';
import { MediaItem } from '../../types';
import { UserProfile } from '../../api/api.types';
import { api, ApiError, NetworkError, TimeoutError } from '../../api';
import { getCategoryColor } from '../../utils/categoryColors';

// Constants
const MAX_ITEMS = 5;
const ITEMS_PER_PAGE = 20;
const MIN_RATING = 1;
const MAX_RATING = 10;
const SEARCH_DEBOUNCE_MS = 500;

// Types
interface RatingCriteria {
    mediaItem: MediaItem;
    minRating: number;
    maxRating: number;
}

interface AdvancedUserSearchProps {
    onViewUser: (userId: number) => void;
}

interface AlertState {
    type: 'success' | 'error' | null;
    message: string;
}

/**
 * Loading Skeleton
 */
const LoadingSkeleton: React.FC = () => (
    <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-800 p-4 rounded border border-gray-700 animate-pulse">
                <div className="h-4 bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-700 rounded w-1/2"></div>
            </div>
        ))}
    </div>
);

/**
 * Empty State
 */
const EmptyState: React.FC<{ type: 'media' | 'users' }> = ({ type }) => (
    <div className="text-center py-12">
        {type === 'media' ? (
            <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        ) : (
            <UsersIcon className="w-16 h-16 text-gray-600 mx-auto mb-4" />
        )}
        <h3 className="text-lg font-medium text-gray-300 mb-2">
            {type === 'media' ? 'No media found' : 'No users found'}
        </h3>
        <p className="text-sm text-gray-500 max-w-sm mx-auto">
            {type === 'media'
                ? 'Try adjusting your search terms'
                : 'No users match these rating criteria. Try adjusting the rating ranges.'}
        </p>
    </div>
);

/**
 * Rating Range Modal
 */
const RatingRangeModal: React.FC<{
    isOpen: boolean;
    item: MediaItem | null;
    onConfirm: (min: number, max: number) => void;
    onCancel: () => void;
}> = ({ isOpen, item, onConfirm, onCancel }) => {
    const [minRating, setMinRating] = useState(MIN_RATING);
    const [maxRating, setMaxRating] = useState(MAX_RATING);
    const [error, setError] = useState('');
    const modalRef = useRef<HTMLDivElement>(null);
    const cancelButtonRef = useRef<HTMLButtonElement>(null);

    // Reset when opened
    useEffect(() => {
        if (isOpen) {
            setMinRating(MIN_RATING);
            setMaxRating(MAX_RATING);
            setError('');
            cancelButtonRef.current?.focus();
        }
    }, [isOpen]);

    // Escape key handler
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onCancel]);

    // Focus trap
    useEffect(() => {
        if (!isOpen) return;

        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        const handleTab = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement?.focus();
                }
            } else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement?.focus();
                }
            }
        };

        document.addEventListener('keydown', handleTab);
        return () => document.removeEventListener('keydown', handleTab);
    }, [isOpen]);

    const handleMinChange = (value: number) => {
        if (value < MIN_RATING) value = MIN_RATING;
        if (value > MAX_RATING) value = MAX_RATING;
        setMinRating(value);
        if (value > maxRating) {
            setMaxRating(value);
        }
        setError('');
    };

    const handleMaxChange = (value: number) => {
        if (value < MIN_RATING) value = MIN_RATING;
        if (value > MAX_RATING) value = MAX_RATING;
        setMaxRating(value);
        if (value < minRating) {
            setMinRating(value);
        }
        setError('');
    };

    const handleConfirm = () => {
        if (minRating > maxRating) {
            setError('Minimum rating cannot be greater than maximum rating');
            return;
        }
        onConfirm(minRating, maxRating);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onCancel();
        }
    };

    if (!isOpen || !item) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="range-modal-title"
        >
            <div
                ref={modalRef}
                className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700 shadow-xl"
            >
                <h3 id="range-modal-title" className="text-xl font-bold text-white mb-4">
                    Select Rating Range
                </h3>
                <p className="text-gray-300 mb-2 font-medium">{item.name}</p>
                <p className="text-sm text-gray-400 mb-6">
                    Find users who rated this item within this range
                </p>

                {error && (
                    <div className="mb-4 p-3 bg-red-900 bg-opacity-20 border border-red-700 text-red-400 rounded-lg flex items-center gap-2">
                        <AlertCircle size={16} />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <div className="space-y-4 mb-6">
                    <div>
                        <label htmlFor="min-rating" className="block text-sm text-gray-300 mb-2">
                            Minimum Rating: {minRating}
                        </label>
                        <input
                            id="min-rating"
                            type="range"
                            min={MIN_RATING}
                            max={MAX_RATING}
                            value={minRating}
                            onChange={(e) => handleMinChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>{MIN_RATING}</span>
                            <span>{MAX_RATING}</span>
                        </div>
                    </div>

                    <div>
                        <label htmlFor="max-rating" className="block text-sm text-gray-300 mb-2">
                            Maximum Rating: {maxRating}
                        </label>
                        <input
                            id="max-rating"
                            type="range"
                            min={MIN_RATING}
                            max={MAX_RATING}
                            value={maxRating}
                            onChange={(e) => handleMaxChange(Number(e.target.value))}
                            className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>{MIN_RATING}</span>
                            <span>{MAX_RATING}</span>
                        </div>
                    </div>

                    <div className="bg-gray-700 p-3 rounded">
                        <p className="text-sm text-gray-300">
                            Range: <span className="text-white font-medium">{minRating} - {maxRating}</span>
                        </p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end">
                    <button
                        ref={cancelButtonRef}
                        onClick={onCancel}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
                    >
                        Add to Search
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * Advanced User Search Component
 */
export const AdvancedUserSearch: React.FC<AdvancedUserSearchProps> = ({ onViewUser }) => {
    // Media search state
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [mediaResults, setMediaResults] = useState<MediaItem[]>([]);
    const [isSearchingMedia, setIsSearchingMedia] = useState(false);
    const [hasSearchedMedia, setHasSearchedMedia] = useState(false);

    // Media pagination state
    const [mediaCursors, setMediaCursors] = useState<Array<{ name: string; id: number } | null>>([
        null,
    ]);
    const [mediaPage, setMediaPage] = useState(0);
    const [mediaTotalPages, setMediaTotalPages] = useState(0);
    const [mediaTotalCount, setMediaTotalCount] = useState(0);
    const [mediaHasMore, setMediaHasMore] = useState(false);

    // Selected criteria
    const [selectedCriteria, setSelectedCriteria] = useState<RatingCriteria[]>([]);

    // Modal state
    const [showRangeModal, setShowRangeModal] = useState(false);
    const [selectedMediaItem, setSelectedMediaItem] = useState<MediaItem | null>(null);

    // User results state
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [hasSearchedUsers, setHasSearchedUsers] = useState(false);
    const [userPage, setUserPage] = useState(0);
    const [userTotalPages, setUserTotalPages] = useState(0);

    // UI state
    const [alert, setAlert] = useState<AlertState>({ type: null, message: '' });

    // Refs
    const searchTimeoutRef = useRef<NodeJS.Timeout>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    /**
     * Debounce search query
     */
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    /**
     * Show alert with auto-dismiss
     */
    const showAlert = useCallback((type: 'success' | 'error', message: string) => {
        setAlert({ type, message });
        setTimeout(() => setAlert({ type: null, message: '' }), 3000);
    }, []);

    /**
     * Load media page
     */
    const loadMediaPage = useCallback(
        async (pageNum: number, cursor: { name: string; id: number } | null) => {
            if (!debouncedQuery.trim()) {
                return;
            }

            setIsSearchingMedia(true);
            setHasSearchedMedia(true);
            setMediaPage(pageNum);

            try {
                const response = await api.media.searchMediaItemsCursor({
                    query: debouncedQuery,
                    cursorName: cursor?.name,
                    cursorId: cursor?.id,
                    limit: ITEMS_PER_PAGE,
                });

                setMediaResults(response.items);
                setMediaHasMore(response.hasMore);
                setMediaTotalCount(response.totalCount);
                setMediaTotalPages(Math.ceil(response.totalCount / ITEMS_PER_PAGE));

                // Store next cursor
                if (response.hasMore && response.nextCursor) {
                    setMediaCursors((prev) => {
                        const newCursors = [...prev];
                        if (pageNum + 1 >= newCursors.length) {
                            newCursors.push(response.nextCursor!);
                        }
                        return newCursors;
                    });
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    showAlert('error', error.message);
                } else if (error instanceof NetworkError) {
                    showAlert('error', 'Network error. Please check your connection.');
                } else if (error instanceof TimeoutError) {
                    showAlert('error', 'Request timeout. Please try again.');
                } else {
                    showAlert('error', 'Failed to search media');
                }
                console.error('Media search failed', error);
                setMediaResults([]);
            } finally {
                setIsSearchingMedia(false);
            }
        },
        [debouncedQuery, showAlert]
    );

    /**
     * Search media (manual trigger)
     */
    const handleSearchMedia = useCallback(() => {
        setMediaPage(0);
        setMediaCursors([null]);
        loadMediaPage(0, null);
    }, [loadMediaPage]);

    /**
     * Handle adding media item
     */
    const handleAddItem = useCallback((item: MediaItem) => {
        setSelectedMediaItem(item);
        setShowRangeModal(true);
    }, []);

    /**
     * Confirm rating range
     */
    const handleConfirmRange = useCallback(
        (min: number, max: number) => {
            if (selectedMediaItem && selectedCriteria.length < MAX_ITEMS) {
                setSelectedCriteria((prev) => [
                    ...prev,
                    {
                        mediaItem: selectedMediaItem,
                        minRating: min,
                        maxRating: max,
                    },
                ]);
                setShowRangeModal(false);
                setSelectedMediaItem(null);
                showAlert('success', `Added ${selectedMediaItem.name} to search criteria`);
            }
        },
        [selectedMediaItem, selectedCriteria.length, showAlert]
    );

    /**
     * Remove criteria
     */
    const handleRemoveCriteria = useCallback((index: number) => {
        setSelectedCriteria((prev) => prev.filter((_, i) => i !== index));
    }, []);

    /**
     * Update rating range
     */
    const handleUpdateRange = useCallback((index: number, min: number, max: number) => {
        setSelectedCriteria((prev) => {
            const updated = [...prev];
            updated[index] = { ...updated[index], minRating: min, maxRating: max };
            return updated;
        });
    }, []);

    /**
     * Search users
     */
    const handleSearchUsers = useCallback(
        async (page: number = 0) => {
            if (selectedCriteria.length === 0) {
                showAlert('error', 'Please add at least one media item with rating criteria');
                return;
            }

            setHasSearchedUsers(true);
            setIsSearchingUsers(true);
            setUserPage(page);

            try {
                const request = {
                    itemRatingCriteria: selectedCriteria.map((c) => ({
                        mediaItemId: c.mediaItem.id,
                        minRating: c.minRating,
                        maxRating: c.maxRating,
                    })),
                    sortBy: 'lastActive',
                    sortDirection: 'desc',
                    page,
                    size: ITEMS_PER_PAGE,
                };

                const response = await api.users.searchUsersAdvanced(request);
                setUsers(response.content);
                setUserTotalPages(response.totalPages);

                // Scroll to results
                if (page === 0 && resultsRef.current) {
                    resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } catch (error) {
                if (error instanceof ApiError) {
                    showAlert('error', error.message);
                } else if (error instanceof NetworkError) {
                    showAlert('error', 'Network error. Please check your connection.');
                } else if (error instanceof TimeoutError) {
                    showAlert('error', 'Request timeout. Please try again.');
                } else {
                    showAlert('error', 'Failed to search users');
                }
                console.error('User search failed', error);
                setUsers([]);
            } finally {
                setIsSearchingUsers(false);
            }
        },
        [selectedCriteria, showAlert]
    );

    return (
        <div className="space-y-6">
            {/* Alert Messages */}
            {alert.type && (
                <div
                    className={`p-4 rounded-lg flex items-center gap-3 ${alert.type === 'success'
                            ? 'bg-green-900 bg-opacity-20 border border-green-700 text-green-400'
                            : 'bg-red-900 bg-opacity-20 border border-red-700 text-red-400'
                        }`}
                    role="alert"
                >
                    {alert.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span>{alert.message}</span>
                </div>
            )}

            {/* Selected Criteria */}
            {selectedCriteria.length > 0 && (
                <div className="bg-gray-800 p-4 rounded border border-gray-700">
                    <div className="flex justify-between items-center mb-3">
                        <h3 className="text-white font-medium">
                            Selected Items ({selectedCriteria.length}/{MAX_ITEMS})
                        </h3>
                        <button
                            onClick={() => handleSearchUsers(0)}
                            disabled={selectedCriteria.length === 0}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
                        >
                            Search Users
                        </button>
                    </div>
                    <div className="space-y-2">
                        {selectedCriteria.map((criteria, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between bg-gray-700 p-3 rounded gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-white font-medium truncate">{criteria.mediaItem.name}</p>
                                    <p className="text-sm text-gray-400">
                                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(criteria.mediaItem.category)} text-white mr-2`}>
                                            {criteria.mediaItem.category}
                                        </span>
                                        {criteria.mediaItem.year || 'N/A'}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <div className="flex items-center gap-1">
                                        <label className="text-xs text-gray-400 whitespace-nowrap">Min:</label>
                                        <div className="flex flex-col">
                                            <button
                                                onClick={() => {
                                                    const newMin = Math.min(criteria.minRating + 1, criteria.maxRating, 10);
                                                    handleUpdateRange(index, newMin, criteria.maxRating);
                                                }}
                                                className="px-1 py-0 bg-gray-600 hover:bg-gray-500 text-white text-xs leading-none h-3 flex items-center justify-center"
                                                title="Increase minimum"
                                            >
                                                ▲
                                            </button>
                                            <input
                                                min="1"
                                                max={criteria.maxRating}
                                                value={criteria.minRating}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= 1 && val <= criteria.maxRating) {
                                                        handleUpdateRange(index, val, criteria.maxRating);
                                                    }
                                                }}
                                                className="w-12 px-1 py-0.5 bg-gray-600 text-white text-center text-sm border-0 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newMin = Math.max(criteria.minRating - 1, 1);
                                                    handleUpdateRange(index, newMin, criteria.maxRating);
                                                }}
                                                className="px-1 py-0 bg-gray-600 hover:bg-gray-500 text-white text-xs leading-none h-3 flex items-center justify-center"
                                                title="Decrease minimum"
                                            >
                                                ▼
                                            </button>
                                        </div>
                                    </div>

                                    <span className="text-gray-400 text-sm">to</span>

                                    <div className="flex items-center gap-1">
                                        <label className="text-xs text-gray-400 whitespace-nowrap">Max:</label>
                                        <div className="flex flex-col">
                                            <button
                                                onClick={() => {
                                                    const newMax = Math.min(criteria.maxRating + 1, 10);
                                                    handleUpdateRange(index, criteria.minRating, newMax);
                                                }}
                                                className="px-1 py-0 bg-gray-600 hover:bg-gray-500 text-white text-xs leading-none h-3 flex items-center justify-center"
                                                title="Increase maximum"
                                            >
                                                ▲
                                            </button>
                                            <input
                                                min={criteria.minRating}
                                                max="10"
                                                value={criteria.maxRating}
                                                onChange={(e) => {
                                                    const val = Number(e.target.value);
                                                    if (val >= criteria.minRating && val <= 10) {
                                                        handleUpdateRange(index, criteria.minRating, val);
                                                    }
                                                }}
                                                className="w-12 px-1 py-0.5 bg-gray-600 text-white text-center text-sm border-0 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                                            />
                                            <button
                                                onClick={() => {
                                                    const newMax = Math.max(criteria.maxRating - 1, criteria.minRating);
                                                    handleUpdateRange(index, criteria.minRating, newMax);
                                                }}
                                                className="px-1 py-0 bg-gray-600 hover:bg-gray-500 text-white text-xs leading-none h-3 flex items-center justify-center"
                                                title="Decrease maximum"
                                            >
                                                ▼
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRemoveCriteria(index)}
                                        className="p-1 hover:bg-gray-600 rounded text-red-400 flex-shrink-0"
                                        title="Remove item"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Media Search Section */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Search for Media Items</h3>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearchMedia()}
                        placeholder="Search for movies, series, or games..."
                        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                        aria-label="Search media"
                    />
                    <button
                        onClick={handleSearchMedia}
                        disabled={isSearchingMedia || !searchQuery.trim()}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                    >
                        <Search size={20} />
                    </button>
                </div>

                {/* Media Results */}
                {hasSearchedMedia && (
                    <div className="space-y-4">
                        {isSearchingMedia ? (
                            <LoadingSkeleton />
                        ) : mediaResults.length === 0 ? (
                            <EmptyState type="media" />
                        ) : (
                            <>
                                <div className="overflow-x-auto">
                                    <table className="w-full" role="table">
                                        <thead className="bg-gray-700 text-gray-300 text-sm">
                                            <tr>
                                                <th scope="col" className="px-4 py-3 text-left">
                                                    Category
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-left">
                                                    Name
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-left">
                                                    Year
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-left">
                                                    Genre
                                                </th>
                                                <th scope="col" className="px-4 py-3 text-right">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-sm">
                                            {mediaResults.map((item) => {
                                                const alreadyAdded = selectedCriteria.some(
                                                    (c) => c.mediaItem.id === item.id
                                                );
                                                const canAdd = !alreadyAdded && selectedCriteria.length < MAX_ITEMS;

                                                return (
                                                    <tr
                                                        key={item.id}
                                                        className="border-b border-gray-700 hover:bg-gray-800 transition-colors"
                                                    >
                                                        <td className="px-4 py-3">
                                                            <span
                                                                className={`px-2 py-1 rounded text-xs ${getCategoryColor(
                                                                    item.category
                                                                )} text-white font-medium`}
                                                            >
                                                                {item.category}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                                                        <td className="px-4 py-3 text-gray-300">{item.year || '-'}</td>
                                                        <td className="px-4 py-3 text-gray-300">
                                                            {item.genres.map((g) => g.name).join(', ') || '-'}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                onClick={() => handleAddItem(item)}
                                                                disabled={!canAdd}
                                                                className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ml-auto transition-colors"
                                                                aria-label={
                                                                    alreadyAdded
                                                                        ? `${item.name} already added`
                                                                        : `Add ${item.name}`
                                                                }
                                                            >
                                                                {alreadyAdded ? (
                                                                    <>
                                                                        <CheckCircle size={14} />
                                                                        Added
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Plus size={14} />
                                                                        Add
                                                                    </>
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>

                                {/* Media Pagination */}
                                {mediaTotalPages > 1 && (
                                    <div
                                        className="flex items-center justify-center gap-4"
                                        role="navigation"
                                        aria-label="Media pagination"
                                    >
                                        <button
                                            onClick={() => loadMediaPage(mediaPage - 1, mediaCursors[mediaPage - 1])}
                                            disabled={mediaPage === 0 || isSearchingMedia}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                            aria-label="Previous page"
                                        >
                                            <ChevronLeft size={20} />
                                            Previous
                                        </button>
                                        <span className="text-gray-300">
                                            Page {mediaPage + 1} of {mediaTotalPages}
                                            {mediaTotalCount > 0 && (
                                                <span className="text-xs text-gray-400 ml-2">
                                                    ({mediaTotalCount} items)
                                                </span>
                                            )}
                                        </span>
                                        <button
                                            onClick={() => loadMediaPage(mediaPage + 1, mediaCursors[mediaPage + 1])}
                                            disabled={!mediaHasMore || isSearchingMedia}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                            aria-label="Next page"
                                        >
                                            Next
                                            <ChevronRight size={20} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* User Results */}
            {hasSearchedUsers && (
                <div ref={resultsRef} className="space-y-4">
                    <h3 className="text-xl font-bold text-white">Matching Users</h3>

                    {isSearchingUsers ? (
                        <LoadingSkeleton />
                    ) : users.length === 0 ? (
                        <EmptyState type="users" />
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full" role="table">
                                    <thead className="bg-gray-700 text-gray-300 text-sm">
                                        <tr>
                                            <th scope="col" className="px-4 py-3 text-left">
                                                Username
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left">
                                                Role
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left">
                                                Email
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-center">
                                                Ratings
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-center">
                                                Followers
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {users.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer transition-colors"
                                                onClick={() => onViewUser(user.id)}
                                            >
                                                <td className="px-4 py-3 text-white font-medium">{user.username}</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs font-medium ${user.role === 'ADMIN'
                                                                ? 'bg-purple-600 text-white'
                                                                : 'bg-gray-700 text-gray-200'
                                                            }`}
                                                    >
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400">
                                                    {user.email || <span className="text-gray-600">Hidden</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-300">
                                                    {user.ratingsCount}
                                                </td>
                                                <td className="px-4 py-3 text-center text-gray-300">
                                                    {user.followersCount}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* User Pagination */}
                            {userTotalPages > 1 && (
                                <div
                                    className="flex items-center justify-center gap-4"
                                    role="navigation"
                                    aria-label="User pagination"
                                >
                                    <button
                                        onClick={() => handleSearchUsers(userPage - 1)}
                                        disabled={userPage === 0 || isSearchingUsers}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                        aria-label="Previous page"
                                    >
                                        <ChevronLeft size={20} />
                                        Previous
                                    </button>
                                    <span className="text-gray-300">
                                        Page {userPage + 1} of {userTotalPages}
                                    </span>
                                    <button
                                        onClick={() => handleSearchUsers(userPage + 1)}
                                        disabled={userPage >= userTotalPages - 1 || isSearchingUsers}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                        aria-label="Next page"
                                    >
                                        Next
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Rating Range Modal */}
            <RatingRangeModal
                isOpen={showRangeModal}
                item={selectedMediaItem}
                onConfirm={handleConfirmRange}
                onCancel={() => {
                    setShowRangeModal(false);
                    setSelectedMediaItem(null);
                }}
            />
        </div>
    );
};