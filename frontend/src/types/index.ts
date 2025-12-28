export interface User {
  id: number;
  username: string;
  email: string;
  role: 'USER' | 'ADMIN';
  createdAt?: string;
  ratingsCount?: number;
}

export interface UserProfile {
  id: number;
  username: string;
  email?: string;
  role: 'USER' | 'ADMIN';
  createdAt: string;
  lastActive: string;
  ratingsCount: number;
  followersCount: number;
  isFollowing: boolean;
}

export interface UserSearchRequest {
  username?: string;
  adminOnly?: boolean;
  sortBy?: string;
  sortDirection?: string;
  category?: string;
  genreIds?: number[];
  platformIds?: number[];
  itemRatingCriteria?: ItemRatingCriteria[];
}

export interface ItemRatingCriteria {
  mediaItemId: number;
  minRating: number;
  maxRating: number;
}

export interface UserSettings {
  isInvisible: boolean;
  showEmail: boolean;
}

export interface Genre {
  id: number;
  name: string;
}

export interface Platform {
  id: number;
  name: string;
}

export interface MediaItem {
  id: number;
  category: 'MOVIE' | 'SERIES' | 'GAME';
  name: string;
  year?: number;
  avgRating?: number;  
  genres: Genre[];
  platforms: Platform[];
  createdAt?: string;
  updatedAt?: string;
}

export interface UserMediaListItem {
  id: number;
  mediaItem: MediaItem;
  experienced: boolean;
  wishToReexperience: boolean;
  rating?: number;
  comment?: string;
  addedAt: string;
  updatedAt: string;
}

export interface Notification {
  id: number;
  message: string;
  mediaItem: MediaItem;
  rating: number;
  ratedByUser: User;
  isRead: boolean;
  createdAt: string;
}

export interface UserFollow {
  id: number;
  user: User;
  minimumRatingThreshold: number;
  createdAt: string;
}

export interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}