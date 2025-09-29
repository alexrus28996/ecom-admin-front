import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AdminUser {
  id: string;
  name?: string;
  email: string;
  roles: string[];
  isActive: boolean;
  createdAt?: string;
  status?: string;
}

export interface PermissionCatalogEntry {
  id: string;
  label?: string;
  description?: string;
  group?: string;
  category?: string;
}

export interface UserListResponse {
  items: AdminUser[];
  total: number;
  page: number;
  pages: number;
}

export interface UserPermissionsResponse {
  permissions: string[];
  available: PermissionCatalogEntry[];
}

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/users`;

  constructor(private readonly http: HttpClient) {}

  listUsers(params: { q?: string; page?: number; limit?: number } = {}): Observable<UserListResponse> {
    let httpParams = new HttpParams();
    if (params.q) {
      httpParams = httpParams.set('q', params.q);
    }
    if (params.page) {
      httpParams = httpParams.set('page', String(params.page));
    }
    if (params.limit) {
      httpParams = httpParams.set('limit', String(params.limit));
    }
    return this.http.get<any>(this.baseUrl, { params: httpParams }).pipe(
      map((response) => {
        const items = response?.items || response?.users || response?.data || [];
        const total = response?.total ?? response?.pagination?.total ?? items.length ?? 0;
        const page = response?.page ?? response?.pagination?.page ?? 1;
        const pages = response?.pages ?? response?.pagination?.pages ?? 1;
        return { items, total, page, pages } as UserListResponse;
      })
    );
  }

  getUser(id: string): Observable<AdminUser> {
    return this.http.get<{ user?: AdminUser }>(`${this.baseUrl}/${id}`).pipe(
      map((response) => response?.user || (response as unknown as AdminUser))
    );
  }

  updateUserStatus(id: string, isActive: boolean): Observable<AdminUser> {
    return this.http.patch<{ user?: AdminUser }>(`${this.baseUrl}/${id}`, { isActive }).pipe(
      map((response) => response?.user || (response as unknown as AdminUser))
    );
  }

  promoteUser(id: string): Observable<AdminUser> {
    return this.http.post<{ user?: AdminUser }>(`${this.baseUrl}/${id}/promote`, {}).pipe(
      map((response) => response?.user || (response as unknown as AdminUser))
    );
  }

  demoteUser(id: string): Observable<AdminUser> {
    return this.http.post<{ user?: AdminUser }>(`${this.baseUrl}/${id}/demote`, {}).pipe(
      map((response) => response?.user || (response as unknown as AdminUser))
    );
  }

  getUserPermissions(id: string): Observable<UserPermissionsResponse> {
    return this.http.get<any>(`${this.baseUrl}/${id}/permissions`).pipe(
      map((response) => {
        const permissions: string[] = response?.permissions || response?.data || [];
        const availableRaw =
          response?.available ||
          response?.availablePermissions ||
          response?.catalog ||
          response?.all ||
          [];
        const available: PermissionCatalogEntry[] = (availableRaw as any[]).map((entry) => {
          if (!entry) {
            return null;
          }
          if (typeof entry === 'string') {
            return { id: entry } as PermissionCatalogEntry;
          }
          return {
            id: entry.id || entry.permission || entry.code,
            label: entry.label || entry.name,
            description: entry.description || entry.help || entry.tooltip,
            group: entry.group || entry.category,
            category: entry.category || entry.group,
          } as PermissionCatalogEntry;
        }).filter((entry): entry is PermissionCatalogEntry => !!entry && !!entry.id);
        return { permissions, available } as UserPermissionsResponse;
      })
    );
  }

  replaceUserPermissions(id: string, permissions: string[]): Observable<string[]> {
    return this.http
      .post<{ permissions?: string[] }>(`${this.baseUrl}/${id}/permissions`, { permissions })
      .pipe(map((response) => response?.permissions || permissions));
  }

  addUserPermissions(id: string, permissions: string[]): Observable<string[]> {
    return this.http
      .patch<{ permissions?: string[] }>(`${this.baseUrl}/${id}/permissions/add`, { permissions })
      .pipe(map((response) => response?.permissions || permissions));
  }

  removeUserPermissions(id: string, permissions: string[]): Observable<string[]> {
    return this.http
      .patch<{ permissions?: string[] }>(`${this.baseUrl}/${id}/permissions/remove`, { permissions })
      .pipe(map((response) => response?.permissions || []));
  }
}
