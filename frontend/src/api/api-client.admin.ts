import { BaseApiClient } from './api-client.base';
import { Genre, Platform, MediaItem } from '../types';
import { CSVImportResponse, JobStatus } from './api.types';

export class AdminApiClient extends BaseApiClient {

  async getAllGenres(): Promise<Genre[]> {
    return this.get<Genre[]>('/admin/genres');
  }

  async getAllPlatforms(): Promise<Platform[]> {
    return this.get<Platform[]>('/admin/platforms');
  }

  async createMediaItem(data: any): Promise<MediaItem> {
    return this.post<MediaItem>('/admin/media-items', data);
  }

  async updateMediaItem(id: number, data: any): Promise<MediaItem> {
    return this.put<MediaItem>(`/admin/media-items/${id}`, data);
  }

  async deleteMediaItem(id: number): Promise<void> {
    return this.delete<void>(`/admin/media-items/${id}`);
  }

  // Upload CSV file for bulk import
  async uploadCSV(file: File): Promise<CSVImportResponse> {
    return this.uploadFile<CSVImportResponse>('/admin/media-items/import-csv', file);
  }

  async getJobStatus(jobId: number): Promise<JobStatus> {
    return this.get<JobStatus>(`/admin/media-items/import-status/${jobId}`);
  }
}