import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paginated, MoneyAmount } from './api.types';

export interface OrderItem {
  product: string;
  variant?: string | null;
  name: string;
  price: number | MoneyAmount;
  currency: string;
  quantity: number;
  image?: string | null;
}

export interface OrderAddress {
  name?: string | null;
  company?: string | null;
  line1: string;
  line2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
}

export interface Order {
  _id: string;
  number?: string;
  user?: string | { _id: string; name: string; email?: string } | null;
  items: OrderItem[];
  subtotal: number | MoneyAmount;
  discount?: number | MoneyAmount | null;
  shipping?: number | MoneyAmount | null;
  tax?: number | MoneyAmount | null;
  total: number | MoneyAmount;
  currency: string;
  status: string;
  paymentStatus: string;
  couponCode?: string | null;
  shippingAddress?: OrderAddress | null;
  billingAddress?: OrderAddress | null;
  invoiceUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OrderTimelineEntry {
  _id?: string;
  time?: string;
  createdAt?: string;
  type: string;
  message?: string | null;
  actor?: { _id?: string; name?: string } | null;
  data?: any;
}

export interface ListOrdersParams {
  page?: number;
  limit?: number;
}

export interface ListAdminOrdersParams extends ListOrdersParams {
  status?: string;
  paymentStatus?: string;
  user?: string;
  from?: string;
  to?: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  protected readonly base = `${environment.apiBaseUrl}/orders`;
  protected readonly adminBase = `${environment.apiBaseUrl}/admin/orders`;

  constructor(protected readonly http: HttpClient) {}

  create(payload: { shippingAddress?: any; billingAddress?: any; shipping?: number; taxRate?: number }): Observable<{ order: Order }> {
    return this.http.post<{ order: Order }>(this.base, payload);
  }

  list(params: ListOrdersParams = {}): Observable<Paginated<Order>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<Order>>(this.base, { params: httpParams });
  }

  get(id: string): Observable<{ order: Order }> {
    return this.http.get<{ order: Order }>(`${this.base}/${id}`);
  }

  timeline(id: string, params: ListOrdersParams = {}): Observable<Paginated<OrderTimelineEntry>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<OrderTimelineEntry>>(`${this.base}/${id}/timeline`, { params: httpParams });
  }

  invoice(id: string): Observable<Blob> {
    return this.http.get(`${this.base}/${id}/invoice`, { responseType: 'blob' });
  }

  adminList(params: ListAdminOrdersParams = {}): Observable<Paginated<Order>> {
    let httpParams = new HttpParams();
    if (params.status) httpParams = httpParams.set('status', params.status);
    if (params.paymentStatus) httpParams = httpParams.set('paymentStatus', params.paymentStatus);
    if (params.user) httpParams = httpParams.set('user', params.user);
    if (params.from) httpParams = httpParams.set('from', params.from);
    if (params.to) httpParams = httpParams.set('to', params.to);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<Order>>(this.adminBase, { params: httpParams });
  }

  adminGet(id: string): Observable<{ order: Order }> {
    return this.http.get<{ order: Order }>(`${this.adminBase}/${id}`);
  }

  adminUpdate(id: string, payload: { status?: string; paymentStatus?: string }): Observable<{ order: Order }> {
    return this.http.patch<{ order: Order }>(`${this.adminBase}/${id}`, payload);
  }
}

@Injectable({ providedIn: 'root' })
export class OrdersService extends OrderService {}
