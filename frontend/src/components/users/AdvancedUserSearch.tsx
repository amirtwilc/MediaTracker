import React, { useState } from 'react';
import { Search, Plus, X } from 'lucide-react';
import { MediaItem, UserProfile } from '../../types';
import { api } from '../../services/api';
import { getCategoryColor } from '../../utils/categoryColors';

const MAX_ITEMS = 5;

interface RatingCriteria {
    mediaItem: MediaItem;
    minRating: number;
    maxRating: number;
}

interface AdvancedUserSearchProps {
    onViewUser: (userId: number) => void;
}

export const AdvancedUserSearch: React.FC<AdvancedUserSearchProps> = ({ onViewUser }) => {
    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [mediaSearchResults, setMediaSearchResults] = useState<MediaItem[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    // Media pagination state
    const [mediaCursors, setMediaCursors] = useState<Array<{ name: string; id: number } | null>>([null]);
    const [mediaCurrentPage, setMediaCurrentPage] = useState(0);
    const [mediaTotalPages, setMediaTotalPages] = useState(0);
    const [mediaTotalCount, setMediaTotalCount] = useState(0);
    const [mediaHasNextPage, setMediaHasNextPage] = useState(false);
    const [mediaHasPrevPage, setMediaHasPrevPage] = useState(false);

    // Selected items with rating criteria
    const [selectedCriteria, setSelectedCriteria] = useState<RatingCriteria[]>([]);

    // Range selection modal
    const [rangeModal, setRangeModal] = useState<{ show: boolean; item: MediaItem | null }>({
        show: false,
        item: null,
    });
    const [minRating, setMinRating] = useState(1);
    const [maxRating, setMaxRating] = useState(10);
    const [hasSearchedUsers, setHasSearchedUsers] = useState(false);

    // User results
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [userLoading, setUserLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);

    // User search filters
    const [userAdminOnly, setUserAdminOnly] = useState<boolean | undefined>(undefined);
    const [userSortConfig, setUserSortConfig] = useState({ by: 'lastActive', direction: 'desc' });

    const resultsRef = React.useRef<HTMLDivElement>(null);

    const handleSearchMedia = async () => {
        setMediaCurrentPage(0);
        setMediaCursors([null]);
        await loadMediaPage(0, null);
    };

    const loadMediaPage = async (pageNum: number, cursor: { name: string; id: number } | null) => {
        setSearchLoading(true);
        setHasSearched(true);

        try {
            const response = await api.searchMediaItemsGraphQL({
                query: searchQuery || '',
                cursorName: cursor?.name,
                cursorId: cursor?.id,
                limit: 20,
            });

            setMediaSearchResults(response.items);
            setMediaHasNextPage(response.hasMore);
            setMediaHasPrevPage(pageNum > 0);
            setMediaCurrentPage(pageNum);
            setMediaTotalCount(response.totalCount);
            setMediaTotalPages(Math.ceil(response.totalCount / 20));

            // Store next cursor if available
            if (response.hasMore && response.nextCursor) {
                setMediaCursors(prev => {
                    const newCursors = [...prev];
                    if (pageNum + 1 >= newCursors.length) {
                        newCursors.push(response.nextCursor!);
                    }
                    return newCursors;
                });
            }
        } catch (error) {
            console.error('Search failed', error);
            setMediaSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleMediaNextPage = () => {
        if (mediaHasNextPage && mediaCurrentPage + 1 < mediaCursors.length) {
            loadMediaPage(mediaCurrentPage + 1, mediaCursors[mediaCurrentPage + 1]);
        }
    };

    const handleMediaPrevPage = () => {
        if (mediaCurrentPage > 0) {
            loadMediaPage(mediaCurrentPage - 1, mediaCursors[mediaCurrentPage - 1]);
        }
    };

    const handleAddItem = (item: MediaItem) => {
        setRangeModal({ show: true, item });
        setMinRating(1);
        setMaxRating(10);
    };

    const handleConfirmRange = () => {
        if (rangeModal.item && selectedCriteria.length < MAX_ITEMS) {
            setSelectedCriteria([
                ...selectedCriteria,
                {
                    mediaItem: rangeModal.item,
                    minRating,
                    maxRating,
                },
            ]);
            setRangeModal({ show: false, item: null });
        }
    };

    const handleRemoveCriteria = (index: number) => {
        setSelectedCriteria(selectedCriteria.filter((_, i) => i !== index));
    };

    const handleUpdateRange = (index: number, min: number, max: number) => {
        const updated = [...selectedCriteria];
        updated[index] = { ...updated[index], minRating: min, maxRating: max };
        setSelectedCriteria(updated);
    };

    const handleSearchUsers = async (page: number = 0) => {
        if (selectedCriteria.length === 0) return;

        setHasSearchedUsers(true);
        setUserLoading(true);
        setCurrentPage(page);

        try {
            const request = {
                itemRatingCriteria: selectedCriteria.map(c => ({
                    mediaItemId: c.mediaItem.id,
                    minRating: c.minRating,
                    maxRating: c.maxRating,
                })),
                sortBy: userSortConfig.by,
                sortDirection: userSortConfig.direction,
                page,
                size: 20,
            };

            const response = await api.searchUsersAdvanced(request);
            setUsers(response.content);
            setTotalPages(response.totalPages);

            // Scroll to results
            setTimeout(() => {
                resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);

        } catch (error) {
            console.error('Failed to search users', error);
        } finally {
            setUserLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Selected Criteria Display */}
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
                                className="flex items-center justify-between bg-gray-700 p-3 rounded"
                            >
                                <div className="flex-1">
                                    <p className="text-white font-medium">{criteria.mediaItem.name}</p>
                                    <p className="text-sm text-gray-400">
                                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(criteria.mediaItem.category)} text-white mr-2`}>
                                            {criteria.mediaItem.category}
                                        </span>
                                        {criteria.mediaItem.year || 'N/A'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={criteria.minRating}
                                            onChange={(e) =>
                                                handleUpdateRange(index, Number(e.target.value), criteria.maxRating)
                                            }
                                            className="w-16 px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                        />
                                        <span className="text-gray-400">to</span>
                                        <input
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={criteria.maxRating}
                                            onChange={(e) =>
                                                handleUpdateRange(index, criteria.minRating, Number(e.target.value))
                                            }
                                            className="w-16 px-2 py-1 bg-gray-600 text-white rounded text-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveCriteria(index)}
                                        className="p-1 hover:bg-gray-600 rounded text-red-400"
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
                    />
                    <button
                        onClick={handleSearchMedia}
                        disabled={searchLoading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
                    >
                        <Search size={20} />
                    </button>
                </div>

                {/* Media Search Results */}
                {hasSearched && (
                    <div className="overflow-x-auto">
                        {searchLoading ? (
                            <div className="text-center py-8 text-gray-400">Loading...</div>
                        ) : mediaSearchResults.length === 0 ? (
                            <div className="text-center py-8 text-gray-400">No results found.</div>
                        ) : (
                            <>
                                <table className="w-full">
                                    <thead className="bg-gray-700 text-gray-300 text-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Category</th>
                                            <th className="px-4 py-3 text-left">Name</th>
                                            <th className="px-4 py-3 text-left">Year</th>
                                            <th className="px-4 py-3 text-left">Genre</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {mediaSearchResults.map((item) => {
                                            const alreadyAdded = selectedCriteria.some(c => c.mediaItem.id === item.id);
                                            return (
                                                <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800">
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(item.category)} text-white`}>
                                                            {item.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-white font-medium">{item.name}</td>
                                                    <td className="px-4 py-3 text-gray-300">{item.year || '-'}</td>
                                                    <td className="px-4 py-3 text-gray-300">
                                                        {item.genres.map(g => g.name).join(', ')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            onClick={() => handleAddItem(item)}
                                                            disabled={alreadyAdded || selectedCriteria.length >= MAX_ITEMS}
                                                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 ml-auto"
                                                        >
                                                            <Plus size={14} />
                                                            {alreadyAdded ? 'Added' : 'Add'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>

                                {/* Media Pagination */}
                                {mediaTotalPages > 1 && (
                                    <div className="flex items-center justify-center gap-4 mt-4">
                                        <button
                                            onClick={handleMediaPrevPage}
                                            disabled={!mediaHasPrevPage || searchLoading}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Previous
                                        </button>
                                        <span className="text-gray-300">
                                            Page {mediaCurrentPage + 1} of {mediaTotalPages}
                                            {mediaTotalCount > 0 && (
                                                <span className="text-xs text-gray-400 ml-2">
                                                    ({mediaTotalCount} items)
                                                </span>
                                            )}
                                        </span>
                                        <button
                                            onClick={handleMediaNextPage}
                                            disabled={!mediaHasNextPage || searchLoading}
                                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            Next
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

                    {userLoading ? (
                        <div className="text-center py-8 text-gray-400">Searching users...</div>
                    ) : users.length === 0 ? (
                        <div className="bg-gray-800 p-8 rounded border border-gray-700 text-center">
                            <p className="text-gray-300 text-lg mb-2">No users found</p>
                            <p className="text-gray-400">No users match these rating criteria. Try adjusting the rating ranges.</p>
                        </div>
                    ) : (
                        <>
                            {/* User filters and sorting - similar to UserSearch component */}
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-700 text-gray-300 text-sm">
                                        <tr>
                                            <th className="px-4 py-3 text-left">Username</th>
                                            <th className="px-4 py-3 text-left">Role</th>
                                            <th className="px-4 py-3 text-left">Email</th>
                                            <th className="px-4 py-3 text-center">Ratings</th>
                                            <th className="px-4 py-3 text-center">Followers</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {users.map((user) => (
                                            <tr
                                                key={user.id}
                                                className="border-b border-gray-700 hover:bg-gray-800 cursor-pointer"
                                                onClick={() => onViewUser(user.id)}
                                            >
                                                <td className="px-4 py-3 text-white font-medium">{user.username}</td>
                                                <td className="px-4 py-3">
                                                    <span
                                                        className={`px-2 py-1 rounded text-xs ${user.role === 'ADMIN'
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
                                                <td className="px-4 py-3 text-center text-gray-300">{user.ratingsCount}</td>
                                                <td className="px-4 py-3 text-center text-gray-300">{user.followersCount}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4">
                                    <button
                                        onClick={() => handleSearchUsers(currentPage - 1)}
                                        disabled={currentPage === 0}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-gray-300">
                                        Page {currentPage + 1} of {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handleSearchUsers(currentPage + 1)}
                                        disabled={currentPage >= totalPages - 1}
                                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded disabled:opacity-50"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Range Selection Modal */}
            {rangeModal.show && rangeModal.item && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
                        <h3 className="text-xl font-bold text-white mb-4">Select Rating Range</h3>
                        <p className="text-gray-300 mb-2">{rangeModal.item.name}</p>
                        <p className="text-sm text-gray-400 mb-6">
                            Find users who rated this item within this range
                        </p>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Minimum Rating:</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={maxRating}
                                    value={minRating}
                                    onChange={(e) => setMinRating(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-300 mb-2">Maximum Rating:</label>
                                <input
                                    type="number"
                                    min={minRating}
                                    max="10"
                                    value={maxRating}
                                    onChange={(e) => setMaxRating(Number(e.target.value))}
                                    className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => setRangeModal({ show: false, item: null })}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmRange}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
                            >
                                Add to Search
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};