import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ApiResponse, Paginated, Refund, RefundFilters } from './api.types';

interface RefundListResponse extends Paginated<Refund> {
  data?: Refund[];
  items?: Refund[];
}

@Injectable({ providedIn: 'root' })
export class RefundsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  constructor(private readonly http: HttpClient) {}

  getRefunds(filters: RefundFilters = {}): Observable<Paginated<Refund>> {
    let params = new HttpParams();

    if (filters.orderId) params = params.set('orderId', filters.orderId);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http
      .get<RefundListResponse>(`${this.baseUrl}/refunds`, { params })
      .pipe(map((response) => this.normalizeList(response)));
  }

  getRefund(id: string): Observable<Refund> {
    return this.http
      .get<ApiResponse<Refund>>(`${this.baseUrl}/refunds/${id}`)
      .pipe(map((response) => response.data ?? (response as unknown as Refund)));
  }

  exportRefunds(filters: RefundFilters = {}): Observable<Blob> {
    let params = new HttpParams().set('export', 'csv');

    if (filters.orderId) params = params.set('orderId', filters.orderId);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);

    return this.http.get(`${this.baseUrl}/refunds`, {
      params,
      responseType: 'blob'
    });
  }

  private normalizeList(response: RefundListResponse): Paginated<Refund> {
    const items = response.data ?? response.items ?? [];
    return {
      data: items,
      items,
      total: response.total ?? response.pagination?.total ?? items.length,
      page: response.page ?? response.pagination?.page ?? 1,
      pages: response.pages ?? response.pagination?.pages ?? 1,
      pagination: response.pagination
    };
  }
}
