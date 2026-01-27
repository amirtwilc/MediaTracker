import { GraphQLApiClient } from './api-client.graphql';
import { MediaItem } from '../../types';
import {
  SearchMediaParams,
  SearchMediaSortedParams,
  CursorResponse,
  PagedResponse,
} from './api.types';
import { DEFAULT_PAGINATION } from './config';

export class MediaApiClient extends GraphQLApiClient {

  /**
   * Search media items with cursor-based pagination
   */
  async searchMediaItemsCursor(
    params: SearchMediaParams
  ): Promise<CursorResponse<MediaItem>> {
    const query = `
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
        limit: params.limit ?? DEFAULT_PAGINATION.LIMIT,
      },
    };

    const result = await this.graphql<{ searchMediaItems: CursorResponse<MediaItem> }>(
      query,
      variables
    );

    return result.searchMediaItems;
  }

  /**
   * Search media items with sorting
   */
  async searchMediaItemsSorted(
    params: SearchMediaSortedParams
  ): Promise<PagedResponse<MediaItem>> {
    const query = `
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
        page: params.page ?? DEFAULT_PAGINATION.PAGE,
        size: params.size ?? DEFAULT_PAGINATION.SIZE,
        sortBy: params.sortBy ?? 'name',
        sortDirection: params.sortDirection ?? 'ASC',
      },
    };

    const result = await this.graphql<{ 
      searchMediaItemsSorted: PagedResponse<MediaItem> 
    }>(query, variables);

    return result.searchMediaItemsSorted;
  }
}