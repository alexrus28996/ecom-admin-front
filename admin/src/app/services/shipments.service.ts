import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  Shipment,
  ShipmentFilters,
  Paginated,
  ApiResponse
} from './api.types';

export interface CreateShipmentRequest {
  carrier: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  items: {
    orderItem: string;
    quantity: number;
  }[];
  note?: string;
}

@Injectable({ providedIn: 'root' })
export class ShipmentsService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // Admin endpoints only
  getShipments(filters: ShipmentFilters = {}): Observable<Paginated<Shipment>> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.carrier) params = params.set('carrier', filters.carrier);
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Shipment>>(`${this.baseUrl}/admin/shipments`, { params });
  }

  getShipment(id: string): Observable<Shipment> {
    return this.http.get<ApiResponse<Shipment>>(`${this.baseUrl}/admin/shipments/${id}`)
      .pipe(map(response => response.data!));
  }

  createShipmentForOrder(orderId: string, shipmentData: CreateShipmentRequest): Observable<Shipment> {
    return this.http.post<ApiResponse<Shipment>>(`${this.baseUrl}/admin/orders/${orderId}/shipments`, shipmentData, {
      headers: { 'Idempotency-Key': this.generateIdempotencyKey() }
    }).pipe(map(response => response.data!));
  }

  updateShipment(id: string, shipmentData: Partial<Shipment>): Observable<Shipment> {
    const cleanData = this.cleanShipmentForSave(shipmentData);

    return this.http.patch<ApiResponse<Shipment>>(`${this.baseUrl}/admin/shipments/${id}`, cleanData)
      .pipe(map(response => response.data!));
  }

  deleteShipment(id: string): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(`${this.baseUrl}/admin/shipments/${id}`)
      .pipe(map(response => response.data!));
  }

  private cleanShipmentForSave(shipmentData: Partial<Shipment>): any {
    const cleanData = { ...shipmentData };

    // Remove read-only fields
    delete cleanData._id;
    delete cleanData.createdAt;
    delete cleanData.updatedAt;
    delete cleanData.statusHistory;

    return cleanData;
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