import { ValidationError } from './errors';

/**
 * Builds URLSearchParams from an object, handling arrays and null/undefined values
 */
export function buildSearchParams(params: Record<string, any>): URLSearchParams {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (Array.isArray(value)) {
      value.forEach(v => {
        if (v !== undefined && v !== null) {
          searchParams.append(key, String(v));
        }
      });
    } else {
      searchParams.append(key, String(value));
    }
  });

  return searchParams;
}

/**
 * Validates that required fields are present and not empty
 */
export function validateRequired(fields: Record<string, any>, fieldNames: string[]): void {
  for (const fieldName of fieldNames) {
    const value = fields[fieldName];
    if (value === undefined || value === null || (typeof value === 'string' && !value.trim())) {
      throw new ValidationError(`${fieldName} is required`);
    }
  }
}

/**
 * Maps frontend sort values to backend enum values
 */
export function mapSortBy(sortBy?: string): string {
  const sortByMap: Record<string, string> = {
    'registrationDate': 'REGISTRATION_DATE',
    'lastActive': 'LAST_ACTIVE',
    'ratingsCount': 'RATINGS',
    'followersCount': 'FOLLOWERS',
  };

  return sortBy && sortByMap[sortBy] ? sortByMap[sortBy] : 'LAST_ACTIVE';
}

/**
 * Maps frontend sort direction to backend enum values
 */
export function mapSortDirection(direction?: string): string {
  const directionMap: Record<string, string> = {
    'asc': 'ASCENDING',
    'desc': 'DESCENDING',
  };

  return direction && directionMap[direction] ? directionMap[direction] : 'DESCENDING';
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}