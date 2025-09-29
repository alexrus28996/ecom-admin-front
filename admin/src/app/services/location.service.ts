import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ApiResponse, InventoryLocation, LocationType, Paginated, PaginationParams, SortParams } from './api.types';

export interface LocationQuery extends PaginationParams, SortParams {
  [key: string]: string | number | boolean | undefined;
  includeDeleted?: boolean;
  active?: boolean;
  type?: LocationType;
  search?: string;
}

export interface LocationPayload {
  code: string;
  name: string;
  type?: LocationType;
  geo?: InventoryLocation['geo'];
  priority?: number | null;
  active?: boolean;
  metadata?: Record<string, unknown> | null;
}

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/inventory/locations`;

  constructor(private readonly http: HttpClient) {}

  list(query: LocationQuery = {}): Observable<Paginated<InventoryLocation>> {
    const params = this.buildParams(query);
    return this.http.get<Paginated<InventoryLocation>>(this.baseUrl, { params });
  }

  get(id: string): Observable<InventoryLocation> {
    return this.http
      .get<ApiResponse<InventoryLocation>>(`${this.baseUrl}/${id}`)
      .pipe(map((response) => response.data ?? (response as unknown as { location: InventoryLocation }).location));
  }

  create(payload: LocationPayload): Observable<InventoryLocation> {
    return this.http
      .post<ApiResponse<InventoryLocation>>(this.baseUrl, payload)
      .pipe(map((response) => response.data ?? (response as unknown as { location: InventoryLocation }).location));
  }

  update(id: string, payload: Partial<LocationPayload>): Observable<InventoryLocation> {
    return this.http
      .put<ApiResponse<InventoryLocation>>(`${this.baseUrl}/${id}`, payload)
      .pipe(map((response) => response.data ?? (response as unknown as { location: InventoryLocation }).location));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  restore(id: string): Observable<InventoryLocation> {
    return this.http
      .post<ApiResponse<InventoryLocation>>(`${this.baseUrl}/${id}/restore`, {})
      .pipe(map((response) => response.data ?? (response as unknown as { location: InventoryLocation }).location));
  }

  export(query: LocationQuery = {}): Observable<Blob> {
    const params = this.buildParams({ ...query, format: 'csv' });
    return this.http.get(`${this.baseUrl}`, {
      params,
      responseType: 'blob'
    });
  }

  private buildParams(query: Record<string, unknown>): HttpParams {
    let params = new HttpParams();
    Object.entries(query)
      .filter(([, value]) => value !== undefined && value !== null && value !== '')
      .forEach(([key, value]) => {
        if (typeof value === 'number') {
          params = params.set(key, value.toString());
          return;
        }
        params = params.set(key, String(value));
      });
    return params;
  }
}
