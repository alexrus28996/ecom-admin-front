import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  InventoryAdjustment,
  InventoryAdjustmentReason,
  InventoryDirection,
  InventoryReservation,
  Paginated,
  PaginationParams,
  ReservationStatus,
  SortParams,
  StockItem,
  StockLedgerEntry
} from './api.types';

export interface InventoryQuery extends PaginationParams, SortParams {
  [key: string]: string | number | boolean | undefined;
  productId?: string;
  variantId?: string;
  locationId?: string;
  search?: string;
}

export interface LowStockQuery extends PaginationParams, SortParams {
  [key: string]: string | number | boolean | undefined;
  productId?: string;
  variantId?: string;
  locationId?: string;
}

export interface ReservationQuery extends PaginationParams, SortParams {
  [key: string]: string | number | boolean | undefined;
  productId?: string;
  variantId?: string;
  status?: ReservationStatus;
}

export interface LedgerQuery extends PaginationParams, SortParams {
  [key: string]: string | number | boolean | undefined;
  productId?: string;
  variantId?: string;
  locationId?: string;
  direction?: InventoryDirection;
  reason?: InventoryAdjustmentReason;
  from?: string;
  to?: string;
}

export interface CreateAdjustmentRequest {
  productId: string;
  variantId?: string;
  locationId?: string;
  quantityChange: number;
  reason: InventoryAdjustmentReason;
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  constructor(private readonly http: HttpClient) {}

  getInventory(query: InventoryQuery = {}): Observable<Paginated<StockItem>> {
    const params = this.buildParams(query);
    return this.http.get<Paginated<StockItem>>(`${this.baseUrl}/inventory`, { params });
  }

  getLowStock(query: LowStockQuery = {}): Observable<Paginated<StockItem>> {
    const params = this.buildParams(query);
    return this.http.get<Paginated<StockItem>>(`${this.baseUrl}/inventory/low`, { params });
  }

  createAdjustment(payload: CreateAdjustmentRequest): Observable<InventoryAdjustment> {
    return this.http
      .post<ApiResponse<InventoryAdjustment>>(
        `${this.baseUrl}/inventory/adjustments`,
        payload,
        { headers: { 'Idempotency-Key': this.generateIdempotencyKey() } }
      )
      .pipe(map((response) => response.data ?? (response as unknown as InventoryAdjustment)));
  }

  getReservations(query: ReservationQuery = {}): Observable<Paginated<InventoryReservation>> {
    const params = this.buildParams(query);
    return this.http.get<Paginated<InventoryReservation>>(`${this.baseUrl}/reservations`, { params });
  }

  releaseReservation(id: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/reservations/${id}/release`, {});
  }

  getLedger(query: LedgerQuery = {}): Observable<Paginated<StockLedgerEntry>> {
    const params = this.buildParams(query);
    return this.http.get<Paginated<StockLedgerEntry>>(`${this.baseUrl}/inventory/ledger`, { params });
  }

  // Legacy compatibility methods -------------------------------------------------

  list(params: any = {}): Observable<Paginated<StockItem>> {
    const query: InventoryQuery = {
      productId: params.productId || params.product,
      variantId: params.variantId || params.variant,
      locationId: params.locationId || params.location,
      search: params.search,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      order: params.order
    };
    return this.getInventory(query);
  }

  listLowStock(params: any = {}): Observable<Paginated<StockItem>> {
    const query: LowStockQuery = {
      productId: params.productId || params.product,
      variantId: params.variantId || params.variant,
      locationId: params.locationId || params.location,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      order: params.order
    };
    return this.getLowStock(query);
  }

  listAdjustments(params: any = {}): Observable<Paginated<InventoryAdjustment>> {
    const queryParams = this.buildParams({
      productId: params.productId || params.product,
      variantId: params.variantId || params.variant,
      locationId: params.locationId || params.location,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      order: params.order
    });
    return this.http.get<Paginated<InventoryAdjustment>>(`${this.baseUrl}/inventory/adjustments`, { params: queryParams });
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

  private generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
