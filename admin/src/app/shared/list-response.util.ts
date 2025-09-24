export interface ListResponse<T = any> {
  items?: T[];
  data?: T[];
  total?: number;
  page?: number;
  pages?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface StandardizedListResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

/**
 * Normalizes different API response formats to a consistent structure
 */
export function normalizeListResponse<T>(response: ListResponse<T>): StandardizedListResponse<T> {
  return {
    items: response.data || response.items || [],
    total: response.pagination?.total || response.total || 0,
    page: response.pagination?.page || response.page || 1,
    pages: response.pagination?.pages || response.pages || 1
  };
}

/**
 * Calculates zero-based page index from response
 */
export function getPageIndex(response: ListResponse): number {
  return Math.max((response.pagination?.page || response.page || 1) - 1, 0);
}