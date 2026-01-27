import { GraphQLApiClient } from './api-client.graphql';
import { UserMediaListItem } from '../types';
import {
  UserMediaListParams,
  UserMediaListSortedParams,
  CursorResponse,
  PagedResponse,
} from './api.types';
import { DEFAULT_PAGINATION } from './config';

export class UserMediaApiClient extends GraphQLApiClient {
  /**
   * Get user media list with cursor-based pagination
   */
  async getUserMediaListCursor(
    params: UserMediaListParams
  ): Promise<CursorResponse<UserMediaListItem>> {
    const query = `
      query UserMediaListCursor($input: UserMediaListInput!) {
        userMediaListCursor(input: $input) {
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
        displayUserId: params.displayUserId,
        searchQuery: params.searchQuery,
        categories: params.categories,
        genreIds: params.genreIds,
        platformIds: params.platformIds,
        wishToExperience: params.wishToExperience,
        cursorName: params.cursorName,
        cursorId: params.cursorId,
        limit: params.limit ?? DEFAULT_PAGINATION.LIMIT,
      },
    };

    const result = await this.graphql<{ 
      userMediaListCursor: CursorResponse<UserMediaListItem> 
    }>(query, variables);

    return result.userMediaListCursor;
  }

  /**
   * Get user media list with sorting
   */
  async getUserMediaListSorted(
    params: UserMediaListSortedParams
  ): Promise<PagedResponse<UserMediaListItem>> {
    const query = `
      query UserMediaListSorted($input: UserMediaListSortedInput!) {
        userMediaListSorted(input: $input) {
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
        displayUserId: params.displayUserId,
        searchQuery: params.searchQuery,
        categories: params.categories,
        genreIds: params.genreIds,
        platformIds: params.platformIds,
        wishToExperience: params.wishToExperience,
        page: params.page ?? DEFAULT_PAGINATION.PAGE,
        size: params.size ?? DEFAULT_PAGINATION.SIZE,
        sortBy: params.sortBy ? params.sortBy.toUpperCase() : 'NAME',
        sortDirection: params.sortDirection ? params.sortDirection.toUpperCase() : 'ASC',
      },
    };

    const result = await this.graphql<{ 
      userMediaListSorted: PagedResponse<UserMediaListItem> 
    }>(query, variables);

    return result.userMediaListSorted;
  }

  /**
   * Add media item to user's list
   */
  async addToMyList(mediaItemId: number): Promise<UserMediaListItem> {
    const query = `
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

    const result = await this.graphql<{ addMediaToList: UserMediaListItem }>(
      query,
      variables
    );

    return result.addMediaToList;
  }

  /**
   * Update user media list item
   */
  async updateMyListItem(
    id: number,
    data: Partial<UserMediaListItem>
  ): Promise<UserMediaListItem> {
    const query = `
      mutation UpdateMediaListItem($request: UpdateMediaListRequest!) {
        updateMediaListItem(request: $request) {
          id
          experienced
          wishToReexperience
          rating
          comment
        }
      }
    `;

    const variables = {
      request: {
        id: id.toString(),
        experienced: data.experienced,
        wishToReexperience: data.wishToReexperience,
        rating: data.rating,
        comment: data.comment,
      },
    };

    const result = await this.graphql<{ updateMediaListItem: UserMediaListItem }>(
      query,
      variables
    );

    return result.updateMediaListItem;
  }

  /**
   * Remove media item from user's list
   */
  async removeFromMyList(id: number): Promise<void> {
    const query = `
      mutation RemoveMediaFromList($id: ID!) {
        removeMediaFromList(id: $id)
      }
    `;

    const variables = {
      id: id.toString(),
    };

    await this.graphql<{ removeMediaFromList: boolean }>(query, variables);
  }
}