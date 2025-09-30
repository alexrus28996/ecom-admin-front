import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ProductFilters } from '../models/product';

const STORAGE_KEY = 'admin.products.filters';

export interface ProductsPaginationState {
  page: number;
  limit: number;
}

@Injectable({ providedIn: 'root' })
export class ProductsStore {
  private readonly defaultFilters: ProductFilters = { q: '', page: 1, limit: 20 };
  private readonly filtersSubject = new BehaviorSubject<ProductFilters>(this.readInitialFilters());
  private readonly paginationSubject = new BehaviorSubject<ProductsPaginationState>({ page: 1, limit: 20 });

  readonly filters$ = this.filtersSubject.asObservable();
  readonly pagination$ = this.paginationSubject.asObservable();

  snapshot(): ProductFilters {
    return { ...this.filtersSubject.value };
  }

  updateFilters(filters: Partial<ProductFilters>): void {
    const next = { ...this.filtersSubject.value, ...filters };
    this.filtersSubject.next(next);
    this.persist(next);
  }

  setPagination(pagination: Partial<ProductsPaginationState>): void {
    const next = { ...this.paginationSubject.value, ...pagination };
    this.paginationSubject.next(next);
    this.updateFilters({ page: next.page, limit: next.limit });
  }

  reset(): void {
    this.filtersSubject.next(this.defaultFilters);
    this.paginationSubject.next({ page: 1, limit: 20 });
    this.persist(this.defaultFilters);
  }

  private readInitialFilters(): ProductFilters {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return this.defaultFilters;
      }
      const parsed = JSON.parse(stored) as ProductFilters;
      return { ...this.defaultFilters, ...parsed };
    } catch {
      return this.defaultFilters;
    }
  }

  private persist(filters: ProductFilters): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore
    }
  }
}
