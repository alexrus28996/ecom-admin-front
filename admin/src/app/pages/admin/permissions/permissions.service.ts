import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, isDevMode } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface PermissionUser {
  id: string;
  name?: string;
  email: string;
  avatarUrl?: string;
  roles: string[];
  status?: 'active' | 'inactive';
  isActive?: boolean;
}

export interface PaginatedUsersResponse {
  items: PermissionUser[];
  total: number;
  page: number;
  limit: number;
}

export interface PermissionDefinition {
  code: string;
  label?: string;
  description?: string;
  domain?: string;
}

export interface UserPermissionPayload {
  permissions: string[];
  available: PermissionDefinition[];
}

export interface ListUsersQuery {
  page?: number;
  limit?: number;
  q?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/users`;

  constructor(private readonly http: HttpClient) {}

  listUsers(query: ListUsersQuery): Observable<PaginatedUsersResponse> {
    const params = this.buildParams(query);
    this.logRequest('GET', `${this.baseUrl}`, params);
    return this.http.get<any>(this.baseUrl, { params }).pipe(
      tap((response) => this.logResponse('GET', this.baseUrl, response)),
      map((response) => this.normalizeUserResponse(response)),
      catchError((error) => this.handleError('GET', this.baseUrl, error))
    );
  }

  getUserPermissions(userId: string): Observable<UserPermissionPayload> {
    const url = `${this.baseUrl}/${userId}/permissions`;
    this.logRequest('GET', url);
    return this.http.get<any>(url).pipe(
      tap((response) => this.logResponse('GET', url, response)),
      map((response) => this.normalizePermissionResponse(response)),
      catchError((error) => this.handleError('GET', url, error))
    );
  }

  replaceUserPermissions(userId: string, permissions: string[]): Observable<string[]> {
    const url = `${this.baseUrl}/${userId}/permissions`;
    const payload = { permissions };
    this.logRequest('POST', url, payload);
    return this.http.post<{ permissions?: string[] }>(url, payload).pipe(
      tap((response) => this.logResponse('POST', url, response)),
      map((response) => response?.permissions || permissions),
      catchError((error) => this.handleError('POST', url, error))
    );
  }

  addUserPermissions(userId: string, permissions: string[]): Observable<string[]> {
    const url = `${this.baseUrl}/${userId}/permissions/add`;
    const payload = { permissions };
    this.logRequest('PATCH', url, payload);
    return this.http.patch<{ permissions?: string[] }>(url, payload).pipe(
      tap((response) => this.logResponse('PATCH', url, response)),
      map((response) => response?.permissions || permissions),
      catchError((error) => this.handleError('PATCH', url, error))
    );
  }

  removeUserPermissions(userId: string, permissions: string[]): Observable<string[]> {
    const url = `${this.baseUrl}/${userId}/permissions/remove`;
    const payload = { permissions };
    this.logRequest('PATCH', url, payload);
    return this.http.patch<{ permissions?: string[] }>(url, payload).pipe(
      tap((response) => this.logResponse('PATCH', url, response)),
      map((response) => response?.permissions || []),
      catchError((error) => this.handleError('PATCH', url, error))
    );
  }

  private buildParams(query: ListUsersQuery): HttpParams {
    let params = new HttpParams();
    if (query.page) {
      params = params.set('page', query.page.toString());
    }
    if (query.limit) {
      params = params.set('limit', query.limit.toString());
    }
    if (query.q) {
      params = params.set('q', query.q);
    }
    if (query.sort) {
      params = params.set('sort', query.sort);
      if (query.direction) {
        params = params.set('direction', query.direction);
      }
    }
    return params;
  }

  private normalizeUserResponse(raw: any): PaginatedUsersResponse {
    const items = (raw?.items || raw?.users || raw?.data || []) as any[];
    const mapped = items.map((user) => ({
      id: user.id,
      name: user.name || user.fullName || user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl || user.avatar || user.imageUrl,
      roles: Array.isArray(user.roles) ? user.roles : [],
      status: user.status || (user.isActive === false ? 'inactive' : 'active'),
      isActive: user.isActive ?? (user.status ? user.status !== 'inactive' : true),
    }));
    const total = Number(raw?.total ?? raw?.pagination?.total ?? mapped.length ?? 0);
    const page = Number(raw?.page ?? raw?.pagination?.page ?? 1);
    const limit = Number(raw?.limit ?? raw?.pagination?.limit ?? raw?.perPage ?? mapped.length ?? 25);
    return { items: mapped, total, page, limit };
  }

  private normalizePermissionResponse(raw: any): UserPermissionPayload {
    const permissions: string[] = raw?.permissions || raw?.data || [];
    const availableRaw =
      raw?.available || raw?.availablePermissions || raw?.catalog || raw?.all || [];
    const available: PermissionDefinition[] = (availableRaw as any[])
      .map((entry) => {
        if (!entry) {
          return null;
        }
        if (typeof entry === 'string') {
          return { code: entry } as PermissionDefinition;
        }
        return {
          code: entry.id || entry.code || entry.permission,
          label: entry.label || entry.name,
          description: entry.description || entry.help || entry.tooltip,
          domain: entry.domain || entry.group || entry.category,
        } as PermissionDefinition;
      })
      .filter((entry): entry is PermissionDefinition => !!entry && !!entry.code);

    return { permissions, available };
  }

  private handleError(method: string, url: string, error: any): Observable<never> {
    this.logError(method, url, error);
    return throwError(() => error);
  }

  private logRequest(method: string, url: string, payload?: unknown): void {
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.log('[Permissions] API Request:', { method, url, payload });
    }
  }

  private logResponse(method: string, url: string, response: unknown): void {
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.log('[Permissions] API Response:', { method, url, response });
    }
  }

  private logError(method: string, url: string, error: unknown): void {
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.error('[Permissions] API Error:', { method, url, error });
    }
  }
}
