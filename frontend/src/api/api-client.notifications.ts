import { BaseApiClient } from './api-client.base';
import { Notification } from '../types';

export class NotificationsApiClient extends BaseApiClient {
  /**
   * Get notifications
   */
  async getNotifications(onlyUnread = false): Promise<Notification[]> {
    return this.get<Notification[]>(
      `/notifications?onlyUnread=${onlyUnread}`
    );
  }

  /**
   * Mark notification as read
   */
  async markNotificationAsRead(id: number): Promise<Notification> {
    return this.put<Notification>(`/notifications/${id}/read`);
  }

  /**
   * Mark all notifications as read
   */
  async markAllNotificationsAsRead(): Promise<void> {
    return this.put<void>('/notifications/read-all');
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(): Promise<number> {
    const data = await this.get<{ unreadCount: number }>(
      '/notifications/unread-count'
    );
    return data.unreadCount;
  }
}