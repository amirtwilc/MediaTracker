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

  async searchMediaItemsGraphQL(params: {
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
    const graphqlQuery = `
      query SearchMediaItems($input: SearchMediaInput!) {
        searchMediaItems(input: $input) {
          items {
            id
            name
            category
            year
            avgRating
            inUserList
            genres {
              id
              name
            }
            platforms {
              id
              name
            }
            createdAt
            updatedAt
          }
          nextCursor {
            name
            id
          }
          hasMore
          totalCount
        }
      }
    `;

    const variables = {
      input: {
        query: params.query,
        categories: params.categories,
        genreIds: params.genreIds,
        platformIds: params.platformIds,
        cursorName: params.cursorName,
        cursorId: params.cursorId,
        limit: params.limit ?? 20,
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL search failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.searchMediaItems;
  }

  async searchMediaItemsSortedGraphQL(params: {
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
    const graphqlQuery = `
      query SearchMediaItemsSorted($input: SearchMediaSortedInput!) {
        searchMediaItemsSorted(input: $input) {
          content {
            id
            name
            category
            year
            avgRating
            inUserList
            genres {
              id
              name
            }
            platforms {
              id
              name
            }
            createdAt
            updatedAt
          }
          totalPages
          totalElements
          number
          size
        }
      }
    `;

    const variables = {
      input: {
        query: params.query,
        categories: params.categories,
        genreIds: params.genreIds,
        platformIds: params.platformIds,
        page: params.page ?? 0,
        size: params.size ?? 20,
        sortBy: params.sortBy ?? 'name',
        sortDirection: params.sortDirection ?? 'ASC',
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL search failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.searchMediaItemsSorted;
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

  async getMyMediaListCursorGraphQL(params: {
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
    const graphqlQuery = `
      query MyMediaListCursor($input: MyMediaListInput!) {
        myMediaListCursor(input: $input) {
          items {
            id
            mediaItem {
              id
              name
              category
              year
              avgRating
              genres {
                id
                name
              }
              platforms {
                id
                name
              }
              createdAt
              updatedAt
            }
            experienced
            wishToReexperience
            rating
            comment
            addedAt
            updatedAt
          }
          nextCursor {
            name
            id
          }
          hasMore
          totalCount
        }
      }
    `;

    const variables = {
      input: {
        searchQuery: params.searchQuery,
        categories: params.categories,
        genreIds: params.genreIds,
        platformIds: params.platformIds,
        wishToExperience: params.wishToExperience,
        cursorName: params.cursorName,
        cursorId: params.cursorId,
        limit: params.limit ?? 20,
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL query failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.myMediaListCursor;
  }

  async getMyMediaListSortedGraphQL(params: {
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
    const graphqlQuery = `
      query MyMediaListSorted($input: MyMediaListSortedInput!) {
        myMediaListSorted(input: $input) {
          content {
            id
            mediaItem {
              id
              name
              category
              year
              avgRating
              genres {
                id
                name
              }
              platforms {
                id
                name
              }
              createdAt
              updatedAt
            }
            experienced
            wishToReexperience
            rating
            comment
            addedAt
            updatedAt
          }
          totalPages
          totalElements
          number
          size
        }
      }
    `;

    const variables = {
      input: {
        searchQuery: params.searchQuery,
        categories: params.categories,
        genreIds: params.genreIds,
        platformIds: params.platformIds,
        wishToExperience: params.wishToExperience,
        page: params.page ?? 0,
        size: params.size ?? 20,
        sortBy: params.sortBy ?? 'name',
        sortDirection: params.sortDirection ?? 'ASC',
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL query failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.myMediaListSorted;
  }

  async addToMyListGraphQL(mediaItemId: number): Promise<UserMediaListItem> {
    const graphqlQuery = `
      mutation AddMediaToList($mediaItemId: ID!) {
        addMediaToList(mediaItemId: $mediaItemId) {
          id
          mediaItem {
            id
            name
            category
            year
            avgRating
            genres {
              id
              name
            }
            platforms {
              id
              name
            }
            createdAt
            updatedAt
          }
          experienced
          wishToReexperience
          rating
          comment
          addedAt
          updatedAt
        }
      }
    `;

    const variables = {
      mediaItemId: mediaItemId.toString(),
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL mutation failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.addMediaToList;
  }

  async updateMyListItemGraphQL(id: number, data: Partial<UserMediaListItem>): Promise<UserMediaListItem> {
    const graphqlQuery = `
      mutation UpdateMediaListItem($id: ID!, $request: UpdateMediaListRequest!) {
        updateMediaListItem(id: $id, request: $request) {
          id
          mediaItem {
            id
            name
            category
            year
            avgRating
            genres {
              id
              name
            }
            platforms {
              id
              name
            }
            createdAt
            updatedAt
          }
          experienced
          wishToReexperience
          rating
          comment
          addedAt
          updatedAt
        }
      }
    `;

    const variables = {
      id: id.toString(),
      request: {
        experienced: data.experienced,
        wishToReexperience: data.wishToReexperience,
        rating: data.rating,
        comment: data.comment,
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL mutation failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.updateMediaListItem;
  }

  async removeFromMyListGraphQL(id: number): Promise<void> {
    const graphqlQuery = `
      mutation RemoveMediaFromList($id: ID!) {
        removeMediaFromList(id: $id)
      }
    `;

    const variables = {
      id: id.toString(),
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL mutation failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
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

  async followUserGraphQL(userId: number, threshold: number): Promise<UserFollow> {
    const graphqlQuery = `
      mutation FollowUser($request: FollowRequest!) {
        followUser(request: $request) {
          id
          user {
            id
            username
            email
            role
          }
          minimumRatingThreshold
          createdAt
        }
      }
    `;

    const variables = {
      request: {
        userId: userId.toString(),
        minimumRatingThreshold: threshold,
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL mutation failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.followUser;
  }

  async unfollowUserGraphQL(userId: number): Promise<void> {
    const graphqlQuery = `
      mutation UnfollowUser($followUserId: ID!) {
        unfollowUser(followUserId: $followUserId)
      }
    `;

    const variables = {
      followUserId: userId.toString(),
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL mutation failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
  }

  async updateFollowThresholdGraphQL(userId: number, threshold: number): Promise<UserFollow> {
    const graphqlQuery = `
      mutation UpdateFollowThreshold($followUserId: ID!, $threshold: Int!) {
        updateFollowThreshold(followUserId: $followUserId, threshold: $threshold) {
          id
          user {
            id
            username
            email
            role
          }
          minimumRatingThreshold
          createdAt
        }
      }
    `;

    const variables = {
      followUserId: userId.toString(),
      threshold: threshold,
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL mutation failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.updateFollowThreshold;
  }

  async getFollowingGraphQL(): Promise<UserFollow[]> {
    const graphqlQuery = `
      query {
        myFollowing {
          id
          user {
            id
            username
            email
            role
          }
          minimumRatingThreshold
          createdAt
        }
      }
    `;

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
      }),
    });

    if (!res.ok) throw new Error('GraphQL query failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.myFollowing;
  }

  async getFollowersGraphQL(): Promise<User[]> {
    const graphqlQuery = `
      query {
        myFollowers {
          id
          username
          email
          role
          createdAt
          ratingsCount
        }
      }
    `;

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
      }),
    });

    if (!res.ok) throw new Error('GraphQL query failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.myFollowers;
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

  async searchUsersBasic(
    username?: string,
    adminOnly: boolean = false,
    sortBy: string = 'lastActive',
    sortDirection: string = 'desc',
    page: number = 0,
    size: number = 20
  ): Promise<any> {
    const params = new URLSearchParams({
      adminOnly: adminOnly.toString(),
      page: page.toString(),
      size: size.toString(),
    });

    if (username) {
      params.append('username', username);
    }

    // Map frontend sort values to backend enum
    const sortByMap: { [key: string]: string } = {
      'registrationDate': 'REGISTRATION_DATE',
      'lastActive': 'LAST_ACTIVE',
      'ratingsCount': 'RATINGS',
      'followersCount': 'FOLLOWERS',
    };

    if (sortBy && sortByMap[sortBy]) {
      params.append('sortBy', sortByMap[sortBy]);
    }

    // Map frontend direction to backend enum
    const directionMap: { [key: string]: string } = {
      'asc': 'ASCENDING',
      'desc': 'DESCENDING',
    };

    if (sortDirection && directionMap[sortDirection]) {
      params.append('sortDirection', directionMap[sortDirection]);
    }

    const res = await fetch(`${API_BASE}/users/search/basic?${params}`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) throw new Error('Failed to search users');
    return res.json();
  }

  async searchUsersAdvanced(request: {
    itemRatingCriteria: Array<{
      mediaItemId: number;
      minRating: number;
      maxRating: number;
    }>;
    sortBy?: string;
    sortDirection?: string;
    page?: number;
    size?: number;
  }): Promise<any> {
    // Map frontend sort values to backend enum
    const sortByMap: { [key: string]: string } = {
      'registrationDate': 'REGISTRATION_DATE',
      'lastActive': 'LAST_ACTIVE',
      'ratingsCount': 'RATINGS',
      'followersCount': 'FOLLOWERS',
    };

    const directionMap: { [key: string]: string } = {
      'asc': 'ASCENDING',
      'desc': 'DESCENDING',
    };

    const body = {
      itemRatingCriteria: request.itemRatingCriteria,
      sortBy: request.sortBy ? sortByMap[request.sortBy] : 'LAST_ACTIVE',
      sortDirection: request.sortDirection ? directionMap[request.sortDirection] : 'DESCENDING',
      page: request.page ?? 0,
      size: request.size ?? 20,
    };

    const res = await fetch(`${API_BASE}/users/search/advanced`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(body),
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

  async getMyListGenresGraphQL(params?: {
    searchQuery?: string;
    categories?: string[];
  }): Promise<Genre[]> {
    const graphqlQuery = `
      query MyListGenres($input: MyListFiltersInput!) {
        myListGenres(input: $input) {
          id
          name
        }
      }
    `;

    const variables = {
      input: {
        searchQuery: params?.searchQuery,
        categories: params?.categories,
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL query failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.myListGenres;
  }

  async getMyListPlatformsGraphQL(params?: {
    searchQuery?: string;
    categories?: string[];
  }): Promise<Platform[]> {
    const graphqlQuery = `
      query MyListPlatforms($input: MyListFiltersInput!) {
        myListPlatforms(input: $input) {
          id
          name
        }
      }
    `;

    const variables = {
      input: {
        searchQuery: params?.searchQuery,
        categories: params?.categories,
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL query failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.myListPlatforms;
  }

  async getAvailableMediaGenresGraphQL(params?: {
    query?: string;
    categories?: string[];
  }): Promise<Genre[]> {
    const graphqlQuery = `
      query AvailableMediaGenres($input: AvailableFiltersInput!) {
        availableMediaGenres(input: $input) {
          id
          name
        }
      }
    `;

    const variables = {
      input: {
        query: params?.query || "",
        categories: params?.categories,
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL query failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.availableMediaGenres;
  }

  async getAvailableMediaPlatformsGraphQL(params?: {
    query?: string;
    categories?: string[];
  }): Promise<Platform[]> {
    const graphqlQuery = `
      query AvailableMediaPlatforms($input: AvailableFiltersInput!) {
        availableMediaPlatforms(input: $input) {
          id
          name
        }
      }
    `;

    const variables = {
      input: {
        query: params?.query || "",
        categories: params?.categories,
      },
    };

    const res = await fetch(`${API_BASE}/graphql`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        query: graphqlQuery,
        variables,
      }),
    });

    if (!res.ok) throw new Error('GraphQL query failed');

    const result = await res.json();

    if (result.errors) {
      throw new Error(result.errors[0].message);
    }

    return result.data.availableMediaPlatforms;
  }
}

export const api = new ApiClient();