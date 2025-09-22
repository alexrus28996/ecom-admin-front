import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
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
  page?: number;
  limit?: number;
  sort?: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  protected readonly base = `${environment.apiBaseUrl}/products`;
  protected readonly adminBase = `${environment.apiBaseUrl}/admin/products`;

  constructor(protected readonly http: HttpClient) {}

  list(params: ListProductsParams = {}): Observable<Paginated<ProductSummary>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('q', params.q);
    if (params.category) httpParams = httpParams.set('category', params.category);
    if (params.brand) httpParams = httpParams.set('brand', params.brand);
    if (params.sort) httpParams = httpParams.set('sort', params.sort);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<ProductSummary>>(this.base, { params: httpParams });
  }

  get(id: string): Observable<{ product: ProductDetail }> {
    return this.http.get<{ product: ProductDetail }>(`${this.adminBase}/${id}`);
  }

  create(payload: ProductInput): Observable<{ product: ProductDetail }> {
    return this.http.post<{ product: ProductDetail }>(this.adminBase, payload);
  }

  update(id: string, payload: Partial<ProductInput>): Observable<{ product: ProductDetail }> {
    return this.http.patch<{ product: ProductDetail }>(`${this.adminBase}/${id}`, payload);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.adminBase}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class ProductsService extends ProductService {
  protected override readonly adminBase = `${environment.apiBaseUrl}/admin/products`;

  constructor(protected override readonly http: HttpClient) {
    super(http);
  }

  override update(id: string, payload: Partial<ProductInput>): Observable<{ product: ProductDetail }> {
    return this.http.put<{ product: ProductDetail }>(`${this.adminBase}/${id}`, payload);
  }
}
