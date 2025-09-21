import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MetricSummary, HealthStatus } from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = `${environment.apiBaseUrl}/admin`;
  constructor(private http: HttpClient) {}

  getMetrics(): Observable<MetricSummary> {
    return this.http.get<MetricSummary>(`${this.base}/metrics`);
  }

  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${environment.apiBaseUrl.replace(/\/api$/, '')}/health`);
  }

  promoteUser(userId: string): Observable<{ user: any }> {
    return this.http.post<{ user: any }>(`${this.base}/users/${userId}/promote`, {});
  }

  demoteUser(userId: string): Observable<{ user: any }> {
    return this.http.post<{ user: any }>(`${this.base}/users/${userId}/demote`, {});
  }

  listUsers(params: { q?: string; page?: number; limit?: number } = {}): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    let query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number; }>(`${this.base}/users${qs ? ('?' + qs) : ''}`);
  }

  getUser(id: string): Observable<{ user: any }> {
    return this.http.get<{ user: any }>(`${this.base}/users/${id}`);
  }

  updateUserActive(id: string, isActive: boolean): Observable<{ user: any }> {
    return this.http.patch<{ user: any }>(`${this.base}/users/${id}`, { isActive });
  }

  listOrders(params: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
  } = {}): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    const usp = new URLSearchParams();
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    if (params.status) usp.set('status', params.status);
    if (params.paymentStatus) usp.set('paymentStatus', params.paymentStatus);
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number; }>(`${this.base}/orders${qs ? ('?' + qs) : ''}`);
  }

  getOrder(id: string): Observable<{ order: any }> { return this.http.get<{ order: any }>(`${this.base}/orders/${id}`); }

  updateOrder(id: string, payload: { status?: string; paymentStatus?: string }): Observable<{ order: any }> {
    return this.http.patch<{ order: any }>(`${this.base}/orders/${id}`, payload);
  }

  // Returns console
  listReturns(params: { status?: 'requested'|'approved'|'rejected'|'refunded'; page?: number; limit?: number } = {})
    : Observable<{ items: any[]; total: number; page: number; pages: number; }>
  {
    const usp = new URLSearchParams();
    if (params.status) usp.set('status', params.status);
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number; }>(`${this.base}/returns${qs ? ('?' + qs) : ''}`);
  }

  approveReturn(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.base}/returns/${id}/approve`, {});
  }

  rejectReturn(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.base}/returns/${id}/reject`, {});
  }

  // Inventory
  listInventory(params: { product?: string; variant?: string; location?: string; page?: number; limit?: number } = {})
    : Observable<{ items: any[]; total: number; page: number; pages: number }>
  {
    const usp = new URLSearchParams();
    if (params.product) usp.set('product', params.product);
    if (params.variant) usp.set('variant', params.variant);
    if (params.location) usp.set('location', params.location);
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number }>(`${this.base}/inventory${qs ? ('?' + qs) : ''}`);
  }

  listInventoryAdjustments(params: { product?: string; variant?: string; reason?: string; page?: number; limit?: number } = {})
    : Observable<{ items: any[]; total: number; page: number; pages: number }>
  {
    const usp = new URLSearchParams();
    if (params.product) usp.set('product', params.product);
    if (params.variant) usp.set('variant', params.variant);
    if (params.reason) usp.set('reason', params.reason);
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number }>(`${this.base}/inventory/adjustments${qs ? ('?' + qs) : ''}`);
  }

  createInventoryAdjustment(payload: { productId: string; variantId?: string; qtyChange: number; reason?: string; note?: string })
    : Observable<{ success?: boolean }>
  {
    return this.http.post<{ success?: boolean }>(`${this.base}/inventory/adjustments`, payload);
  }

  listLowStock(params: { threshold?: number; page?: number; limit?: number } = {})
    : Observable<{ items: any[]; total: number; page: number; pages: number }>
  {
    const usp = new URLSearchParams();
    if (typeof params.threshold === 'number') usp.set('threshold', String(params.threshold));
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number }>(`${this.base}/inventory/low${qs ? ('?' + qs) : ''}`);
  }

  listCategories(params: { q?: string; page?: number; limit?: number; parent?: string|null } = {}): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    const usp = new URLSearchParams();
    if (params.q) usp.set('q', params.q);
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    if (params.parent !== undefined) usp.set('parent', params.parent === null ? '' : String(params.parent));
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number; }>(`${environment.apiBaseUrl}/categories${qs ? ('?' + qs) : ''}`);
  }

  getCategory(id: string): Observable<{ category: any }> { return this.http.get<{ category: any }>(`${environment.apiBaseUrl}/categories/${id}`); }

  createCategory(payload: { name: string; slug?: string; description?: string; parent?: string|null }): Observable<{ category: any }> {
    return this.http.post<{ category: any }>(`${environment.apiBaseUrl}/categories`, payload);
  }

  updateCategory(id: string, payload: { name: string; slug?: string; description?: string; parent?: string|null }): Observable<{ category: any }> {
    return this.http.put<{ category: any }>(`${environment.apiBaseUrl}/categories/${id}`, payload);
  }

  deleteCategory(id: string): Observable<{ success: boolean }> { return this.http.delete<{ success: boolean }>(`${environment.apiBaseUrl}/categories/${id}`); }

  listChildren(id: string, params: { page?: number; limit?: number } = {}): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    const usp = new URLSearchParams();
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number; }>(`${environment.apiBaseUrl}/categories/${id}/children${qs ? ('?' + qs) : ''}`);
  }

  reorderChildren(id: string, ids: string[]): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    return this.http.post<{ items: any[]; total: number; page: number; pages: number; }>(`${environment.apiBaseUrl}/categories/${id}/reorder`, { ids });
  }
}
