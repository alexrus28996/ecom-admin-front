import { Injectable, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ProductAttribute } from '../models/attribute';
import { ProductOption } from '../models/option';

@Injectable({ providedIn: 'root' })
export class ProductAttributesService {
  private readonly baseUrl = `${environment.apiBaseUrl}`;

  constructor(private readonly http: HttpClient) {}

  list(productId: string): Observable<ProductAttribute[]> {
    return this.http
      .get<ProductAttribute[]>(`${this.baseUrl}/products/${productId}/attributes`)
      .pipe(tap(attributes => this.log('list', productId, attributes)));
  }

  upsert(productId: string, attribute: Partial<ProductAttribute> & { _id?: string }): Observable<ProductAttribute> {
    const body = {
      name: attribute.name,
      slug: attribute.slug,
      description: attribute.description,
      isRequired: attribute.isRequired,
      sortOrder: attribute.sortOrder
    };

    if (attribute._id) {
      return this.http
        .put<ProductAttribute>(`${this.baseUrl}/products/${productId}/attributes/${attribute._id}`, body)
        .pipe(tap(attr => this.log('update', productId, attr)));
    }

    return this.http
      .post<ProductAttribute>(`${this.baseUrl}/products/${productId}/attributes`, body)
      .pipe(tap(attr => this.log('create', productId, attr)));
  }

  delete(productId: string, attributeId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}`)
      .pipe(tap(() => this.log('delete', productId, { _id: attributeId } as ProductAttribute)));
  }

  listOptions(productId: string, attributeId: string): Observable<ProductOption[]> {
    return this.http
      .get<ProductOption[]>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}/options`)
      .pipe(tap(options => this.logOption('list', productId, attributeId, options)));
  }

  upsertOption(
    productId: string,
    attributeId: string,
    option: Partial<ProductOption> & { _id?: string }
  ): Observable<ProductOption> {
    const body = {
      name: option.name,
      slug: option.slug,
      sortOrder: option.sortOrder,
      metadata: option.metadata
    };

    if (option._id) {
      return this.http
        .put<ProductOption>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}/options/${option._id}` , body)
        .pipe(tap(opt => this.logOption('update', productId, attributeId, opt)));
    }

    return this.http
      .post<ProductOption>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}/options`, body)
      .pipe(tap(opt => this.logOption('create', productId, attributeId, opt)));
  }

  deleteOption(productId: string, attributeId: string, optionId: string): Observable<void> {
    return this.http
      .delete<void>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}/options/${optionId}`)
      .pipe(tap(() => this.logOption('delete', productId, attributeId, { _id: optionId } as ProductOption)));
  }

  private log(action: string, productId: string, attribute: ProductAttribute | ProductAttribute[]): void {
    if (!isDevMode()) return;
    // eslint-disable-next-line no-console
    console.log('[Products] Attribute Upsert', { action, productId, attribute });
  }

  private logOption(action: string, productId: string, attributeId: string, option: ProductOption | ProductOption[]): void {
    if (!isDevMode()) return;
    // eslint-disable-next-line no-console
    console.log('[Products] Option Upsert', { action, productId, attributeId, option });
  }
}
