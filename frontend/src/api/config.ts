export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_BASE_URL || 'http://localhost:8080/media-tracker',
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

export const DEFAULT_PAGINATION = {
  PAGE: 0,
  SIZE: 20,
  LIMIT: 20,
} as const;

export const STORAGE_KEYS = {
  TOKEN: 'token',
} as const;