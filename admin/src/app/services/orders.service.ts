import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface OrderItem { product: string; name: string; price: number; currency: string; quantity: number; }
export interface Order { _id: string; items: OrderItem[]; subtotal: number; shipping: number; tax: number; total: number; currency: string; status: string; paymentStatus: string; createdAt?: string; }
export interface Paginated<T> { items: T[]; total: number; page: number; pages: number; }
export interface OrderTimelineEntry { time: string; type: string; message?: string; data?: any }

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private base = `${environment.apiBaseUrl}/orders`;
  constructor(private http: HttpClient) {}

  create(payload: { shippingAddress?: any; shipping?: number; taxRate?: number }): Observable<{ order: Order }> {
    return this.http.post<{ order: Order }>(this.base, payload);
  }

  list(params: { page?: number; limit?: number } = {}): Observable<Paginated<Order>> {
    let p = new HttpParams();
    if (params.page) p = p.set('page', String(params.page));
    if (params.limit) p = p.set('limit', String(params.limit));
    return this.http.get<Paginated<Order>>(this.base, { params: p });
  }

  get(id: string): Observable<{ order: Order }> { return this.http.get<{ order: Order }>(`${this.base}/${id}`); }

  timeline(id: string, params: { page?: number; limit?: number } = {}): Observable<{ items: OrderTimelineEntry[]; total: number; page: number; pages: number }> {
    let p = new HttpParams();
    if (params.page) p = p.set('page', String(params.page));
    if (params.limit) p = p.set('limit', String(params.limit));
    return this.http.get<{ items: OrderTimelineEntry[]; total: number; page: number; pages: number }>(`${this.base}/${id}/timeline`, { params: p });
  }
}
