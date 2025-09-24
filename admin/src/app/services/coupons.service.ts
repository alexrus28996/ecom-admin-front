import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  Coupon,
  CouponFilters,
  Paginated,
  ApiResponse
} from './api.types';

@Injectable({ providedIn: 'root' })
export class CouponsService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // Admin endpoints
  getCoupons(filters: CouponFilters = {}): Observable<Paginated<Coupon>> {
    let params = new HttpParams();

    if (filters.status) params = params.set('status', filters.status);
    if (filters.type) params = params.set('type', filters.type);
    if (filters.dateStart) params = params.set('dateStart', filters.dateStart);
    if (filters.dateEnd) params = params.set('dateEnd', filters.dateEnd);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Coupon>>(`${this.baseUrl}/admin/coupons`, { params });
  }

  createCoupon(couponData: Partial<Coupon>): Observable<Coupon> {
    const cleanData = this.cleanCouponForSave(couponData);

    return this.http.post<ApiResponse<Coupon>>(`${this.baseUrl}/admin/coupons`, cleanData, {
      headers: { 'Idempotency-Key': this.generateIdempotencyKey() }
    }).pipe(map(response => response.data!));
  }

  updateCoupon(id: string, couponData: Partial<Coupon>): Observable<Coupon> {
    const cleanData = this.cleanCouponForSave(couponData);

    return this.http.patch<ApiResponse<Coupon>>(`${this.baseUrl}/admin/coupons/${id}`, cleanData)
      .pipe(map(response => response.data!));
  }

  deleteCoupon(id: string): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(`${this.baseUrl}/admin/coupons/${id}`)
      .pipe(map(response => response.data!));
  }

  // For backward compatibility
  list(filters: any = {}): Observable<Paginated<Coupon>> {
    const couponFilters: CouponFilters = {
      status: filters.status,
      type: filters.type,
      dateStart: filters.dateStart || filters.from,
      dateEnd: filters.dateEnd || filters.to,
      page: filters.page,
      limit: filters.limit,
      sort: filters.sort
    };

    return this.getCoupons(couponFilters);
  }

  create(payload: any): Observable<{ coupon: Coupon }> {
    return this.createCoupon(payload).pipe(
      map(coupon => ({ coupon }))
    );
  }

  update(id: string, payload: any): Observable<{ coupon: Coupon }> {
    return this.updateCoupon(id, payload).pipe(
      map(coupon => ({ coupon }))
    );
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.deleteCoupon(id);
  }

  private cleanCouponForSave(couponData: Partial<Coupon>): any {
    const cleanData = { ...couponData };

    // Remove read-only fields
    delete cleanData._id;
    delete cleanData.createdAt;
    delete cleanData.updatedAt;
    delete cleanData.usageCount;

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