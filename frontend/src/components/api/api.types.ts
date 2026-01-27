// Auth types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  userId: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

// Search types
export interface SearchMediaParams {
  query: string;
  categories?: string[];
  genreIds?: number[];
  platformIds?: number[];
  cursorName?: string;
  cursorId?: number;
  limit?: number;
}

export interface SearchMediaSortedParams {
  query: string;
  categories?: string[];
  genreIds?: number[];
  platformIds?: number[];
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

export interface CursorResponse<T> {
  items: T[];
  nextCursor?: { name: string; id: number };
  hasMore: boolean;
  totalCount: number;
}

export interface PagedResponse<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

// User Media List types
export interface UserMediaListParams {
  displayUserId?: number;
  searchQuery?: string;
  categories?: string[];
  genreIds?: number[];
  platformIds?: number[];
  wishToExperience?: boolean;
  cursorName?: string;
  cursorId?: number;
  limit?: number;
}

export interface UserMediaListSortedParams extends Omit<UserMediaListParams, 'cursorName' | 'cursorId' | 'limit'> {
  page?: number;
  size?: number;
  sortBy?: string;
  sortDirection?: string;
}

// Follow types
export interface FollowRequest {
  userId: number;
  threshold: number;
}

// User search types
export interface BasicUserSearchParams {
  username?: string;
  adminOnly?: boolean;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  size?: number;
}

export interface ItemRatingCriteria {
  mediaItemId: number;
  minRating: number;
  maxRating: number;
}

export interface AdvancedUserSearchRequest {
  itemRatingCriteria: ItemRatingCriteria[];
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  size?: number;
}

// Filter types
export interface MyListFiltersInput {
  searchQuery?: string;
  categories?: string[];
}

export interface AvailableFiltersInput {
  query?: string;
  categories?: string[];
}

// Job types
export interface JobStatus {
  id: number;
  readCount: number;
  writeCount: number;
  skipCount: number;
  status: string;
}

// CSV Import types
export interface CSVImportResponse {
  correlationId: number;
  message: string;
}

// GraphQL types
export interface GraphQLResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: any[];
    path?: any[];
  }>;
}

// Settings types
export interface UserSettings {
  showEmail: boolean;
  isInvisible: boolean;
}

// User Profile types
export interface UserProfile {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
  lastActive: string;
  ratingsCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
}