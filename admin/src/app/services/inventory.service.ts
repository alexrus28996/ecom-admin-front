import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  InventorySnapshot,
  InventoryAdjustment,
  InventoryAdjustmentReason,
  Paginated,
  ApiResponse,
  PaginationParams,
  SortParams
} from './api.types';

export interface InventoryFilters extends PaginationParams, SortParams {
  product?: string;
  variant?: string;
  location?: string;
  status?: 'in-stock' | 'low' | 'out-of-stock';
}

export interface InventoryAdjustmentFilters extends PaginationParams, SortParams {
  product?: string;
  variant?: string;
  reason?: InventoryAdjustmentReason;
  dateStart?: string;
  dateEnd?: string;
}

export interface CreateAdjustmentRequest {
  product: string;
  variant?: string;
  quantityChange: number;
  reason: InventoryAdjustmentReason;
  note?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // Admin endpoints
  getInventoryOverview(filters: InventoryFilters = {}): Observable<Paginated<InventorySnapshot>> {
    let params = new HttpParams();

    if (filters.product) params = params.set('product', filters.product);
    if (filters.variant) params = params.set('variant', filters.variant);
    if (filters.location) params = params.set('location', filters.location);
    if (filters.status) params = params.set('status', filters.status);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<InventorySnapshot>>(`${this.baseUrl}/admin/inventory`, { params });
  }

  getInventoryAdjustments(filters: InventoryAdjustmentFilters = {}): Observable<Paginated<InventoryAdjustment>> {
    let params = new HttpParams();

    if (filters.product) params = params.set('product', filters.product);
    if (filters.variant) params = params.set('variant', filters.variant);
    if (filters.reason) params = params.set('reason', filters.reason);
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<InventoryAdjustment>>(`${this.baseUrl}/admin/inventory/adjustments`, { params });
  }

  createInventoryAdjustment(adjustmentData: CreateAdjustmentRequest): Observable<InventoryAdjustment> {
    return this.http.post<ApiResponse<InventoryAdjustment>>(`${this.baseUrl}/admin/inventory/adjustments`, adjustmentData, {
      headers: { 'Idempotency-Key': this.generateIdempotencyKey() }
    }).pipe(map(response => response.data!));
  }

  getLowStockItems(filters: Partial<InventoryFilters> = {}): Observable<Paginated<InventorySnapshot>> {
    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<InventorySnapshot>>(`${this.baseUrl}/admin/inventory/low`, { params });
  }

  // Backward compatibility methods
  list(params: any = {}): Observable<Paginated<InventorySnapshot>> {
    const filters: InventoryFilters = {
      product: params.product,
      variant: params.variant,
      location: params.location,
      status: params.status,
      page: params.page,
      limit: params.limit,
      sort: params.sort
    };

    return this.getInventoryOverview(filters);
  }

  listAdjustments(params: any = {}): Observable<Paginated<InventoryAdjustment>> {
    const filters: InventoryAdjustmentFilters = {
      product: params.product,
      variant: params.variant,
      reason: params.reason,
      page: params.page,
      limit: params.limit,
      sort: params.sort
    };

    return this.getInventoryAdjustments(filters);
  }

  listLowStock(params: any = {}): Observable<Paginated<InventorySnapshot>> {
    const filters: Partial<InventoryFilters> = {
      page: params.page,
      limit: params.limit,
      sort: params.sort
    };

    return this.getLowStockItems(filters);
  }

  createAdjustment(payload: any): Observable<{ adjustment: InventoryAdjustment; product?: any; inventory?: InventorySnapshot }> {
    // Map old payload format to new format
    const adjustmentData: CreateAdjustmentRequest = {
      product: payload.productId || payload.product,
      variant: payload.variantId || payload.variant,
      quantityChange: payload.qtyChange || payload.quantityChange,
      reason: payload.reason || 'manual',
      note: payload.note,
      location: payload.location
    };

    return this.createInventoryAdjustment(adjustmentData).pipe(
      map(adjustment => ({
        adjustment,
        product: undefined,
        inventory: undefined
      }))
    );
  }

  private generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}