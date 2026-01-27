import { BaseApiClient } from './api-client.base';
import { buildSearchParams, mapSortBy, mapSortDirection } from './api.utils';
import {
  BasicUserSearchParams,
  AdvancedUserSearchRequest,
  PagedResponse,
  UserProfile,
  UserSettings,
} from './api.types';
import { DEFAULT_PAGINATION } from './config';

export class UsersApiClient extends BaseApiClient {
  /**
   * Search users with basic criteria
   */
  async searchUsersBasic(params: BasicUserSearchParams): Promise<PagedResponse<UserProfile>> {
    const searchParams = buildSearchParams({
      username: params.username,
      adminOnly: params.adminOnly ?? false,
      page: params.page ?? DEFAULT_PAGINATION.PAGE,
      size: params.size ?? DEFAULT_PAGINATION.SIZE,
      sortBy: mapSortBy(params.sortBy),
      sortDirection: mapSortDirection(params.sortDirection),
    });

    return this.get<PagedResponse<UserProfile>>(
      `/users/search/basic?${searchParams.toString()}`
    );
  }

  /**
   * Search users with advanced criteria (rating-based)
   */
  async searchUsersAdvanced(
    request: AdvancedUserSearchRequest
  ): Promise<PagedResponse<UserProfile>> {
    const body = {
      itemRatingCriteria: request.itemRatingCriteria,
      sortBy: mapSortBy(request.sortBy),
      sortDirection: mapSortDirection(request.sortDirection),
      page: request.page ?? DEFAULT_PAGINATION.PAGE,
      size: request.size ?? DEFAULT_PAGINATION.SIZE,
    };

    return this.post<PagedResponse<UserProfile>>('/users/search/advanced', body);
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: number): Promise<UserProfile> {
    return this.get<UserProfile>(`/users/${userId}/profile`);
  }

  /**
   * Get current user settings
   */
  async getUserSettings(): Promise<UserSettings> {
    return this.get<UserSettings>('/users/me/settings');
  }

  /**
   * Update current user settings
   */
  async updateUserSettings(settings: Partial<UserSettings>): Promise<UserSettings> {
    return this.put<UserSettings>('/users/me/settings', settings);
  }
}