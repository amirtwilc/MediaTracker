import { GraphQLApiClient } from './api-client.graphql';
import { User, UserFollow } from '../types';

export class FollowsApiClient extends GraphQLApiClient {
  /**
   * Follow a user
   */
  async followUser(userId: number, threshold: number): Promise<UserFollow> {
    const query = `
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

    const result = await this.graphql<{ followUser: UserFollow }>(query, variables);
    return result.followUser;
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(userId: number): Promise<void> {
    const query = `
      mutation UnfollowUser($followUserId: ID!) {
        unfollowUser(followUserId: $followUserId)
      }
    `;

    const variables = {
      followUserId: userId.toString(),
    };

    await this.graphql<{ unfollowUser: boolean }>(query, variables);
  }

  /**
   * Update follow threshold for a followed user
   */
  async updateFollowThreshold(userId: number, threshold: number): Promise<UserFollow> {
    const query = `
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

    const result = await this.graphql<{ updateFollowThreshold: UserFollow }>(
      query,
      variables
    );

    return result.updateFollowThreshold;
  }

  /**
   * Get list of users current user is following
   */
  async getFollowing(): Promise<UserFollow[]> {
    const query = `
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

    const result = await this.graphql<{ myFollowing: UserFollow[] }>(query);
    return result.myFollowing;
  }

  /**
   * Get list of followers
   */
  async getFollowers(): Promise<User[]> {
    const query = `
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

    const result = await this.graphql<{ myFollowers: User[] }>(query);
    return result.myFollowers;
  }
}