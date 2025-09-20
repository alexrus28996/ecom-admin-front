import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paginated, MoneyAmount } from './api.types';

export type CouponType = 'percent' | 'fixed' | string;

export interface Coupon {
  _id: string;
  code: string;
  type: CouponType;
  value: number;
  minSubtotal?: number | MoneyAmount | null;
  maxRedemptions?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive: boolean;
  usageCount?: number;
  includeProducts?: string[] | null;
  excludeProducts?: string[] | null;
  includeCategories?: string[] | null;
  excludeCategories?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CouponInput {
  code: string;
  type: CouponType;
  value: number;
  minSubtotal?: number | MoneyAmount | null;
  maxRedemptions?: number | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
  includeProducts?: string[];
  excludeProducts?: string[];
  includeCategories?: string[];
  excludeCategories?: string[];
}

@Injectable({ providedIn: 'root' })
export class CouponService {
  private readonly base = `${environment.apiBaseUrl}/admin/coupons`;

  constructor(private readonly http: HttpClient) {}

  list(params: { q?: string; page?: number; limit?: number } = {}): Observable<Paginated<Coupon>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<Coupon>>(this.base, { params: httpParams });
  }

  get(id: string): Observable<{ coupon: Coupon }> {
    return this.http.get<{ coupon: Coupon }>(`${this.base}/${id}`);
  }

  create(payload: CouponInput): Observable<{ coupon: Coupon }> {
    return this.http.post<{ coupon: Coupon }>(this.base, payload);
  }

  update(id: string, payload: CouponInput): Observable<{ coupon: Coupon }> {
    return this.http.put<{ coupon: Coupon }>(`${this.base}/${id}`, payload);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`);
  }
}
