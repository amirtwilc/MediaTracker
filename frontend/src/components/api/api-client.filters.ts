import { GraphQLApiClient } from './api-client.graphql';
import { Genre, Platform } from '../../types';
import { MyListFiltersInput, AvailableFiltersInput } from './api.types';

export class FiltersApiClient extends GraphQLApiClient {
  /**
   * Get genres available in user's media list
   */
  async getMyListGenres(params?: MyListFiltersInput): Promise<Genre[]> {
    const query = `
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

    const result = await this.graphql<{ myListGenres: Genre[] }>(query, variables);
    return result.myListGenres;
  }

  /**
   * Get platforms available in user's media list
   */
  async getMyListPlatforms(params?: MyListFiltersInput): Promise<Platform[]> {
    const query = `
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

    const result = await this.graphql<{ myListPlatforms: Platform[] }>(query, variables);
    return result.myListPlatforms;
  }

  /**
   * Get available genres for media search
   */
  async getAvailableMediaGenres(params?: AvailableFiltersInput): Promise<Genre[]> {
    const query = `
      query AvailableMediaGenres($input: AvailableFiltersInput!) {
        availableMediaGenres(input: $input) {
          id
          name
        }
      }
    `;

    const variables = {
      input: {
        query: params?.query || '',
        categories: params?.categories,
      },
    };

    const result = await this.graphql<{ availableMediaGenres: Genre[] }>(
      query,
      variables
    );

    return result.availableMediaGenres;
  }

  /**
   * Get available platforms for media search
   */
  async getAvailableMediaPlatforms(params?: AvailableFiltersInput): Promise<Platform[]> {
    const query = `
      query AvailableMediaPlatforms($input: AvailableFiltersInput!) {
        availableMediaPlatforms(input: $input) {
          id
          name
        }
      }
    `;

    const variables = {
      input: {
        query: params?.query || '',
        categories: params?.categories,
      },
    };

    const result = await this.graphql<{ availableMediaPlatforms: Platform[] }>(
      query,
      variables
    );

    return result.availableMediaPlatforms;
  }
}