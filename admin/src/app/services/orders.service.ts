import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  Order,
  OrderFilters,
  OrderTimelineEvent,
  OrderItem,
  Paginated,
  ApiResponse,
  Address
} from './api.types';

// Export types for backward compatibility
export {
  Order,
  OrderTimelineEvent,
  OrderTimelineEvent as OrderTimelineEntry, // Alias for backward compatibility
  OrderItem,
  Address as OrderAddress
};

export interface CreateOrderRequest {
  shippingAddress?: Partial<Address>;
  billingAddress?: Partial<Address>;
  shipping?: number;
  taxRate?: number;
  idempotencyKey?: string;
}

export interface OrderStatusUpdatePayload {
  status?: string;
  paymentStatus?: string;
}

export interface OrderFulfillmentPayload {
  carrier?: string;
  trackingNumber?: string;
  items: Array<{ itemId: string; quantity: number }>;
  note?: string;
}

export interface OrderRefundPayload {
  items?: Array<{ itemId: string; quantity?: number; amount?: number }>;
  amount?: number;
  reason?: string;
  note?: string;
}

export interface OrderTimelinePayload {
  message: string;
  metadata?: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // User endpoints
  getUserOrders(filters: Partial<OrderFilters> = {}): Observable<Paginated<Order>> {
    let params = new HttpParams();

    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Order>>(`${this.baseUrl}/orders`, { params });
  }

  getUserOrder(id: string): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.baseUrl}/orders/${id}`)
      .pipe(map(response => response.data!));
  }

  getOrderTimeline(id: string): Observable<OrderTimelineEvent[]> {
    return this.http.get<ApiResponse<OrderTimelineEvent[]>>(`${this.baseUrl}/orders/${id}/timeline`)
      .pipe(map(response => response.data!));
  }

  getOrderInvoice(id: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/orders/${id}/invoice`, { responseType: 'blob' });
  }

  createOrder(orderData: CreateOrderRequest): Observable<Order> {
    const headers: any = {};
    if (orderData.idempotencyKey) {
      headers['Idempotency-Key'] = orderData.idempotencyKey;
    } else {
      headers['Idempotency-Key'] = this.generateIdempotencyKey();
    }

    return this.http.post<ApiResponse<Order>>(`${this.baseUrl}/orders`, orderData, { headers })
      .pipe(map(response => response.data!));
  }

  requestOrderReturn(orderId: string, returnData: any): Observable<{ success: boolean }> {
    return this.http.post<ApiResponse<{ success: boolean }>>(`${this.baseUrl}/orders/${orderId}/returns`, returnData)
      .pipe(map(response => response.data!));
  }

  // Admin endpoints
  getAdminOrders(filters: OrderFilters = {}): Observable<Paginated<Order>> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.paymentStatus) params = params.set('paymentStatus', filters.paymentStatus);
    if (filters.userId) params = params.set('userId', filters.userId);
    if (filters.userEmail) params = params.set('userEmail', filters.userEmail);
    if (filters.customer) params = params.set('customer', filters.customer);
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Order>>(`${this.baseUrl}/admin/orders`, { params });
  }

  getAdminOrder(id: string): Observable<Order> {
    return this.http.get<ApiResponse<Order>>(`${this.baseUrl}/admin/orders/${id}`)
      .pipe(map(response => response.data!));
  }

  updateAdminOrder(id: string, orderData: Partial<Order>): Observable<Order> {
    const cleanData = this.cleanOrderForSave(orderData);

    return this.http.patch<ApiResponse<Order>>(`${this.baseUrl}/admin/orders/${id}`, cleanData)
      .pipe(map(response => response.data!));
  }

  updateAdminOrderStatus(id: string, payload: OrderStatusUpdatePayload): Observable<Order> {
    return this.http
      .patch<ApiResponse<Order>>(`${this.baseUrl}/admin/orders/${id}`, payload)
      .pipe(map((response) => response.data!));
  }

  fulfillAdminOrder(id: string, payload: OrderFulfillmentPayload): Observable<Order> {
    return this.http
      .post<ApiResponse<Order>>(`${this.baseUrl}/admin/orders/${id}/fulfill`, payload)
      .pipe(map((response) => response.data!));
  }

  refundAdminOrder(id: string, payload: OrderRefundPayload): Observable<Order> {
    return this.http
      .post<ApiResponse<Order>>(`${this.baseUrl}/admin/orders/${id}/refund`, payload)
      .pipe(map((response) => response.data!));
  }

  addTimelineEntry(id: string, payload: OrderTimelinePayload): Observable<OrderTimelineEvent> {
    return this.http
      .post<ApiResponse<OrderTimelineEvent>>(`${this.baseUrl}/admin/orders/${id}/timeline`, payload)
      .pipe(map((response) => response.data!));
  }

  bulkUpdateAdminOrders(ids: string[], payload: OrderStatusUpdatePayload): Observable<Order[]> {
    if (!ids.length) {
      return of([]);
    }

    const requests = ids.map((orderId) => this.updateAdminOrderStatus(orderId, payload));
    return forkJoin(requests);
  }

  exportAdminOrders(filters: OrderFilters = {}): Observable<Blob> {
    let params = new HttpParams().set('format', 'csv');

    if (filters.status) params = params.set('status', filters.status);
    if (filters.paymentStatus) params = params.set('paymentStatus', filters.paymentStatus);
    if (filters.userId) params = params.set('userId', filters.userId);
    if (filters.userEmail) params = params.set('userEmail', filters.userEmail);
    if (filters.customer) params = params.set('customer', filters.customer);
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);

    return this.http.get(`${this.baseUrl}/admin/orders`, {
      params,
      responseType: 'blob'
    });
  }

  // Backward compatibility methods
  list(params: any = {}): Observable<Paginated<Order>> {
    // Map old parameter names to new ones for user orders
    const filters: Partial<OrderFilters> = {
      page: params.page,
      limit: params.limit,
      sort: params.sort
    };

    return this.getUserOrders(filters);
  }

  get(id: string): Observable<{ order: Order }> {
    return this.getUserOrder(id).pipe(
      map(order => ({ order }))
    );
  }

  timeline(id: string, params: any = {}): Observable<Paginated<OrderTimelineEvent>> {
    return this.getOrderTimeline(id).pipe(
      map(timeline => ({
        data: timeline,
        items: timeline,
        total: timeline.length,
        page: 1,
        pages: 1,
        pagination: {
          page: 1,
          limit: timeline.length,
          total: timeline.length,
          pages: 1
        }
      }))
    );
  }

  invoice(id: string): Observable<Blob> {
    return this.getOrderInvoice(id);
  }

  create(payload: CreateOrderRequest): Observable<{ order: Order }> {
    return this.createOrder(payload).pipe(
      map(order => ({ order }))
    );
  }

  adminList(params: any = {}): Observable<Paginated<Order>> {
    // Map old parameter names to new ones
    const filters: OrderFilters = {
      status: params.status,
      paymentStatus: params.paymentStatus,
      userId: params.user,
      userEmail: params.email,
      customer: params.customer,
      dateStart: params.from,
      dateEnd: params.to,
      page: params.page,
      limit: params.limit,
      sort: params.sort
    };

    return this.getAdminOrders(filters);
  }

  adminGet(id: string): Observable<{ order: Order }> {
    return this.getAdminOrder(id).pipe(
      map(order => ({ order }))
    );
  }

  adminUpdate(id: string, payload: any): Observable<{ order: Order }> {
    return this.updateAdminOrder(id, payload).pipe(
      map(order => ({ order }))
    );
  }

  adminCancel(id: string): Observable<{ order: Order }> {
    return this.updateAdminOrder(id, { status: 'cancelled' }).pipe(
      map(order => ({ order }))
    );
  }

  requestReturn(orderId: string): Observable<{ success?: boolean }> {
    return this.requestOrderReturn(orderId, {}).pipe(
      map(result => ({ success: result.success }))
    );
  }

  private cleanOrderForSave(orderData: Partial<Order>): any {
    const cleanData = { ...orderData };

    // Remove read-only fields
    delete cleanData._id;
    delete cleanData.createdAt;
    delete cleanData.updatedAt;
    delete cleanData.orderNumber;
    delete cleanData.timeline;

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

// Backward compatibility export
@Injectable({ providedIn: 'root' })
export class OrderService extends OrdersService {}