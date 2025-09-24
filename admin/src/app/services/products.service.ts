import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  Product,
  ProductImage,
  ProductVariant,
  ProductAttribute,
  ProductFilters,
  Paginated,
  ApiResponse
} from './api.types';

// Export types for backward compatibility
export {
  Product as ProductDetail,
  Product as ProductSummary,
  ProductImage,
  ProductVariant,
  ProductAttribute,
  Product as ProductInput
};

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  // Public endpoints
  getProducts(filters: ProductFilters = {}): Observable<Paginated<Product>> {
    let params = new HttpParams();

    if (filters.q) params = params.set('q', filters.q);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.brand) params = params.set('brand', filters.brand);
    if (typeof filters.minPrice === 'number') params = params.set('minPrice', filters.minPrice.toString());
    if (typeof filters.maxPrice === 'number') params = params.set('maxPrice', filters.maxPrice.toString());
    if (typeof filters.isActive === 'boolean') params = params.set('isActive', filters.isActive.toString());
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Product>>(`${this.baseUrl}/products`, { params });
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<ApiResponse<Product>>(`${this.baseUrl}/products/${id}`)
      .pipe(map(response => response.data!));
  }

  // Admin endpoints
  getAdminProducts(filters: ProductFilters = {}): Observable<Paginated<Product>> {
    let params = new HttpParams();

    if (filters.q) params = params.set('q', filters.q);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.brand) params = params.set('brand', filters.brand);
    if (typeof filters.minPrice === 'number') params = params.set('minPrice', filters.minPrice.toString());
    if (typeof filters.maxPrice === 'number') params = params.set('maxPrice', filters.maxPrice.toString());
    if (typeof filters.isActive === 'boolean') params = params.set('isActive', filters.isActive.toString());
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.sort) params = params.set('sort', filters.sort);
    if (filters.order) params = params.set('order', filters.order);

    return this.http.get<Paginated<Product>>(`${this.baseUrl}/admin/products`, { params });
  }

  createProduct(productData: Partial<Product>): Observable<Product> {
    // Strip read-only fields
    const cleanData = this.cleanProductForSave(productData);

    return this.http.post<ApiResponse<Product>>(`${this.baseUrl}/admin/products`, cleanData, {
      headers: { 'Idempotency-Key': this.generateIdempotencyKey() }
    }).pipe(map(response => response.data!));
  }

  updateProduct(id: string, productData: Partial<Product>): Observable<Product> {
    // Strip read-only fields
    const cleanData = this.cleanProductForSave(productData);

    return this.http.patch<ApiResponse<Product>>(`${this.baseUrl}/admin/products/${id}`, cleanData)
      .pipe(map(response => response.data!));
  }

  deleteProduct(id: string): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<{ success: boolean }>>(`${this.baseUrl}/admin/products/${id}`)
      .pipe(map(response => response.data!));
  }

  // Helper methods for backward compatibility
  list(params: any = {}): Observable<Paginated<Product>> {
    // Map old parameter names to new ones
    const filters: ProductFilters = {
      q: params.q || params.search,
      category: params.category,
      brand: params.brand,
      minPrice: params.priceMin || params.minPrice,
      maxPrice: params.priceMax || params.maxPrice,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      isActive: params.isActive
    };

    return this.getAdminProducts(filters);
  }

  get(id: string): Observable<{ product: Product }> {
    return this.getProduct(id).pipe(
      map(product => ({ product }))
    );
  }

  getById(id: string): Observable<{ product: Product }> {
    return this.get(id);
  }

  create(payload: any): Observable<{ product: Product }> {
    return this.createProduct(payload).pipe(
      map(product => ({ product }))
    );
  }

  update(id: string, payload: any): Observable<{ product: Product }> {
    return this.updateProduct(id, payload).pipe(
      map(product => ({ product }))
    );
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.deleteProduct(id);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.deleteProduct(id);
  }

  private cleanProductForSave(productData: Partial<Product>): any {
    const cleanData = { ...productData };

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