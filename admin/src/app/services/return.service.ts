import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paginated, MoneyAmount } from './api.types';

export type ReturnStatus = 'pending' | 'approved' | 'rejected' | 'refunded';

export interface ReturnItem {
  product: string;
  variant?: string | null;
  quantity: number;
  amount?: number | MoneyAmount | null;
}

export interface ReturnRequest {
  _id: string;
  order: string;
  user?: string | null;
  status: ReturnStatus;
  reason?: string | null;
  items: ReturnItem[];
  amount?: number | MoneyAmount | null;
  refund?: any;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class ReturnService {
  private readonly base = `${environment.apiBaseUrl}/orders`;
  private readonly adminBase = `${environment.apiBaseUrl}/admin/returns`;

  constructor(private readonly http: HttpClient) {}

  requestReturn(orderId: string, payload: { reason?: string; items?: ReturnItem[] }): Observable<{ return: ReturnRequest }> {
    return this.http.post<{ return: ReturnRequest }>(`${this.base}/${orderId}/returns`, payload);
  }

  adminList(params: { status?: ReturnStatus; page?: number; limit?: number } = {}): Observable<Paginated<ReturnRequest>> {
    let httpParams = new HttpParams();
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<ReturnRequest>>(this.adminBase, { params: httpParams });
  }

  adminGet(id: string): Observable<{ return: ReturnRequest }> {
    return this.http.get<{ return: ReturnRequest }>(`${this.adminBase}/${id}`);
  }

  approve(id: string, payload: { items?: ReturnItem[]; amount?: number | MoneyAmount }): Observable<{ return: ReturnRequest; order?: any; refund?: any }> {
    return this.http.post<{ return: ReturnRequest; order?: any; refund?: any }>(`${this.adminBase}/${id}/approve`, payload ?? {});
  }

  reject(id: string, payload: { reason?: string } = {}): Observable<{ return: ReturnRequest }> {
    return this.http.post<{ return: ReturnRequest }>(`${this.adminBase}/${id}/reject`, payload);
  }
}
