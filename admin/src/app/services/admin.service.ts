import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { MetricSummary, HealthStatus } from './dashboard.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = `${environment.apiBaseUrl}/admin`;
  constructor(private http: HttpClient) {}

  getMetrics(): Observable<MetricSummary> {
    return this.http.get<unknown>(`${this.base}/metrics`).pipe(map((response) => this.normalizeMetrics(response)));
  }

  getHealth(): Observable<HealthStatus> {
    return this.http.get<HealthStatus>(`${environment.apiBaseUrl.replace(/\/api$/, '')}/health`);
  }

  private normalizeMetrics(response: unknown): MetricSummary {
    const payload: any = (response as any)?.metrics ?? (response as any)?.data ?? response ?? {};

    const usersTotal = Number(payload.usersTotal ?? payload.users?.total ?? 0);
    const usersActive = Number(payload.usersActive ?? payload.users?.active ?? 0);
    const adminsCount = Number(payload.adminsCount ?? payload.users?.admins ?? 0);
    const productsTotal = Number(payload.productsCount ?? payload.products?.total ?? 0);
    const ordersTotal = Number(payload.ordersTotal ?? payload.orders?.total ?? 0);
    const ordersByStatus = payload.ordersByStatus ?? payload.orders?.byStatus ?? {};
    const revenueSeries = payload.revenueLast7Days ?? payload.revenue?.last7Days ?? [];
    const normalizedOrdersByStatus =
      ordersByStatus && typeof ordersByStatus === 'object'
        ? Object.entries(ordersByStatus).reduce<Record<string, number>>((acc, [status, value]) => {
            acc[status] = Number(value ?? 0);
            return acc;
          }, {})
        : {};

    return {
      users: {
        total: usersTotal,
        active: usersActive,
        admins: adminsCount
      },
      products: {
        total: productsTotal
      },
      orders: {
        total: ordersTotal,
        byStatus: normalizedOrdersByStatus
      },
      revenueLast7Days: Array.isArray(revenueSeries)
        ? revenueSeries.map((entry: any) => ({
            date: String(entry?.date ?? entry?.day ?? entry?.period ?? ''),
            total: Number(entry?.total ?? entry?.revenue ?? 0)
          }))
        : []
    };
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
    return this.http.get<any>(`${this.base}/orders${qs ? ('?' + qs) : ''}`).pipe(
      map(response => ({
        items: response.data || response.items || [],
        total: response.pagination?.total || response.total || 0,
        page: response.pagination?.page || response.page || 1,
        pages: response.pagination?.pages || response.pages || 1
      }))
    );
  }

  listReviews(params: {
    status?: string;
    rating?: number;
    from?: string;
    to?: string;
    product?: string;
    page?: number;
    limit?: number;
  } = {}): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    const usp = new URLSearchParams();
    if (params.status) usp.set('status', params.status);
    if (typeof params.rating === 'number' && !Number.isNaN(params.rating)) {
      usp.set('rating', String(params.rating));
    }
    if (params.from) usp.set('from', params.from);
    if (params.to) usp.set('to', params.to);
    if (params.product) usp.set('product', params.product);
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number; }>(`${this.base}/reviews${qs ? ('?' + qs) : ''}`);
  }

  approveReview(id: string): Observable<{ review: any }> {
    return this.http.patch<{ review: any }>(`${this.base}/reviews/${id}/approve`, {});
  }

  rejectReview(id: string): Observable<{ review: any }> {
    return this.http.patch<{ review: any }>(`${this.base}/reviews/${id}/reject`, {});
  }

  deleteReview(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/reviews/${id}`);
  }

  getOrder(id: string): Observable<{ order: any }> { return this.http.get<{ order: any }>(`${this.base}/orders/${id}`); }

  updateOrder(id: string, payload: { status?: string; paymentStatus?: string }): Observable<{ order: any }> {
    return this.http.patch<{ order: any }>(`${this.base}/orders/${id}`, payload);
  }

  listShipments(params: {
    page?: number;
    limit?: number;
    status?: string;
    carrier?: string;
    from?: string;
    to?: string;
    orderId?: string;
  } = {}): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    const usp = new URLSearchParams();
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    if (params.status) usp.set('status', params.status);
    if (params.carrier) usp.set('carrier', params.carrier);
    if (params.from) usp.set('from', params.from);
    if (params.to) usp.set('to', params.to);
    if (params.orderId) usp.set('orderId', params.orderId);
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number; }>(
      `${this.base}/shipments${qs ? ('?' + qs) : ''}`
    );
  }

  createShipment(orderId: string, payload: { carrier: string; trackingNumber: string; estimatedDeliveryDate?: string }):
    Observable<{ shipment: any }>
  {
    return this.http.post<{ shipment: any }>(`${this.base}/orders/${orderId}/shipments`, payload);
  }

  updateShipment(id: string, payload: { carrier?: string; trackingNumber?: string; status?: string; estimatedDeliveryDate?: string }):
    Observable<{ shipment: any }>
  {
    return this.http.patch<{ shipment: any }>(`${this.base}/shipments/${id}`, payload);
  }

  deleteShipment(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/shipments/${id}`);
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
  listInventory(params: { product?: string; variant?: string; location?: string; status?: string; page?: number; limit?: number } = {})
    : Observable<{ items: any[]; total: number; page: number; pages: number }>
  {
    const usp = new URLSearchParams();
    if (params.product) usp.set('product', params.product);
    if (params.variant) usp.set('variant', params.variant);
    if (params.location) usp.set('location', params.location);
    if (params.status) usp.set('status', params.status);
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

  createInventoryAdjustment(payload: { productId: string; variantId?: string; qtyChange: number; reason?: string; note?: string; location?: string })
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

  private readonly categoriesAdminBase = `${environment.apiBaseUrl}/admin/categories`;

  listCategories(params: { q?: string; page?: number; limit?: number; parent?: string|null } = {}): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    const usp = new URLSearchParams();
    if (params.q) usp.set('search', params.q);
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    if (params.parent !== undefined) usp.set('parent', params.parent === null ? '' : String(params.parent));
    const qs = usp.toString();
    return this.http.get<any>(`${this.categoriesAdminBase}${qs ? ('?' + qs) : ''}`).pipe(
      map(response => ({
        items: response.categories || response.data || response.items || [],
        total: response.pagination?.total || response.total || (response.categories?.length || 0),
        page: response.pagination?.page || response.page || 1,
        pages: response.pagination?.pages || response.pages || 1
      }))
    );
  }

  getCategory(id: string): Observable<{ category: any }> {
    return this.http.get<{ category: any }>(`${this.categoriesAdminBase}/${id}`);
  }

  createCategory(payload: { name: string; slug?: string; description?: string; parent?: string|null }): Observable<{ category: any }> {
    return this.http.post<{ category: any }>(this.categoriesAdminBase, payload);
  }

  updateCategory(id: string, payload: { name: string; slug?: string; description?: string; parent?: string|null }): Observable<{ category: any }> {
    return this.http.patch<{ category: any }>(`${this.categoriesAdminBase}/${id}`, payload);
  }

  deleteCategory(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.categoriesAdminBase}/${id}`);
  }

  listChildren(id: string, params: { page?: number; limit?: number } = {}): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    const usp = new URLSearchParams();
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number; }>(`${this.categoriesAdminBase}/${id}/children${qs ? ('?' + qs) : ''}`);
  }

  reorderChildren(id: string, ids: string[]): Observable<{ items: any[]; total: number; page: number; pages: number; }> {
    return this.http.post<{ items: any[]; total: number; page: number; pages: number; }>(`${this.categoriesAdminBase}/${id}/reorder`, { ids });
  }

  listCoupons(params: { page?: number; limit?: number; status?: string; from?: string; to?: string } = {})
    : Observable<{ items: any[]; total: number; page: number; pages: number; }>
  {
    const usp = new URLSearchParams();
    if (params.page) usp.set('page', String(params.page));
    if (params.limit) usp.set('limit', String(params.limit));
    if (params.status) usp.set('status', params.status);
    if (params.from) usp.set('from', params.from);
    if (params.to) usp.set('to', params.to);
    const qs = usp.toString();
    return this.http.get<{ items: any[]; total: number; page: number; pages: number; }>(`${this.base}/coupons${qs ? ('?' + qs) : ''}`);
  }

  createCoupon(payload: any): Observable<{ coupon: any }> {
    return this.http.post<{ coupon: any }>(`${this.base}/coupons`, payload);
  }

  updateCoupon(id: string, payload: any): Observable<{ coupon: any }> {
    return this.http.patch<{ coupon: any }>(`${this.base}/coupons/${id}`, payload);
  }

  deleteCoupon(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/coupons/${id}`);
  }
}
