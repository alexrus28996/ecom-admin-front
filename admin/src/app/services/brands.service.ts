import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  Brand,
  PaginationParams,
  SortParams,
  Paginated,
  ApiResponse
} from './api.types';

export interface BrandFilters extends PaginationParams, SortParams {
  q?: string;
  isActive?: boolean;
}

export interface BrandReference {
  productCount: number;
  products?: { _id: string; name: string }[];
}

@Injectable({ providedIn: 'root' })
export class BrandsService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // Admin endpoints (no public brand endpoints in API spec)
  getBrands(filters: BrandFilters = {}): Observable<Paginated<Brand>> {
    let params = new HttpParams();

    if (filters.q) params = params.set('q', filters.q);
    if (typeof filters.isActive === 'boolean') params = params.set('isActive', filters.isActive.toString());
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Brand>>(`${this.baseUrl}/admin/brands`, { params });
  }

  createBrand(brandData: Partial<Brand>): Observable<Brand> {
    const cleanData = this.cleanBrandForSave(brandData);

    return this.http.post<ApiResponse<Brand>>(`${this.baseUrl}/admin/brands`, cleanData, {
      headers: { 'Idempotency-Key': this.generateIdempotencyKey() }
    }).pipe(map(response => response.data!));
  }

  updateBrand(id: string, brandData: Partial<Brand>): Observable<Brand> {
    const cleanData = this.cleanBrandForSave(brandData);

    return this.http.patch<ApiResponse<Brand>>(`${this.baseUrl}/admin/brands/${id}`, cleanData)
      .pipe(map(response => response.data!));
  }

  deleteBrand(id: string): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(`${this.baseUrl}/admin/brands/${id}`)
      .pipe(map(response => response.data!));
  }

  getBrandReferences(id: string): Observable<BrandReference> {
    return this.http.get<ApiResponse<BrandReference>>(`${this.baseUrl}/admin/brands/${id}/references`)
      .pipe(map(response => response.data!));
  }

  private cleanBrandForSave(brandData: Partial<Brand>): any {
    const cleanData = { ...brandData };

    // Remove read-only fields
    delete cleanData._id;
    delete cleanData.createdAt;
    delete cleanData.updatedAt;

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