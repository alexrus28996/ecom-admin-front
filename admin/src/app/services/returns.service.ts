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

  getReturn(id: string): Observable<Return> {
    return this.http.get<ApiResponse<Return>>(`${this.baseUrl}/admin/returns/${id}`)
      .pipe(map((response) => response.data!));
  }

  approveReturn(id: string, payload: { items?: Array<{ itemId: string; quantity?: number }>; refundAmount?: number; note?: string } = {}): Observable<Return> {
    return this.http.post<ApiResponse<Return>>(`${this.baseUrl}/admin/returns/${id}/approve`, payload)
      .pipe(map(response => response.data!));
  }

  rejectReturn(id: string, reason?: string, note?: string): Observable<Return> {
    const payload: Record<string, unknown> = {};
    if (reason) {
      payload['reason'] = reason;
    }
    if (note) {
      payload['note'] = note;
    }

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

  approve(id: string, payload: { items?: Array<{ itemId: string; quantity?: number }>; refundAmount?: number; note?: string } = {}): Observable<{ success: boolean }> {
    return this.approveReturn(id, payload).pipe(
      map(() => ({ success: true }))
    );
  }

  reject(id: string, reason?: string, note?: string): Observable<{ success: boolean }> {
    return this.rejectReturn(id, reason, note).pipe(
      map(() => ({ success: true }))
    );
  }
}