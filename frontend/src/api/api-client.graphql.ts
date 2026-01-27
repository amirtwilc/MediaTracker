import { BaseApiClient } from './api-client.base';
import { GraphQLError } from './errors';
import { GraphQLResponse } from './api.types';
import { API_CONFIG } from './config';

export class GraphQLApiClient extends BaseApiClient {
  /**
   * Makes a GraphQL query or mutation
   */
  protected async graphql<T>(
    query: string,
    variables?: Record<string, any>
  ): Promise<T> {
    const result = await this.request<GraphQLResponse<T>>(
      `${API_CONFIG.BASE_URL}/graphql`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({ query, variables }),
      }
    );

    if (result.errors && result.errors.length > 0) {
      throw new GraphQLError(
        result.errors[0].message,
        result.errors
      );
    }

    return result.data;
  }
}