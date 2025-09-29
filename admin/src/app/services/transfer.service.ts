import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { ApiResponse, Paginated, PaginationParams, SortParams, TransferOrder, TransferStatus } from './api.types';

export interface TransferLinePayload {
  productId: string;
  variantId?: string;
  quantity: number;
}

export interface CreateTransferPayload {
  fromLocationId: string;
  toLocationId: string;
  lines: TransferLinePayload[];
  metadata?: Record<string, unknown> | null;
}

export interface TransferQuery extends PaginationParams, SortParams {
  [key: string]: string | number | boolean | undefined;
  status?: TransferStatus;
  fromLocationId?: string;
  toLocationId?: string;
  from?: string;
  to?: string;
}

export interface TransferStatusPayload {
  status: TransferStatus;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin/inventory/transfers`;

  constructor(private readonly http: HttpClient) {}

  list(query: TransferQuery = {}): Observable<Paginated<TransferOrder>> {
    const params = this.buildParams(query);
    return this.http.get<Paginated<TransferOrder>>(this.baseUrl, { params });
  }

  create(payload: CreateTransferPayload): Observable<TransferOrder> {
    return this.http
      .post<ApiResponse<TransferOrder>>(this.baseUrl, payload)
      .pipe(map((response) => response.data ?? (response as unknown as { transfer: TransferOrder }).transfer));
  }

  updateStatus(id: string, payload: TransferStatusPayload): Observable<TransferOrder> {
    return this.http
      .patch<ApiResponse<TransferOrder>>(`${this.baseUrl}/${id}/status`, payload)
      .pipe(map((response) => response.data ?? (response as unknown as { transfer: TransferOrder }).transfer));
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
