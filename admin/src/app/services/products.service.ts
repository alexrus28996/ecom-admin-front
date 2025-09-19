import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductImage {
  url: string;
  alt?: string;
}

export interface ProductVariant {
  _id?: string;
  sku?: string;
  attributes?: Record<string, string>;
  price?: number | null;
  priceDelta?: number | null;
  stock?: number | null;
  isActive?: boolean;
}

export interface Product {
  _id?: string;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  currency?: string;
  images?: ProductImage[];
  attributes?: Record<string, string>;
  category?: string | { _id: string; name: string } | null;
  ratingAvg?: number;
  ratingCount?: number;
  variants?: ProductVariant[];
  stock?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
}

export interface ListProductsParams {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsService {
  private base = `${environment.apiBaseUrl}/products`;
  constructor(private http: HttpClient) {}

  list(params: ListProductsParams = {}): Observable<Paginated<Product>> {
    let p = new HttpParams();
    if (params.q) p = p.set('q', params.q);
    if (params.category) p = p.set('category', params.category);
    if (params.page) p = p.set('page', String(params.page));
    if (params.limit) p = p.set('limit', String(params.limit));
    return this.http.get<Paginated<Product>>(this.base, { params: p });
  }

  get(id: string): Observable<{ product: Product }> {
    return this.http.get<{ product: Product }>(`${this.base}/${id}`);
  }

  create(product: Product): Observable<{ product: Product }> {
    return this.http.post<{ product: Product }>(this.base, product);
  }

  update(id: string, product: Product): Observable<{ product: Product }> {
    return this.http.put<{ product: Product }>(`${this.base}/${id}`, product);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.base}/${id}`);
  }
}
