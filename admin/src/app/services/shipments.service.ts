import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  ApiResponse,
  Paginated,
  Shipment,
  ShipmentFilters
} from './api.types';

export interface CreateShipmentItemPayload {
  itemId: string;
  quantity: number;
}

export interface CreateShipmentPayload {
  carrier: string;
  tracking?: string;
  service?: string;
  items: CreateShipmentItemPayload[];
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class ShipmentsService {
  private readonly baseUrl = `${environment.apiBaseUrl}/admin`;

  constructor(private readonly http: HttpClient) {}

  getShipments(filters: ShipmentFilters = {}): Observable<Paginated<Shipment>> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.carrier) params = params.set('carrier', filters.carrier);
    if (filters.orderId) params = params.set('orderId', filters.orderId);
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);
    if (filters.page) params = params.set('page', String(filters.page));
    if (filters.limit) params = params.set('limit', String(filters.limit));
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http
      .get<Paginated<Shipment>>(`${this.baseUrl}/shipments`, { params })
      .pipe(map((response) => this.normalizeList(response)));
  }

  getShipment(id: string): Observable<Shipment> {
    return this.http
      .get<ApiResponse<Shipment>>(`${this.baseUrl}/shipments/${id}`)
      .pipe(map((response) => response.data ?? (response as unknown as Shipment)));
  }

  getShipmentsForOrder(orderId: string): Observable<Paginated<Shipment>> {
    return this.http
      .get<Paginated<Shipment>>(`${this.baseUrl}/orders/${orderId}/shipments`)
      .pipe(map((response) => this.normalizeList(response)));
  }

  createShipment(orderId: string, payload: CreateShipmentPayload): Observable<Shipment> {
    const body: CreateShipmentPayload = {
      ...payload,
      tracking: payload.tracking || undefined,
      service: payload.service || undefined,
      items: payload.items.map((item) => ({ ...item }))
    };

    return this.http
      .post<ApiResponse<Shipment>>(`${this.baseUrl}/orders/${orderId}/shipments`, body, {
        headers: { 'Idempotency-Key': this.generateIdempotencyKey() }
      })
      .pipe(map((response) => response.data ?? (response as unknown as Shipment)));
  }

  private normalizeList(response: Paginated<Shipment>): Paginated<Shipment> {
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

  private generateIdempotencyKey(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }

    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
