import React, { useState, useEffect, createContext, useContext } from 'react';
import { Search, Plus, Edit2, Trash2, Bell, Users, Upload, LogOut, X, ChevronDown, Filter, Eye, EyeOff, Star, UserPlus, UserMinus, Settings } from 'lucide-react';

// ==================== TYPES ====================
interface User {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

interface Genre {
  id: number;
  name: string;
}

interface Platform {
  id: number;
  name: string;
}

interface MediaItem {
  id: number;
  category: 'MOVIE' | 'SERIES' | 'GAME';
  name: string;
  year?: number;
  genres: Genre[];
  platforms: Platform[];
  createdAt?: string;
  updatedAt?: string;
}

interface UserMediaListItem {
  id: number;
  mediaItem: MediaItem;
  experienced: boolean;
  wishToReexperience: boolean;
  rating?: number;
  comment?: string;
  addedAt: string;
  updatedAt: string;
}

interface Notification {
  id: number;
  message: string;
  mediaItem: MediaItem;
  rating: number;
  ratedByUser: User;
  isRead: boolean;
  createdAt: string;
}

interface UserFollow {
  id: number;
  user: User;
  minimumRatingThreshold: number;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

// ==================== API CLIENT ====================
const API_BASE = 'http://localhost:8080/media-tracker';

class ApiClient {
  private getHeaders(includeAuth = true): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    
    return headers;
  }

  async login(username: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ username, password }),
    });
    
    if (!res.ok) throw new Error('Login failed');
    return res.json();
  }

  async register(username: string, email: string, password: string) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: this.getHeaders(false),
      body: JSON.stringify({ username, email, password }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Registration failed');
    }
    return res.json();
  }

  // Media Items
  async searchMediaItems(query: string, category?: string, page = 0, size = 20): Promise<MediaItem[]> {
    const params = new URLSearchParams({
      query,
      page: page.toString(),
      size: size.toString(),
    });
    
    if (category) params.append('category', category);
    
    const res = await fetch(`${API_BASE}/user/media-items/search?${params}`, {
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Search failed');
    return res.json();
  }

  // User Media List
  async getMyMediaList(page = 0, size = 100): Promise<UserMediaListItem[]> {
    const res = await fetch(`${API_BASE}/user/my-list?page=${page}&size=${size}`, {
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to fetch list');
    return res.json();
  }

  async addToMyList(mediaItemId: number): Promise<UserMediaListItem> {
    const res = await fetch(`${API_BASE}/user/my-list`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ mediaItemId }),
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.message || 'Failed to add item');
    }
    return res.json();
  }

  async updateMyListItem(id: number, data: Partial<UserMediaListItem>): Promise<UserMediaListItem> {
    const res = await fetch(`${API_BASE}/user/my-list/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!res.ok) throw new Error('Failed to update item');
    return res.json();
  }

  async removeFromMyList(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/user/my-list/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to remove item');
  }

  // Notifications
  async getNotifications(onlyUnread = false): Promise<Notification[]> {
    const res = await fetch(`${API_BASE}/notifications?onlyUnread=${onlyUnread}`, {
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to fetch notifications');
    return res.json();
  }

  async markNotificationAsRead(id: number): Promise<Notification> {
    const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to mark as read');
    return res.json();
  }

  async markAllNotificationsAsRead(): Promise<void> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: 'PUT',
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to mark all as read');
  }

  async getUnreadCount(): Promise<number> {
    const res = await fetch(`${API_BASE}/notifications/unread-count`, {
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to get unread count');
    const data = await res.json();
    return data.unreadCount;
  }

  // Follow
  async followUser(userId: number, threshold: number): Promise<UserFollow> {
    const res = await fetch(`${API_BASE}/user/follow`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ userId, minimumRatingThreshold: threshold }),
    });
    
    if (!res.ok) throw new Error('Failed to follow user');
    return res.json();
  }

  async unfollowUser(userId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/user/follow/${userId}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to unfollow user');
  }

  async getFollowing(): Promise<UserFollow[]> {
    const res = await fetch(`${API_BASE}/user/following`, {
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to fetch following');
    return res.json();
  }

  async getFollowers(): Promise<User[]> {
    const res = await fetch(`${API_BASE}/user/followers`, {
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to fetch followers');
    return res.json();
  }

  // Admin endpoints
  async getAllGenres(): Promise<Genre[]> {
    const res = await fetch(`${API_BASE}/admin/genres`, {
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to fetch genres');
    return res.json();
  }

  async getAllPlatforms(): Promise<Platform[]> {
    const res = await fetch(`${API_BASE}/admin/platforms`, {
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to fetch platforms');
    return res.json();
  }

  async createMediaItem(data: any): Promise<MediaItem> {
    const res = await fetch(`${API_BASE}/admin/media-items`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!res.ok) throw new Error('Failed to create media item');
    return res.json();
  }

  async updateMediaItem(id: number, data: any): Promise<MediaItem> {
    const res = await fetch(`${API_BASE}/admin/media-items/${id}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });
    
    if (!res.ok) throw new Error('Failed to update media item');
    return res.json();
  }

  async deleteMediaItem(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/admin/media-items/${id}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to delete media item');
  }

  async uploadCSV(file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_BASE}/admin/media-items/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!res.ok) throw new Error('Failed to upload CSV');
    return res.json();
  }

  async getJobStatus(jobId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/admin/media-items/import-status/${jobId}`, {
      headers: this.getHeaders(),
    });
    
    if (!res.ok) throw new Error('Failed to get job status');
    return res.json();
  }
}

const api = new ApiClient();

// ==================== AUTH CONTEXT ====================
const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.login(username, password);
    
    setToken(response.accessToken);
    const userData: User = {
      id: response.userId,
      username: response.username,
      email: response.email,
      role: response.role,
    };
    setUser(userData);
    
    localStorage.setItem('token', response.accessToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const register = async (username: string, email: string, password: string) => {
    await api.register(username, email, password);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// ==================== COMPONENTS ====================

// Login/Register Component
const AuthPage: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, email, password);
        setIsLogin(true);
        setError('Registration successful! Please login.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
        <h1 className="text-3xl font-bold text-white mb-6 text-center">
          Media Tracker
        </h1>
        
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 rounded ${
              isLogin ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 rounded ${
              !isLogin ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm text-gray-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-gray-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {error && (
            <div className={`p-3 rounded text-sm ${
              error.includes('successful') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
            }`}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50"
          >
            {loading ? 'Loading...' : isLogin ? 'Login' : 'Register'}
          </button>
        </form>
      </div>
    </div>
  );
};

// Truncated List Display
const TruncatedList: React.FC<{ items: string[]; maxVisible?: number }> = ({ 
  items, 
  maxVisible = 2 
}) => {
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

// Star Rating Component
const StarRating: React.FC<{ 
  rating?: number; 
  onChange?: (rating: number) => void;
  readonly?: boolean;
}> = ({ rating, onChange, readonly = false }) => {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[...Array(10)].map((_, i) => {
        const ratingValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            onClick={() => !readonly && onChange?.(ratingValue)}
            onMouseEnter={() => !readonly && setHover(ratingValue)}
            onMouseLeave={() => !readonly && setHover(0)}
            disabled={readonly}
            className={`${readonly ? 'cursor-default' : 'cursor-pointer'}`}
          >
            <Star
              size={16}
              className={`${
                ratingValue <= (hover || rating || 0)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-600'
              }`}
            />
          </button>
        );
      })}
      {rating && <span className="ml-2 text-sm text-gray-400">{rating}/10</span>}
    </div>
  );
};

// My Media List Component
const MyMediaList: React.FC = () => {
  const [items, setItems] = useState<UserMediaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterExperienced, setFilterExperienced] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('name');
  const [editingComment, setEditingComment] = useState<string>('');

  useEffect(() => {
    loadList();
  }, []);

  const loadList = async () => {
    try {
      const data = await api.getMyMediaList();
      setItems(data);
    } catch (error) {
      console.error('Failed to load list', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (item: UserMediaListItem) => {
    setEditingId(item.id);
    setEditingComment(item.comment || '');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingComment('');
  };

  const handleUpdate = async (id: number, updates: Partial<UserMediaListItem>) => {
    try {
      await api.updateMyListItem(id, updates);
      await loadList();
      setEditingId(null);
      setEditingComment('');
    } catch (error) {
      console.error('Failed to update item', error);
    }
  };

  const handleSaveComment = async (id: number) => {
    await handleUpdate(id, { comment: editingComment });
  };

  const handleRemove = async (id: number) => {
    if (!window.confirm('Remove this item from your list?')) return;
    
    try {
      await api.removeFromMyList(id);
      await loadList();
    } catch (error) {
      console.error('Failed to remove item', error);
    }
  };

  const filteredItems = items
    .filter(item => {
      if (filterCategory && item.mediaItem.category !== filterCategory) return false;
      if (filterExperienced === 'true' && !item.experienced) return false;
      if (filterExperienced === 'false' && item.experienced) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.mediaItem.name.localeCompare(b.mediaItem.name);
        case 'category':
          return a.mediaItem.category.localeCompare(b.mediaItem.category);
        case 'rating':
          return (b.rating || 0) - (a.rating || 0);
        case 'addedAt':
          return new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime();
        default:
          return 0;
      }
    });

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading your list...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
        >
          <option value="">All Categories</option>
          <option value="MOVIE">Movie</option>
          <option value="SERIES">Series</option>
          <option value="GAME">Game</option>
        </select>

        <select
          value={filterExperienced}
          onChange={(e) => setFilterExperienced(e.target.value)}
          className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
        >
          <option value="">All Status</option>
          <option value="true">Experienced</option>
          <option value="false">Not Experienced</option>
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
        >
          <option value="name">Sort by Name</option>
          <option value="category">Sort by Category</option>
          <option value="rating">Sort by Rating</option>
          <option value="addedAt">Sort by Date Added</option>
        </select>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          No items in your list. Search and add some media!
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700 text-gray-300 text-sm">
              <tr>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Year</th>
                <th className="px-4 py-3 text-left">Genre</th>
                <th className="px-4 py-3 text-left">Platform</th>
                <th className="px-4 py-3 text-center">Experienced</th>
                <th className="px-4 py-3 text-center">Re-experience</th>
                <th className="px-4 py-3 text-left">Rating</th>
                <th className="px-4 py-3 text-left">Comment</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800">
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 rounded text-xs bg-gray-700 text-gray-200">
                      {item.mediaItem.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-white font-medium">{item.mediaItem.name}</td>
                  <td className="px-4 py-3 text-gray-300">{item.mediaItem.year || '-'}</td>
                  <td className="px-4 py-3">
                    <TruncatedList items={item.mediaItem.genres.map(g => g.name)} />
                  </td>
                  <td className="px-4 py-3">
                    <TruncatedList items={item.mediaItem.platforms.map(p => p.name)} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === item.id ? (
                      <input
                        type="checkbox"
                        checked={item.experienced}
                        onChange={(e) => handleUpdate(item.id, { experienced: e.target.checked })}
                        className="w-4 h-4"
                      />
                    ) : (
                      <span>{item.experienced ? '✓' : '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {editingId === item.id && item.experienced ? (
                      <input
                        type="checkbox"
                        checked={item.wishToReexperience}
                        onChange={(e) => handleUpdate(item.id, { wishToReexperience: e.target.checked })}
                        className="w-4 h-4"
                      />
                    ) : (
                      <span>{item.wishToReexperience ? '✓' : '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === item.id && item.experienced ? (
                      <StarRating
                        rating={item.rating}
                        onChange={(rating) => handleUpdate(item.id, { rating })}
                      />
                    ) : (
                      <StarRating rating={item.rating} readonly />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={100}
                          value={editingComment}
                          onChange={(e) => setEditingComment(e.target.value)}
                          placeholder="Add comment..."
                          className="flex-1 px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 text-sm"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveComment(item.id);
                            }
                          }}
                        />
                        <button
                          onClick={() => handleSaveComment(item.id)}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                          title="Save comment"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-300">{item.comment || '-'}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex gap-2 justify-end">
                      {editingId === item.id ? (
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 hover:bg-gray-700 rounded"
                        >
                          <X size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartEdit(item)}
                          className="p-1 hover:bg-gray-700 rounded text-blue-400"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1 hover:bg-gray-700 rounded text-red-400"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Search Media Component
const SearchMedia: React.FC = () => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const data = await api.searchMediaItems(query, category || undefined);
      setResults(data);
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (mediaItemId: number) => {
    try {
      await api.addToMyList(mediaItemId);
      alert('Added to your list!');
    } catch (error: any) {
      alert(error.message || 'Failed to add item');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search for movies, series, or games..."
          className="flex-1 px-4 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 bg-gray-700 text-white rounded border border-gray-600"
        >
          <option value="">All Categories</option>
          <option value="MOVIE">Movie</option>
          <option value="SERIES">Series</option>
          <option value="GAME">Game</option>
        </select>
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-50"
        >
          <Search size={20} />
        </button>
      </div>

      {loading && <div className="text-center py-8 text-gray-400">Searching...</div>}

      {!loading && results.length > 0 && (
        <div className="grid gap-3">
          {results.map((item) => (
            <div key={item.id} className="bg-gray-800 p-4 rounded border border-gray-700 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 bg-gray-700 text-xs rounded">{item.category}</span>
                  <h3 className="text-white font-medium">{item.name}</h3>
                  {item.year && <span className="text-gray-400 text-sm">({item.year})</span>}
                </div>
                <div className="text-sm text-gray-400 space-y-1">
                  <div>
                    <span className="font-medium">Genres:</span>{' '}
                    <TruncatedList items={item.genres.map(g => g.name)} />
                  </div>
                  <div>
                    <span className="font-medium">Platforms:</span>{' '}
                    <TruncatedList items={item.platforms.map(p => p.name)} />
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleAdd(item.id)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium flex items-center gap-2"
              >
                <Plus size={16} />
                Add
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && query && results.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No results found. Try a different search term.
        </div>
      )}
    </div>
  );
};

// Notifications Component
const NotificationsPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [showUnreadOnly]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications(showUnreadOnly);
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationAsRead(id);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark as read', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.markAllNotificationsAsRead();
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Notifications</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 border-b border-gray-700 flex gap-2 justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`px-3 py-1 rounded text-sm ${
                showUnreadOnly ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
              }`}
            >
              {showUnreadOnly ? 'Show All' : 'Unread Only'}
            </button>
          </div>
          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
          >
            Mark All Read
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-400">Loading...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No notifications</div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-4 rounded border ${
                    notif.isRead
                      ? 'bg-gray-800 border-gray-700'
                      : 'bg-gray-750 border-blue-500'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-white">{notif.message}</p>
                      <p className="text-sm text-gray-400 mt-1">
                        {new Date(notif.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notif.isRead && (
                      <button
                        onClick={() => handleMarkAsRead(notif.id)}
                        className="ml-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                      >
                        Mark Read
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <StarRating rating={notif.rating} readonly />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Follow Management Component
const FollowManagement: React.FC = () => {
  const [following, setFollowing] = useState<UserFollow[]>([]);
  const [followers, setFollowers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'following' | 'followers'>('following');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [followingData, followersData] = await Promise.all([
        api.getFollowing(),
        api.getFollowers(),
      ]);
      setFollowing(followingData);
      setFollowers(followersData);
    } catch (error) {
      console.error('Failed to load follow data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async (userId: number) => {
    if (!window.confirm('Unfollow this user?')) return;
    
    try {
      await api.unfollowUser(userId);
      await loadData();
    } catch (error) {
      console.error('Failed to unfollow', error);
    }
  };

  if (loading) {
    return <div className="text-center py-8 text-gray-400">Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('following')}
          className={`px-4 py-2 rounded ${
            activeTab === 'following'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Following ({following.length})
        </button>
        <button
          onClick={() => setActiveTab('followers')}
          className={`px-4 py-2 rounded ${
            activeTab === 'followers'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Followers ({followers.length})
        </button>
      </div>

      {activeTab === 'following' ? (
        <div className="space-y-3">
          {following.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              You're not following anyone yet
            </div>
          ) : (
            following.map((follow) => (
              <div
                key={follow.id}
                className="bg-gray-800 p-4 rounded border border-gray-700 flex justify-between items-center"
              >
                <div>
                  <p className="text-white font-medium">{follow.user.username}</p>
                  <p className="text-sm text-gray-400">
                    Notify when rating ≥ {follow.minimumRatingThreshold}
                  </p>
                </div>
                <button
                  onClick={() => handleUnfollow(follow.user.id)}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
                >
                  Unfollow
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {followers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              No followers yet
            </div>
          ) : (
            followers.map((user) => (
              <div
                key={user.id}
                className="bg-gray-800 p-4 rounded border border-gray-700"
              >
                <p className="text-white font-medium">{user.username}</p>
                <p className="text-sm text-gray-400">{user.email}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Admin Panel Component
const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'upload'>('create');
  const [genres, setGenres] = useState<Genre[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  
  // Create form state
  const [category, setCategory] = useState<'MOVIE' | 'SERIES' | 'GAME'>('MOVIE');
  const [name, setName] = useState('');
  const [year, setYear] = useState<string>('');
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<number[]>([]);
  
  // CSV upload state
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [jobStatus, setJobStatus] = useState<any>(null);

  useEffect(() => {
    loadGenresAndPlatforms();
  }, []);

  const loadGenresAndPlatforms = async () => {
    try {
      const [genresData, platformsData] = await Promise.all([
        api.getAllGenres(),
        api.getAllPlatforms(),
      ]);
      setGenres(genresData);
      setPlatforms(platformsData);
    } catch (error) {
      console.error('Failed to load genres/platforms', error);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await api.createMediaItem({
        category,
        name,
        year: year ? parseInt(year) : null,
        genreIds: selectedGenres,
        platformIds: selectedPlatforms,
      });
      
      alert('Media item created successfully!');
      setName('');
      setYear('');
      setSelectedGenres([]);
      setSelectedPlatforms([]);
    } catch (error: any) {
      alert(error.message || 'Failed to create item');
    }
  };

  const handleUploadCSV = async () => {
    if (!file) return;
    
    try {
      const response = await api.uploadCSV(file);
      setJobId(response.jobExecutionId);
      alert('CSV upload started!');
      
      // Poll for status
      const interval = setInterval(async () => {
        try {
          const status = await api.getJobStatus(response.jobExecutionId);
          setJobStatus(status);
          
          if (status.status === 'COMPLETED' || status.status === 'FAILED') {
            clearInterval(interval);
          }
        } catch (error) {
          clearInterval(interval);
        }
      }, 2000);
    } catch (error: any) {
      alert(error.message || 'Failed to upload CSV');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('create')}
          className={`px-4 py-2 rounded ${
            activeTab === 'create'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Create Item
        </button>
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 rounded ${
            activeTab === 'upload'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300'
          }`}
        >
          Upload CSV
        </button>
      </div>

      {activeTab === 'create' ? (
        <form onSubmit={handleCreateItem} className="space-y-4 bg-gray-800 p-6 rounded border border-gray-700">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            >
              <option value="MOVIE">Movie</option>
              <option value="SERIES">Series</option>
              <option value="GAME">Game</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Year (Optional)</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g., 1999"
              min="1800"
              max="2100"
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Genres</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded">
              {genres.map((genre) => (
                <label key={genre.id} className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={selectedGenres.includes(genre.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedGenres([...selectedGenres, genre.id]);
                      } else {
                        setSelectedGenres(selectedGenres.filter(id => id !== genre.id));
                      }
                    }}
                  />
                  {genre.name}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Platforms</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-700 rounded">
              {platforms.map((platform) => (
                <label key={platform.id} className="flex items-center gap-2 text-white">
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPlatforms([...selectedPlatforms, platform.id]);
                      } else {
                        setSelectedPlatforms(selectedPlatforms.filter(id => id !== platform.id));
                      }
                    }}
                  />
                  {platform.name}
                </label>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium"
          >
            Create Media Item
          </button>
        </form>
      ) : (
        <div className="space-y-4 bg-gray-800 p-6 rounded border border-gray-700">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Upload CSV File
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600"
            />
            <p className="text-xs text-gray-400 mt-2">
              CSV format: category, name, year, genres (comma-separated), platforms (comma-separated)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Example: MOVIE,The Matrix,1999,Action|Sci-Fi,Netflix|Amazon Prime
            </p>
          </div>

          <button
            onClick={handleUploadCSV}
            disabled={!file}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-medium disabled:opacity-50"
          >
            <Upload className="inline mr-2" size={16} />
            Upload CSV
          </button>

          {jobStatus && (
            <div className="mt-4 p-4 bg-gray-700 rounded">
              <h3 className="font-medium text-white mb-2">Job Status</h3>
              <div className="space-y-1 text-sm">
                <p className="text-gray-300">Status: <span className="text-white">{jobStatus.status}</span></p>
                <p className="text-gray-300">Read: <span className="text-white">{jobStatus.readCount}</span></p>
                <p className="text-gray-300">Written: <span className="text-white">{jobStatus.writeCount}</span></p>
                <p className="text-gray-300">Skipped: <span className="text-white">{jobStatus.skipCount}</span></p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main App Component
const App: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const [activeView, setActiveView] = useState<'myList' | 'search' | 'follow' | 'admin'>('myList');
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (user) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000); // Poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUnreadCount = async () => {
    try {
      const count = await api.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Failed to load unread count', error);
    }
  };

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold">Media Tracker</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">
              {user.username}
              {isAdmin && <span className="ml-2 px-2 py-1 bg-purple-600 text-xs rounded">ADMIN</span>}
            </span>
            <button
              onClick={() => setShowNotifications(true)}
              className="relative p-2 hover:bg-gray-700 rounded"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-0 right-0 bg-red-500 text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={logout}
              className="p-2 hover:bg-gray-700 rounded"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveView('myList')}
              className={`px-4 py-3 font-medium whitespace-nowrap ${
                activeView === 'myList'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              My List
            </button>
            <button
              onClick={() => setActiveView('search')}
              className={`px-4 py-3 font-medium whitespace-nowrap ${
                activeView === 'search'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Search Media
            </button>
            <button
              onClick={() => setActiveView('follow')}
              className={`px-4 py-3 font-medium whitespace-nowrap ${
                activeView === 'follow'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Follow
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveView('admin')}
                className={`px-4 py-3 font-medium whitespace-nowrap ${
                  activeView === 'admin'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Admin Panel
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {activeView === 'myList' && <MyMediaList />}
        {activeView === 'search' && <SearchMedia />}
        {activeView === 'follow' && <FollowManagement />}
        {activeView === 'admin' && isAdmin && <AdminPanel />}
      </main>

      {/* Notifications Modal */}
      {showNotifications && (
        <NotificationsPanel onClose={() => {
          setShowNotifications(false);
          loadUnreadCount();
        }} />
      )}
    </div>
  );
};

// Root Component
const Root: React.FC = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default Root;