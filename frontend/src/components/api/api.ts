import { AuthApiClient } from './api-client.auth';
import { MediaApiClient } from './api-client.media';
import { UserMediaApiClient } from './api-client.user-media';
import { NotificationsApiClient } from './api-client.notifications';
import { FollowsApiClient } from './api-client.follows';
import { UsersApiClient } from './api-client.users';
import { FiltersApiClient } from './api-client.filters';
import { AdminApiClient } from './api-client.admin';

/**
 * Main API client that combines all API modules
 * Provides a single interface for all API operations
 */
class ApiClient {
  // Auth operations
  public auth: AuthApiClient;
  
  // Media operations
  public media: MediaApiClient;
  
  // User media list operations
  public userMedia: UserMediaApiClient;
  
  // Notification operations
  public notifications: NotificationsApiClient;
  
  // Follow/unfollow operations
  public follows: FollowsApiClient;
  
  // User search and profile operations
  public users: UsersApiClient;
  
  // Filter operations (genres/platforms)
  public filters: FiltersApiClient;
  
  // Admin operations
  public admin: AdminApiClient;

  constructor() {
    this.auth = new AuthApiClient();
    this.media = new MediaApiClient();
    this.userMedia = new UserMediaApiClient();
    this.notifications = new NotificationsApiClient();
    this.follows = new FollowsApiClient();
    this.users = new UsersApiClient();
    this.filters = new FiltersApiClient();
    this.admin = new AdminApiClient();
  }

  /**
   * Sets the authentication token across all API clients
   */
  setToken(token: string | null): void {
    this.auth.setToken(token);
    this.media.setToken(token);
    this.userMedia.setToken(token);
    this.notifications.setToken(token);
    this.follows.setToken(token);
    this.users.setToken(token);
    this.filters.setToken(token);
    this.admin.setToken(token);
  }

  /**
   * Clears the authentication token across all API clients
   */
  clearToken(): void {
    this.auth.clearToken();
    this.media.clearToken();
    this.userMedia.clearToken();
    this.notifications.clearToken();
    this.follows.clearToken();
    this.users.clearToken();
    this.filters.clearToken();
    this.admin.clearToken();
  }

  /**
   * Logout - clears authentication token
   */
  logout(): void {
    this.clearToken();
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export types for consumer use
export * from './api.types';
export * from './errors';
export * from './config';