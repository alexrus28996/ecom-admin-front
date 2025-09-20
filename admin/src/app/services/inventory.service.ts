import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paginated } from './api.types';

export interface InventorySnapshot {
  product: string;
  variant?: string | null;
  location?: string | null;
  quantity: number;
  reserved?: number;
  updatedAt?: string;
  productData?: { _id: string; name: string; sku?: string };
}

export type InventoryAdjustmentReason = 'manual' | 'restock' | 'damage' | string;

export interface InventoryAdjustment {
  _id: string;
  product: string;
  variant?: string | null;
  qtyChange: number;
  reason: InventoryAdjustmentReason;
  note?: string | null;
  location?: string | null;
  user?: string | { _id: string; name: string } | null;
  createdAt?: string;
}

export interface CreateAdjustmentInput {
  productId: string;
  variantId?: string;
  qtyChange: number;
  reason?: InventoryAdjustmentReason;
  note?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly base = `${environment.apiBaseUrl}/admin/inventory`;

  constructor(private readonly http: HttpClient) {}

  list(params: { product?: string; variant?: string; location?: string; page?: number; limit?: number } = {}): Observable<Paginated<InventorySnapshot>> {
    let httpParams = new HttpParams();
    if (params.product) httpParams = httpParams.set('product', params.product);
    if (params.variant) httpParams = httpParams.set('variant', params.variant);
    if (params.location) httpParams = httpParams.set('location', params.location);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<InventorySnapshot>>(this.base, { params: httpParams });
  }

  listAdjustments(params: { product?: string; variant?: string; reason?: string; page?: number; limit?: number } = {}): Observable<Paginated<InventoryAdjustment>> {
    let httpParams = new HttpParams();
    if (params.product) httpParams = httpParams.set('product', params.product);
    if (params.variant) httpParams = httpParams.set('variant', params.variant);
    if (params.reason) httpParams = httpParams.set('reason', params.reason);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<InventoryAdjustment>>(`${this.base}/adjustments`, { params: httpParams });
  }

  listLowStock(params: { threshold?: number; page?: number; limit?: number } = {}): Observable<Paginated<InventorySnapshot>> {
    let httpParams = new HttpParams();
    if (typeof params.threshold === 'number') httpParams = httpParams.set('threshold', String(params.threshold));
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<InventorySnapshot>>(`${this.base}/low`, { params: httpParams });
  }

  createAdjustment(payload: CreateAdjustmentInput): Observable<{ adjustment: InventoryAdjustment; product?: any; inventory?: InventorySnapshot }> {
    return this.http.post<{ adjustment: InventoryAdjustment; product?: any; inventory?: InventorySnapshot }>(`${this.base}/adjustments`, payload);
  }
}
