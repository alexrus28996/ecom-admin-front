import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { Paginated, Category as ApiCategory } from './api.types';

export interface AdminCategory extends ApiCategory {
  parentId?: string | null;
  breadcrumbs?: ApiCategory[];
  sortOrder?: number;
  status?: 'active' | 'inactive' | 'deleted';
  imageUrl?: string | null;
  bannerUrl?: string | null;
  iconUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string[];
}

export interface CategoryPayload {
  name?: string;
  slug?: string | null;
  description?: string | null;
  parent?: string | null;
  isActive?: boolean;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  iconUrl?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string[];
}

export interface CategoryListParams {
  q?: string;
  parent?: string | null;
  page?: number;
  limit?: number;
  includeDeleted?: boolean;
}

interface CategoryListResponse {
  items?: AdminCategory[];
  data?: AdminCategory[];
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

interface CategoryResponse {
  category: AdminCategory;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly baseUrl = `${environment.apiBaseUrl}/categories`;
  private readonly adminBaseUrl = `${environment.apiBaseUrl}/admin/categories`;

  constructor(private readonly http: HttpClient) {}

  list(params: CategoryListParams = {}): Observable<Paginated<AdminCategory>> {
    let httpParams = new HttpParams();
    if (params.q) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params.parent !== undefined) {
      httpParams = httpParams.set('parent', params.parent === null ? '' : params.parent);
    }
    if (params.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    if (params.includeDeleted) {
      httpParams = httpParams.set('includeDeleted', 'true');
    }

    const url = this.baseUrl;
    return this.monitor(url, this.http.get<CategoryListResponse>(url, { params: httpParams }), { params }).pipe(
      map((response) => this.mapPaginatedResponse(response))
    );
  }

  get(id: string): Observable<AdminCategory> {
    const url = `${this.baseUrl}/${id}`;
    return this.monitor(url, this.http.get<CategoryResponse>(url)).pipe(map((response) => this.normalizeCategory(response.category)));
  }

  create(payload: CategoryPayload & { name: string }): Observable<AdminCategory> {
    this.logAction('create', payload);
    const url = this.baseUrl;
    return this.monitor(url, this.http.post<CategoryResponse>(url, payload), payload).pipe(
      map((response) => this.normalizeCategory(response.category))
    );
  }

  update(id: string, payload: CategoryPayload): Observable<AdminCategory> {
    this.logAction('update', { id, ...payload });
    const url = `${this.baseUrl}/${id}`;
    return this.monitor(url, this.http.put<CategoryResponse>(url, payload), payload).pipe(
      map((response) => this.normalizeCategory(response.category))
    );
  }

  delete(id: string): Observable<void> {
    this.logAction('delete', { id });
    const url = `${this.baseUrl}/${id}`;
    return this.monitor(url, this.http.delete<{ success?: boolean }>(url)).pipe(map(() => void 0));
  }

  restore(id: string): Observable<AdminCategory> {
    this.logAction('restore', { id });
    const url = `${this.adminBaseUrl}/${id}/restore`;
    return this.monitor(url, this.http.post<CategoryResponse>(url, {})).pipe(
      map((response) => this.normalizeCategory(response.category))
    );
  }

  reorderChildren(parentId: string | null, ids: string[]): Observable<AdminCategory[]> {
    const id = parentId ?? 'root';
    const url = `${this.adminBaseUrl}/${id}/reorder`;
    return this.monitor(url, this.http.post<{ items: AdminCategory[] }>(url, { ids }), { parentId, ids }).pipe(
      map((response) => (response?.items || []).map((item) => this.normalizeCategory(item)))
    );
  }

  bulkDelete(ids: string[]): Observable<void[]> {
    if (!ids.length) {
      return of([]);
    }
    const operations = ids.map((id) => this.delete(id));
    return forkJoin(operations);
  }

  bulkRestore(ids: string[]): Observable<AdminCategory[]> {
    if (!ids.length) {
      return of([]);
    }
    const operations = ids.map((id) => this.restore(id));
    return forkJoin(operations);
  }

  bulkReassignParent(ids: string[], parentId: string | null): Observable<AdminCategory[]> {
    if (!ids.length) {
      return of([]);
    }
    const operations = ids.map((id) => this.update(id, { parent: parentId }));
    return forkJoin(operations);
  }

  private monitor<T>(url: string, stream: Observable<T>, payload?: unknown): Observable<T> {
    this.logRequest(url, payload);
    return stream.pipe(
      tap((response) => this.logResponse(url, response)),
      catchError((error) => {
        this.logError(url, error);
        return throwError(() => error);
      })
    );
  }

  private mapPaginatedResponse(response: CategoryListResponse): Paginated<AdminCategory> {
    const items = Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
        ? response.data
        : [];

    const normalized = items.map((item) => this.normalizeCategory(item));

    const total = typeof response?.total === 'number'
      ? response.total
      : typeof response?.pagination?.total === 'number'
        ? response.pagination.total
        : normalized.length;
    const page = typeof response?.page === 'number'
      ? response.page
      : typeof response?.pagination?.page === 'number'
        ? response.pagination.page
        : 1;
    const pages = typeof response?.pages === 'number'
      ? response.pages
      : typeof response?.pagination?.pages === 'number'
        ? response.pagination.pages
        : 1;
    const limit = typeof response?.pagination?.limit === 'number' ? response.pagination.limit : undefined;

    return {
      data: normalized,
      items: normalized,
      total,
      page,
      pages,
      pagination: limit !== undefined ? { page, limit, total, pages } : undefined
    };
  }

  private normalizeCategory(category: AdminCategory): AdminCategory {
    if (!category) {
      return category;
    }
    const parentId = typeof category.parent === 'string'
      ? category.parent
      : category.parent?._id ?? null;

    const status: 'active' | 'inactive' | 'deleted' = category.deletedAt
      ? 'deleted'
      : category.isActive === false
        ? 'inactive'
        : 'active';

    return {
      ...category,
      id: category.id ?? category._id,
      parentId,
      status,
      imageUrl: (category as any).imageUrl ?? (category as any).image ?? null,
      bannerUrl: (category as any).bannerUrl ?? null,
      iconUrl: (category as any).iconUrl ?? null
    };
  }

  private logRequest(url: string, payload?: unknown): void {
    if (!environment.production) {
      console.log('[Categories] API Request:', url, payload ?? {});
    }
  }

  private logResponse(url: string, payload: unknown): void {
    if (!environment.production) {
      console.log('[Categories] API Response:', url, payload);
    }
  }

  private logError(url: string, error: any): void {
    if (!environment.production) {
      const code = error?.error?.error?.code ?? error?.status ?? 'UNKNOWN';
      const message = error?.error?.error?.message ?? error?.message ?? 'Unknown error';
      console.error('[Categories] API Error:', code, message);
    }
  }

  private logAction(action: 'create' | 'update' | 'delete' | 'restore', payload: unknown): void {
    if (!environment.production) {
      console.log(`Category action: ${action} →`, payload);
    }
  }
}
