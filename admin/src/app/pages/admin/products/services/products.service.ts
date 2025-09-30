import { Injectable, isDevMode } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PaginatedProducts, Product, ProductFilters } from '../models/product';
import { VariantMatrixPreviewRequest, VariantMatrixPreviewResponse } from '../models/variant';

interface ProductSavePayload extends Partial<Product> {
  images?: { url: string; alt?: string; sortOrder?: number }[];
  seo?: { metaTitle?: string; metaDescription?: string; metaKeywords?: string[] };
}

export interface ProductReferencesResponse {
  inventory: number;
  reviews: number;
  orders: number;
  shipments: number;
}

export interface ProductListResponse extends PaginatedProducts<Product> {}

@Injectable({ providedIn: 'root' })
export class AdminProductsService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;
  private readonly productsUrl = `${this.baseUrl}/products`;
  private readonly adminProductsUrl = `${this.baseUrl}/admin/products`;

  constructor(private readonly http: HttpClient) {}

  list(filters: ProductFilters): Observable<ProductListResponse> {
    let params = new HttpParams();
    if (filters.q) params = params.set('q', filters.q);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.status === 'active') params = params.set('isActive', 'true');
    if (filters.status === 'inactive') params = params.set('isActive', 'false');
    if (typeof filters.priceMin === 'number') params = params.set('priceMin', filters.priceMin.toString());
    if (typeof filters.priceMax === 'number') params = params.set('priceMax', filters.priceMax.toString());

    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.groupCollapsed?.('[Products] List Request');
      // eslint-disable-next-line no-console
      console.log({ filters });
      // eslint-disable-next-line no-console
      console.groupEnd?.();
    }

    return this.http.get<ProductListResponse>(this.adminProductsUrl, { params }).pipe(
      tap({
        next: response => {
          if (isDevMode()) {
            // eslint-disable-next-line no-console
            console.groupCollapsed?.('[Products] List Response');
            // eslint-disable-next-line no-console
            console.log({
              items: response.items?.length ?? 0,
              total: response.total,
              page: response.page,
              pages: response.pages
            });
            // eslint-disable-next-line no-console
            console.groupEnd?.();
          }
        },
        error: err => {
          if (isDevMode()) {
            // eslint-disable-next-line no-console
            console.error('[Products] List Error', {
              code: err?.error?.code,
              message: err?.error?.message || err.message,
              status: err.status,
              url: `${this.adminProductsUrl}`
            });
          }
        }
      })
    );
  }

  get(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.adminProductsUrl}/${id}`);
  }

  create(payload: ProductSavePayload): Observable<Product> {
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.log('[Products] Save Request', { payload });
    }
    return this.http.post<Product>(this.productsUrl, payload).pipe(
      tap({
        next: product => {
          if (isDevMode()) {
            // eslint-disable-next-line no-console
            console.log('[Products] Save Response', product);
          }
        },
        error: error => {
          if (isDevMode()) {
            // eslint-disable-next-line no-console
            console.error('[Products] Save Error', error);
          }
        }
      })
    );
  }

  update(id: string, payload: ProductSavePayload): Observable<Product> {
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.log('[Products] Save Request', { id, payload });
    }
    return this.http.put<Product>(`${this.productsUrl}/${id}`, payload).pipe(
      tap({
        next: product => {
          if (isDevMode()) {
            // eslint-disable-next-line no-console
            console.log('[Products] Save Response', product);
          }
        },
        error: error => {
          if (isDevMode()) {
            // eslint-disable-next-line no-console
            console.error('[Products] Save Error', error);
          }
        }
      })
    );
  }

  patch(id: string, payload: Partial<ProductSavePayload>): Observable<Product> {
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.log('[Products] Save Request', { id, payload, mode: 'patch' });
    }
    return this.http.patch<Product>(`${this.productsUrl}/${id}`, payload).pipe(
      tap({
        next: product => {
          if (isDevMode()) {
            // eslint-disable-next-line no-console
            console.log('[Products] Save Response', product);
          }
        },
        error: error => {
          if (isDevMode()) {
            // eslint-disable-next-line no-console
            console.error('[Products] Save Error', error);
          }
        }
      })
    );
  }

  delete(id: string): Observable<{ success: boolean }> {
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.log('[Products] Delete Request', { id });
    }
    return this.http.delete<{ success: boolean }>(`${this.productsUrl}/${id}`).pipe(
      tap({
        next: res => {
          if (isDevMode()) {
            // eslint-disable-next-line no-console
            console.log('[Products] Delete Response', res);
          }
        }
      })
    );
  }

  references(id: string): Observable<ProductReferencesResponse> {
    return this.http.get<ProductReferencesResponse>(`${this.adminProductsUrl}/${id}/references`).pipe(
      tap(refs => {
        if (isDevMode()) {
          // eslint-disable-next-line no-console
          console.log('[Products] References Check', refs);
        }
      })
    );
  }

  bulkPriceUpdate(factorPercent: number, filter?: { q?: string; category?: string }): Observable<{ matched: number; modified: number }>{
    return this.http.post<{ matched: number; modified: number }>(`${this.adminProductsUrl}/price-bulk`, {
      factorPercent,
      filter
    });
  }

  bulkCategoryAssign(categoryId: string, productIds: string[]): Observable<{ matched: number; modified: number }>{
    return this.http.post<{ matched: number; modified: number }>(`${this.adminProductsUrl}/category-bulk`, {
      categoryId,
      productIds
    });
  }

  exportCsv(filters: ProductFilters): Observable<Blob> {
    let params = new HttpParams();
    if (filters.q) params = params.set('q', filters.q);
    if (filters.category) params = params.set('category', filters.category);
    if (filters.status === 'active') params = params.set('isActive', 'true');
    if (filters.status === 'inactive') params = params.set('isActive', 'false');

    return this.http.get(`${this.adminProductsUrl}/export`, {
      params: params.set('format', 'csv'),
      responseType: 'blob' as 'json'
    });
  }

  matrixPreview(productId: string, body: VariantMatrixPreviewRequest): Observable<VariantMatrixPreviewResponse> {
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.log('[Products] Matrix Preview Request', body);
    }
    return this.http
      .post<VariantMatrixPreviewResponse>(`${this.adminProductsUrl}/${productId}/variants-matrix`, body)
      .pipe(
        tap({
          next: response => {
            if (isDevMode()) {
              // eslint-disable-next-line no-console
              console.log('[Products] Matrix Preview Response', {
                count: response.count,
                itemsSample: response.items?.slice?.(0, 3)
              });
            }
          },
          error: error => {
            if (isDevMode()) {
              // eslint-disable-next-line no-console
              console.error('[Products] Variant Error', error);
            }
          }
        })
      );
  }
}
