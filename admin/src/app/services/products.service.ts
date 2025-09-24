import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Paginated } from './api.types';

export interface ProductImage {
  url: string;
  alt?: string | null;
}

export interface ProductVariantInput {
  sku?: string | null;
  attributes?: Record<string, string> | null;
  price?: number | null;
  compareAtPrice?: number | null;
  currency?: string | null;
  stock?: number | null;
  barcode?: string | null;
  requiresShipping?: boolean | null;
  priceDelta?: number | null;
  isActive?: boolean | null;
}

export interface ProductVariant extends ProductVariantInput {
  _id?: string;
  isActive?: boolean;
  priceDelta?: number | null;
}

export interface ProductDimensions {
  length?: number | null;
  width?: number | null;
  height?: number | null;
  unit?: string | null;
}

export interface ProductInput {
  name: string;
  description?: string | null;
  longDescription?: string | null;
  price: number;
  compareAtPrice?: number | null;
  costPrice?: number | null;
  currency?: string | null;
  images?: ProductImage[] | null;
  attributes?: Record<string, string> | null;
  category?: string | null;
  brand?: string | null;
  vendor?: string | null;
  sku?: string | null;
  tags?: string[] | null;
  variants?: ProductVariantInput[] | null;
  requiresShipping?: boolean | null;
  weight?: number | null;
  weightUnit?: string | null;
  dimensions?: ProductDimensions | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  stock?: number | null;
  isActive?: boolean | null;
}

export interface ProductSummary {
  _id: string;
  name: string;
  slug?: string;
  price: number;
  compareAtPrice?: number | null;
  currency: string;
  images?: ProductImage[];
  category?: { _id: string; name: string; slug?: string } | null;
  categories?: { _id: string; name: string; slug?: string }[] | null;
  brand?: { _id: string; name: string; slug?: string } | null;
  rating?: { average: number; count: number } | null;
  variants?: ProductVariant[] | null;
  attributes?: Record<string, string> | null;
  stock?: number | null;
  isActive?: boolean | null;
  sku?: string | null;
  createdAt?: string | null;
}

export interface ProductDetail extends ProductSummary {
  description?: string | null;
  longDescription?: string | null;
  costPrice?: number | null;
  vendor?: string | null;
  sku?: string | null;
  tags?: string[] | null;
  requiresShipping?: boolean | null;
  weight?: number | null;
  weightUnit?: string | null;
  dimensions?: ProductDimensions | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type Product = ProductDetail;

export interface ListProductsParams {
  q?: string;
  category?: string;
  brand?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  limit?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private readonly productsUrl = `${environment.apiBaseUrl}/products`;

  constructor(private readonly http: HttpClient) {}

  list(params: ListProductsParams = {}): Observable<Paginated<ProductSummary>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('search', params.q);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.brand) httpParams = httpParams.set('brand', params.brand);
    if (typeof params.priceMin === 'number') {
      httpParams = httpParams.set('minPrice', String(params.priceMin));
    }
    if (typeof params.priceMax === 'number') {
      httpParams = httpParams.set('maxPrice', String(params.priceMax));
    }
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));

    return this.http.get<any>(this.productsUrl, { params: httpParams }).pipe(
      map((response) => this.mapPaginatedProducts(response, params))
    );
  }

  get(id: string): Observable<{ product: ProductDetail }> {
    return this.getById(id);
  }

  getById(id: string): Observable<{ product: ProductDetail }> {
    return this.http.get<any>(`${this.productsUrl}/${id}`).pipe(
      map((response) => ({ product: this.mapProductDetail(response) }))
    );
  }

  create(payload: ProductInput): Observable<{ product: ProductDetail }> {
    return this.http.post<any>(this.productsUrl, payload).pipe(
      map((response) => ({ product: this.mapProductDetail(response) }))
    );
  }

  update(id: string, payload: Partial<ProductInput>): Observable<{ product: ProductDetail }> {
    return this.http.patch<any>(`${this.productsUrl}/${id}`, payload).pipe(
      map((response) => ({ product: this.mapProductDetail(response) }))
    );
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.remove(id);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<any>(`${this.productsUrl}/${id}`).pipe(
      map((response) => ({ success: this.mapSuccessFlag(response) }))
    );
  }

  private mapPaginatedProducts(response: any, params: ListProductsParams): Paginated<ProductSummary> {
    const candidates = this.normalizeArray<ProductSummary>(response?.data?.items)
      ?? this.normalizeArray<ProductSummary>(response?.data?.data)
      ?? this.normalizeArray<ProductSummary>(response?.data)
      ?? this.normalizeArray<ProductSummary>(response?.items)
      ?? this.normalizeArray<ProductSummary>(response?.products)
      ?? [];

    const paginationSource = response?.pagination ?? response?.data?.pagination ?? {};
    const total = typeof paginationSource.total === 'number'
      ? paginationSource.total
      : typeof response?.total === 'number'
        ? response.total
        : typeof response?.data?.total === 'number'
          ? response.data.total
          : candidates.length;
    const page = typeof paginationSource.page === 'number'
      ? paginationSource.page
      : typeof response?.page === 'number'
        ? response.page
        : typeof response?.data?.page === 'number'
          ? response.data.page
          : 1;
    const pages = typeof paginationSource.pages === 'number'
      ? paginationSource.pages
      : typeof response?.pages === 'number'
        ? response.pages
        : typeof response?.data?.pages === 'number'
          ? response.data.pages
          : (params.limit ? Math.max(1, Math.ceil(total / params.limit)) : 1);
    const limit = typeof paginationSource.limit === 'number'
      ? paginationSource.limit
      : params.limit ?? candidates.length ?? 0;

    return {
      data: candidates,
      items: candidates,
      total,
      page,
      pages,
      pagination: {
        page,
        limit,
        total,
        pages
      }
    };
  }

  private mapProductDetail(response: any): ProductDetail {
    if (!response) {
      return response as ProductDetail;
    }
    const candidate = response.product
      ?? response.data?.product
      ?? response.data?.item
      ?? response.data
      ?? response.item
      ?? response;
    const product = candidate?.product ?? candidate;
    return product as ProductDetail;
  }

  private mapSuccessFlag(response: any): boolean {
    if (response?.success !== undefined) {
      return !!response.success;
    }
    if (response?.data?.success !== undefined) {
      return !!response.data.success;
    }
    return true;
  }

  private normalizeArray<T>(value: any): T[] | undefined {
    return Array.isArray(value) ? value : undefined;
  }
}
