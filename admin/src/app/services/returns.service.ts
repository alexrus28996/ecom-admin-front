import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  Return,
  Paginated,
  ApiResponse,
  PaginationParams,
  SortParams,
  ReturnStatus
} from './api.types';

export interface ReturnFilters extends PaginationParams, SortParams {
  status?: ReturnStatus;
  orderId?: string;
  userId?: string;
  dateStart?: string;
  dateEnd?: string;
}

@Injectable({ providedIn: 'root' })
export class ReturnsService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // Admin endpoints
  getReturns(filters: ReturnFilters = {}): Observable<Paginated<Return>> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.orderId) params = params.set('orderId', filters.orderId);
    if (filters.userId) params = params.set('userId', filters.userId);
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Return>>(`${this.baseUrl}/admin/returns`, { params });
  }

  approveReturn(id: string): Observable<Return> {
    return this.http.post<ApiResponse<Return>>(`${this.baseUrl}/admin/returns/${id}/approve`, {})
      .pipe(map(response => response.data!));
  }

  rejectReturn(id: string, reason?: string): Observable<Return> {
    const payload = reason ? { reason } : {};

    return this.http.post<ApiResponse<Return>>(`${this.baseUrl}/admin/returns/${id}/reject`, payload)
      .pipe(map(response => response.data!));
  }

  // For backward compatibility
  list(filters: any = {}): Observable<Paginated<Return>> {
    const returnFilters: ReturnFilters = {
      status: filters.status,
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort
    };

    return this.getReturns(returnFilters);
  }

  approve(id: string): Observable<{ success: boolean }> {
    return this.approveReturn(id).pipe(
      map(() => ({ success: true }))
    );
  }

  reject(id: string, reason?: string): Observable<{ success: boolean }> {
    return this.rejectReturn(id, reason).pipe(
      map(() => ({ success: true }))
    );
  }
}