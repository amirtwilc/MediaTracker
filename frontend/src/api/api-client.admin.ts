import { BaseApiClient } from './api-client.base';
import { Genre, Platform, MediaItem } from '../types';
import { CSVImportResponse, JobStatus } from './api.types';

export class AdminApiClient extends BaseApiClient {
  /**
   * Get all genres
   */
  async getAllGenres(): Promise<Genre[]> {
    return this.get<Genre[]>('/admin/genres');
  }

  /**
   * Get all platforms
   */
  async getAllPlatforms(): Promise<Platform[]> {
    return this.get<Platform[]>('/admin/platforms');
  }

  /**
   * Create a new media item
   */
  async createMediaItem(data: any): Promise<MediaItem> {
    return this.post<MediaItem>('/admin/media-items', data);
  }

  /**
   * Update an existing media item
   */
  async updateMediaItem(id: number, data: any): Promise<MediaItem> {
    return this.put<MediaItem>(`/admin/media-items/${id}`, data);
  }

  /**
   * Delete a media item
   */
  async deleteMediaItem(id: number): Promise<void> {
    return this.delete<void>(`/admin/media-items/${id}`);
  }

  /**
   * Upload CSV file for bulk import
   */
  async uploadCSV(file: File): Promise<CSVImportResponse> {
    return this.uploadFile<CSVImportResponse>('/admin/media-items/import-csv', file);
  }

  /**
   * Get import job status
   */
  async getJobStatus(jobId: number): Promise<JobStatus> {
    return this.get<JobStatus>(`/admin/media-items/import-status/${jobId}`);
  }
}