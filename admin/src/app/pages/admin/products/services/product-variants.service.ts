import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProductVariant, VariantMatrixPreviewRequest, VariantMatrixPreviewResponse } from '../models/variant';

@Injectable({ providedIn: 'root' })
export class ProductVariantsService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  list(productId: string): Observable<ProductVariant[]> {
    return this.http
      .get<ProductVariant[]>(`${this.baseUrl}/products/${productId}/variants`)
      .pipe(tap(() => this.log('list', productId)));
  }

  get(productId: string, variantId: string): Observable<ProductVariant> {
    return this.http.get<ProductVariant>(`${this.baseUrl}/products/${productId}/variants/${variantId}`);
  }

  create(productId: string, payload: Partial<ProductVariant>): Observable<ProductVariant> {
    return this.http
      .post<ProductVariant>(`${this.baseUrl}/products/${productId}/variants`, payload)
      .pipe(tap(variant => this.log('create', productId, variant)));
  }

  update(productId: string, variantId: string, payload: Partial<ProductVariant>): Observable<ProductVariant> {
    return this.http
      .put<ProductVariant>(`${this.baseUrl}/products/${productId}/variants/${variantId}`, payload)
      .pipe(tap(variant => this.log('update', productId, variant)));
  }

  delete(productId: string, variantId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/products/${productId}/variants/${variantId}`)
      .pipe(tap(() => this.log('delete', productId, { _id: variantId } as ProductVariant)));
  }

  matrixPreview(productId: string, body: VariantMatrixPreviewRequest): Observable<VariantMatrixPreviewResponse> {
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.log('[Products] Matrix Preview Request', body);
    }
    return this.http
      .post<VariantMatrixPreviewResponse>(`${this.baseUrl}/admin/products/${productId}/variants-matrix`, body)
      .pipe(
        tap({
          next: res => {
            if (isDevMode()) {
              // eslint-disable-next-line no-console
              console.log('[Products] Matrix Preview Response', {
                count: res.count,
                itemsSample: res.items?.slice?.(0, 3)
              });
            }
          },
          error: err => {
            if (isDevMode()) {
              // eslint-disable-next-line no-console
              console.error('[Products] Variant Error', err);
            }
          }
        })
      );
  }

  private log(action: string, productId: string, variant?: ProductVariant): void {
    if (!isDevMode()) return;
    // eslint-disable-next-line no-console
    console.log('[Products] Variant Create Batch', { action, productId, variant });
  }
}
