import { User, MediaItem, UserMediaListItem, Notification, UserFollow, Genre, Platform } from '../types';

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

  // Media Items (Cursor-based)
  async searchMediaItemsCursor(params: {
    query: string;
    categories?: string[];
    genreIds?: number[];
    platformIds?: number[];
    cursorName?: string;
    cursorId?: number;
    limit?: number;
  }): Promise<{
    items: MediaItem[];
    nextCursor?: { name: string; id: number };
    hasMore: boolean;
    totalCount: number;
  }> {
    const searchParams = new URLSearchParams({
      query: params.query,
      limit: String(params.limit ?? 20),
    });

    params.categories?.forEach(cat =>
      searchParams.append('categories', cat)
    );

    if (params.cursorName && params.cursorId !== undefined) {
      searchParams.append('cursorName', params.cursorName);
      searchParams.append('cursorId', String(params.cursorId));
    }

    params.genreIds?.forEach(id =>
      searchParams.append('genreIds', String(id))
    );

    params.platformIds?.forEach(id =>
      searchParams.append('platformIds', String(id))
    );

    const res = await fetch(
      `${API_BASE}/user/media-items/search?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    );

    if (!res.ok) throw new Error('Search failed');

    return res.json();
  }

  async searchMediaItemsSorted(params: {
    query: string;
    categories?: string[];
    genreIds?: number[];
    platformIds?: number[];
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
  }): Promise<{
    content: MediaItem[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
  }> {
    const searchParams = new URLSearchParams({
      query: params.query,
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
      sortBy: params.sortBy ?? 'name',
      sortDirection: params.sortDirection ?? 'ASC',
    });

    params.categories?.forEach(cat =>
      searchParams.append('categories', cat)
    );

    params.genreIds?.forEach(id =>
      searchParams.append('genreIds', String(id))
    );

    params.platformIds?.forEach(id =>
      searchParams.append('platformIds', String(id))
    );

    const res = await fetch(
      `${API_BASE}/user/media-items/search-sorted?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    );

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

  async getMyMediaListCursor(params: {
    searchQuery?: string;
    categories?: string[];
    genreIds?: number[];
    platformIds?: number[];
    wishToExperience?: boolean;
    cursorName?: string;
    cursorId?: number;
    limit?: number;
  }): Promise<{
    items: UserMediaListItem[];
    nextCursor?: { name: string; id: number };
    hasMore: boolean;
    totalCount: number;
  }> {
    const searchParams = new URLSearchParams({
      limit: String(params.limit ?? 20),
    });

    if (params.searchQuery) {
      searchParams.append('searchQuery', params.searchQuery);
    }

    params.categories?.forEach(cat =>
      searchParams.append('categories', cat)
    );

    if (params.wishToExperience !== undefined) {
      searchParams.append('wishToExperience', String(params.wishToExperience));
    }

    if (params.cursorName && params.cursorId !== undefined) {
      searchParams.append('cursorName', params.cursorName);
      searchParams.append('cursorId', String(params.cursorId));
    }

    params.genreIds?.forEach(id =>
      searchParams.append('genreIds', String(id))
    );

    params.platformIds?.forEach(id =>
      searchParams.append('platformIds', String(id))
    );

    const res = await fetch(
      `${API_BASE}/user/my-list/cursor?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    );

    if (!res.ok) throw new Error('Failed to fetch list');

    const data = await res.json();
    return {
      items: data.items,
      nextCursor: data.nextCursor,
      hasMore: data.hasMore,
      totalCount: data.totalCount,
    };
  }

  async getMyMediaListSorted(params: {
    searchQuery?: string;
    categories?: string[];
    genreIds?: number[];
    platformIds?: number[];
    wishToExperience?: boolean;
    page?: number;
    size?: number;
    sortBy?: string;
    sortDirection?: string;
  }): Promise<{
    content: UserMediaListItem[];
    totalPages: number;
    totalElements: number;
    number: number;
    size: number;
  }> {
    const searchParams = new URLSearchParams({
      page: String(params.page ?? 0),
      size: String(params.size ?? 20),
      sortBy: params.sortBy ?? 'name',
      sortDirection: params.sortDirection ?? 'ASC',
    });

    if (params.searchQuery) {
      searchParams.append('searchQuery', params.searchQuery);
    }

    params.categories?.forEach(cat =>
      searchParams.append('categories', cat)
    );

    if (params.wishToExperience !== undefined) {
      searchParams.append('wishToExperience', String(params.wishToExperience));
    }

    params.genreIds?.forEach(id =>
      searchParams.append('genreIds', String(id))
    );

    params.platformIds?.forEach(id =>
      searchParams.append('platformIds', String(id))
    );

    const res = await fetch(
      `${API_BASE}/user/my-list/sorted?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    );

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

  async updateFollowThreshold(userId: number, threshold: number): Promise<UserFollow> {
    const res = await fetch(`${API_BASE}/user/follow/${userId}/threshold`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify({ threshold }),
    });

    if (!res.ok) throw new Error('Failed to update threshold');
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

  async searchUsers(request: any, page = 0, size = 20): Promise<any> {
    const res = await fetch(`${API_BASE}/users/search?page=${page}&size=${size}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(request),
    });

    if (!res.ok) throw new Error('Failed to search users');
    return res.json();
  }

  async getUserProfile(userId: number): Promise<any> {
    const res = await fetch(`${API_BASE}/users/${userId}/profile`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) throw new Error('Failed to fetch user profile');
    return res.json();
  }

  async getUserMediaList(userId: number, page = 0, size = 100): Promise<any> {
    const res = await fetch(`${API_BASE}/users/${userId}/list?page=${page}&size=${size}`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) throw new Error('Failed to fetch user list');
    return res.json();
  }

  async getUserSettings(): Promise<any> {
    const res = await fetch(`${API_BASE}/users/settings`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  }

  async updateUserSettings(settings: any): Promise<any> {
    const res = await fetch(`${API_BASE}/users/settings`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(settings),
    });

    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  }

  async getMyListGenres(params?: {
    searchQuery?: string;
    categories?: string[];
  }): Promise<Genre[]> {
    const searchParams = new URLSearchParams();

    if (params?.searchQuery) {
      searchParams.append('searchQuery', params.searchQuery);
    }

    params?.categories?.forEach(cat =>
      searchParams.append('categories', cat)
    );

    const res = await fetch(
      `${API_BASE}/user/my-list/genres?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    );

    if (!res.ok) throw new Error('Failed to fetch genres');
    return res.json();
  }

  async getMyListPlatforms(params?: {
    searchQuery?: string;
    categories?: string[];
  }): Promise<Platform[]> {
    const searchParams = new URLSearchParams();

    if (params?.searchQuery) {
      searchParams.append('searchQuery', params.searchQuery);
    }

    params?.categories?.forEach(cat =>
      searchParams.append('categories', cat)
    );

    const res = await fetch(
      `${API_BASE}/user/my-list/platforms?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    );

    if (!res.ok) throw new Error('Failed to fetch platforms');
    return res.json();
  }

  async getAvailableMediaGenres(params?: {
  query?: string;
  categories?: string[];
}): Promise<Genre[]> {
  const searchParams = new URLSearchParams();

  if (params?.query) {
    searchParams.append('query', params.query);
  }

  params?.categories?.forEach(cat =>
    searchParams.append('categories', cat)
  );

  const res = await fetch(
    `${API_BASE}/user/media-items/available-genres?${searchParams.toString()}`,
    { headers: this.getHeaders() }
  );

  if (!res.ok) throw new Error('Failed to fetch genres');
  return res.json();
}

  async getAvailableMediaPlatforms(params?: {
    query?: string;
    categories?: string[];
  }): Promise<Platform[]> {
    const searchParams = new URLSearchParams();

    if (params?.query) {
      searchParams.append('query', params.query);
    }

    params?.categories?.forEach(cat =>
      searchParams.append('categories', cat)
    );

    const res = await fetch(
      `${API_BASE}/user/media-items/available-platforms?${searchParams.toString()}`,
      { headers: this.getHeaders() }
    );

    if (!res.ok) throw new Error('Failed to fetch platforms');
    return res.json();
  }
}

export const api = new ApiClient();