import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Paginated } from './api.types';

export interface Category {
  _id: string;
  name: string;
  slug?: string;
  description?: string | null;
  parent?: string | Category | null;
  breadcrumbs?: Category[];
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CategoryInput {
  name: string;
  slug?: string | null;
  description?: string | null;
  parent?: string | null;
}

export interface Brand {
  _id: string;
  name: string;
  slug?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BrandInput {
  name?: string;
  slug?: string | null;
}

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly base = `${environment.apiBaseUrl}/categories`;
  private readonly adminBase = `${environment.apiBaseUrl}/admin/categories`;
  private readonly adminBrandBase = `${environment.apiBaseUrl}/admin/brands`;
  private readonly adminTagBase = `${environment.apiBaseUrl}/admin/tags`;

  constructor(private readonly http: HttpClient) {}

  list(params: { q?: string; parent?: string | null; page?: number; limit?: number } = {}): Observable<Paginated<Category>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('search', params.q);
    if (params.parent !== undefined) {
      httpParams = httpParams.set('parent', params.parent === null ? '' : String(params.parent));
    }
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<Category>>(this.base, { params: httpParams });
  }

  get(id: string): Observable<{ category: Category }> {
    return this.http.get<{ category: Category }>(`${this.base}/${id}`);
  }

  listChildren(id: string, params: { page?: number; limit?: number } = {}): Observable<Paginated<Category>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<Category>>(`${this.base}/${id}/children`, { params: httpParams });
  }

  create(payload: CategoryInput): Observable<{ category: Category }> {
    return this.http.post<{ category: Category }>(this.adminBase, payload);
  }

  update(id: string, payload: CategoryInput): Observable<{ category: Category }> {
    return this.http.patch<{ category: Category }>(`${this.adminBase}/${id}`, payload);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.adminBase}/${id}`);
  }

  reorderChildren(id: string, ids: string[]): Observable<{ items: Category[] }> {
    return this.http.post<{ items: Category[] }>(`${this.adminBase}/${id}/reorder`, { ids });
  }

  listBrands(params: { q?: string; page?: number; limit?: number } = {}): Observable<Paginated<Brand>> {
    let httpParams = new HttpParams();
    if (params.q) httpParams = httpParams.set('search', params.q);
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<Brand>>(this.adminBrandBase, { params: httpParams });
  }

  getBrand(id: string): Observable<{ brand: Brand }> {
    return this.http.get<{ brand: Brand }>(`${this.adminBrandBase}/${id}`);
  }

  createBrand(payload: BrandInput & { name: string }): Observable<{ brand: Brand }> {
    return this.http.post<{ brand: Brand }>(this.adminBrandBase, payload);
  }

  updateBrand(id: string, payload: BrandInput): Observable<{ brand: Brand }> {
    return this.http.put<{ brand: Brand }>(`${this.adminBrandBase}/${id}`, payload);
  }

  deleteBrand(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.adminBrandBase}/${id}`);
  }

  getBrandReferences(id: string): Observable<{ products: number }> {
    return this.http.get<{ products: number }>(`${this.adminBrandBase}/${id}/references`);
  }

  listTags(): Observable<{ items: string[] }> {
    return this.http.get<{ items: string[] }>(this.adminTagBase);
  }
}
