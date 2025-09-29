import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, from, of } from 'rxjs';
import { catchError, map, mergeMap, reduce } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import {
  Product,
  ProductImage,
  ProductVariant,
  ProductAttribute,
  ProductFilters,
  Paginated
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
  private readonly productsBaseUrl = `${environment.apiBaseUrl}/products`;
  private readonly adminProductsBaseUrl = `${environment.apiBaseUrl}/admin/products`;

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

    return this.http
      .get<any>(this.productsBaseUrl, { params })
      .pipe(map(response => this.mapPaginatedResponse<Product>(response)));
  }

  getProduct(id: string): Observable<Product> {
    return this.http
      .get<{ product: Product }>(`${this.productsBaseUrl}/${id}`)
      .pipe(map(response => response.product));
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

    return this.http
      .get<any>(this.adminProductsBaseUrl, { params })
      .pipe(map(response => this.mapPaginatedResponse<Product>(response)));
  }

  createProduct(productData: Partial<Product>): Observable<Product> {
    const cleanData = this.cleanProductForSave(productData);

    return this.http
      .post<{ product: Product }>(this.adminProductsBaseUrl, cleanData, {
        headers: { 'Idempotency-Key': this.generateIdempotencyKey() }
      })
      .pipe(map(response => response.product));
  }

  updateProduct(id: string, productData: Partial<Product>): Observable<Product> {
    const cleanData = this.cleanProductForSave(productData);

    return this.http
      .put<{ product: Product }>(`${this.adminProductsBaseUrl}/${id}`, cleanData)
      .pipe(map(response => response.product));
  }

  deleteProduct(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.adminProductsBaseUrl}/${id}`);
  }

  restoreProduct(id: string): Observable<Product> {
    return this.http
      .post<{ product: Product }>(`${this.adminProductsBaseUrl}/${id}/restore`, {})
      .pipe(map(response => response.product));
  }

  // Helper methods for backward compatibility
  list(params: any = {}): Observable<Paginated<Product>> {
    // Map old parameter names to new ones with better handling
    const filters: ProductFilters = this.normalizeFilters(params);
    return this.getAdminProducts(filters);
  }

  // Search products with enhanced filtering
  search(query: string, filters: Partial<ProductFilters> = {}): Observable<Paginated<Product>> {
    const searchFilters: ProductFilters = {
      ...this.normalizeFilters(filters),
      q: query.trim(),
      limit: filters.limit || 20
    };
    return this.getAdminProducts(searchFilters);
  }

  // Get products by category
  getByCategory(categoryId: string, filters: Partial<ProductFilters> = {}): Observable<Paginated<Product>> {
    const categoryFilters: ProductFilters = {
      ...this.normalizeFilters(filters),
      category: categoryId
    };
    return this.getAdminProducts(categoryFilters);
  }

  // Get products by brand
  getByBrand(brandId: string, filters: Partial<ProductFilters> = {}): Observable<Paginated<Product>> {
    const brandFilters: ProductFilters = {
      ...this.normalizeFilters(filters),
      brand: brandId
    };
    return this.getAdminProducts(brandFilters);
  }

  // Get featured products
  getFeatured(filters: Partial<ProductFilters> = {}): Observable<Paginated<Product>> {
    const featuredFilters: ProductFilters = {
      ...this.normalizeFilters(filters),
      featured: true,
      isActive: true
    };
    return this.getProducts(featuredFilters);
  }

  // Get low stock products
  getLowStock(threshold: number = 10, filters: Partial<ProductFilters> = {}): Observable<Paginated<Product>> {
    const lowStockFilters: ProductFilters = {
      ...this.normalizeFilters(filters),
      lowStock: true
    };
    return this.getAdminProducts(lowStockFilters);
  }

  // Product Import/Export Functions
  importProducts(products: Partial<Product>[] | File | Blob): Observable<{ inserted: number; failed: number; errors: any[] }> {
    if (products instanceof Blob) {
      return this.importProductsFile(products);
    }

    const importData = {
      items: products.map(product => this.cleanProductForSave(product))
    };

    return this.http.post<{ inserted: number; failed: number; errors: any[] }>(
      `${this.adminProductsBaseUrl}/import`,
      importData
    );
  }

  importProductsFile(file: File | Blob): Observable<{ inserted: number; failed: number; errors: any[] }> {
    const formData = new FormData();
    formData.append('file', file, file instanceof File ? file.name : 'products-import');
    return this.http.post<{ inserted: number; failed: number; errors: any[] }>(
      `${this.adminProductsBaseUrl}/import`,
      formData
    );
  }

  exportProducts(format: 'json' | 'csv' = 'json'): Observable<Blob> {
    return this.http
      .get(`${this.adminProductsBaseUrl}/export`, {
        params: { format },
        responseType: 'blob' as 'json'
      })
      .pipe(map(response => response as unknown as Blob));
  }

  // Bulk Operations
  bulkUpdatePrices(factorPercent: number, filter?: { q?: string; category?: string }): Observable<{ matched: number; modified: number; factor: number }> {
    const body = {
      factorPercent,
      ...(filter && { filter })
    };
    return this.http.post<{ matched: number; modified: number; factor: number }>(
      `${this.adminProductsBaseUrl}/price-bulk`,
      body
    );
  }

  bulkUpdateCategory(categoryId: string, productIds: string[]): Observable<{ matched: number; modified: number }> {
    return this.http.post<{ matched: number; modified: number }>(
      `${this.adminProductsBaseUrl}/category-bulk`,
      { categoryId, productIds }
    );
  }
    // Product References (for delete impact analysis)
  getProductReferences(id: string): Observable<{ inventory: number; reviews: number; orders: number; shipments: number }> {
    return this.http.get<{ inventory: number; reviews: number; orders: number; shipments: number }>(
      `${this.baseUrl}/admin/products/${id}/references`
    );
  }

  // Product Variants
  getProductVariants(productId: string): Observable<ProductVariant[]> {
    return this.http.get<{ items: ProductVariant[] }>(`${this.baseUrl}/products/${productId}/variants`)
      .pipe(map(response => response.items));
  }

  getProductVariant(productId: string, variantId: string): Observable<ProductVariant> {
    return this.http.get<{ variant: ProductVariant }>(`${this.baseUrl}/products/${productId}/variants/${variantId}`)
      .pipe(map(response => response.variant));
  }

  createProductVariant(productId: string, variantData: Partial<ProductVariant>): Observable<ProductVariant> {
    return this.http.post<{ variant: ProductVariant }>(`${this.baseUrl}/products/${productId}/variants`, variantData)
      .pipe(map(response => response.variant));
  }

  updateProductVariant(productId: string, variantId: string, variantData: Partial<ProductVariant>): Observable<ProductVariant> {
    return this.http.put<{ variant: ProductVariant }>(`${this.baseUrl}/products/${productId}/variants/${variantId}`, variantData)
      .pipe(map(response => response.variant));
  }

  deleteProductVariant(productId: string, variantId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/products/${productId}/variants/${variantId}`);
  }

  generateVariantsMatrix(productId: string, options: Record<string, string[]>, base?: { price?: number; skuPrefix?: string }): Observable<{ count: number; variants: any[] }> {
    const body = {
      options,
      ...(base && { base })
    };
    return this.http.post<{ count: number; variants: any[] }>(
      `${this.baseUrl}/products/${productId}/variants-matrix`,
      body
    );
  }

  // Product Attributes
  getProductAttributes(productId: string): Observable<ProductAttribute[]> {
    return this.http.get<{ items: ProductAttribute[] }>(`${this.baseUrl}/products/${productId}/attributes`)
      .pipe(map(response => response.items));
  }

  createProductAttribute(productId: string, attributeData: Partial<ProductAttribute>): Observable<ProductAttribute> {
    return this.http.post<{ attribute: ProductAttribute }>(`${this.baseUrl}/products/${productId}/attributes`, attributeData)
      .pipe(map(response => response.attribute));
  }

  updateProductAttribute(productId: string, attributeId: string, attributeData: Partial<ProductAttribute>): Observable<ProductAttribute> {
    return this.http.put<{ attribute: ProductAttribute }>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}`, attributeData)
      .pipe(map(response => response.attribute));
  }

  deleteProductAttribute(productId: string, attributeId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}`);
  }

  // Attribute Options
  getAttributeOptions(productId: string, attributeId: string): Observable<any[]> {
    return this.http.get<{ items: any[] }>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}/options`)
      .pipe(map(response => response.items));
  }

  createAttributeOption(productId: string, attributeId: string, optionData: any): Observable<any> {
    return this.http.post<{ option: any }>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}/options`, optionData)
      .pipe(map(response => response.option));
  }

  updateAttributeOption(productId: string, attributeId: string, optionId: string, optionData: any): Observable<any> {
    return this.http.put<{ option: any }>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}/options/${optionId}`, optionData)
      .pipe(map(response => response.option));
  }

  deleteAttributeOption(productId: string, attributeId: string, optionId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/products/${productId}/attributes/${attributeId}/options/${optionId}`);
  }

  // Get out of stock products
  getOutOfStock(filters: Partial<ProductFilters> = {}): Observable<Paginated<Product>> {
    const outOfStockFilters: ProductFilters = {
      ...this.normalizeFilters(filters),
      outOfStock: true
    };
    return this.getAdminProducts(outOfStockFilters);
  }

  // Bulk operations
  bulkUpdateStatus(
    productIds: string[],
    isActive: boolean
  ): Observable<{ success: boolean; updated: number; failures: string[] }> {
    if (!productIds.length) {
      return of({ success: true, updated: 0, failures: [] });
    }

    return from(productIds).pipe(
      mergeMap(
        (id) =>
          this.updateProduct(id, { isActive }).pipe(
            map(() => ({ id, success: true as const })),
            catchError(() => of({ id, success: false as const }))
          ),
        4
      ),
      reduce(
        (acc, result) => {
          if (result.success) {
            acc.updated += 1;
          } else {
            acc.failures.push(result.id);
          }
          return acc;
        },
        { updated: 0, failures: [] as string[] }
      ),
      map((summary) => ({
        success: summary.failures.length === 0,
        updated: summary.updated,
        failures: summary.failures
      }))
    );
  }

  bulkDelete(productIds: string[]): Observable<{ success: boolean; deleted: number; failures: string[] }> {
    if (!productIds.length) {
      return of({ success: true, deleted: 0, failures: [] });
    }

    return from(productIds).pipe(
      mergeMap(
        (id) =>
          this.deleteProduct(id).pipe(
            map(() => ({ id, success: true as const })),
            catchError(() => of({ id, success: false as const }))
          ),
        4
      ),
      reduce(
        (acc, result) => {
          if (result.success) {
            acc.deleted += 1;
          } else {
            acc.failures.push(result.id);
          }
          return acc;
        },
        { deleted: 0, failures: [] as string[] }
      ),
      map((summary) => ({
        success: summary.failures.length === 0,
        deleted: summary.deleted,
        failures: summary.failures
      }))
    );
  }

  // Validate SKU uniqueness
  validateSku(sku: string, excludeProductId?: string): Observable<{ isUnique: boolean }> {
    let params = new HttpParams().set('sku', sku);
    if (excludeProductId) {
      params = params.set('exclude', excludeProductId);
    }
    return this.http.get<{ isUnique: boolean }>(`${this.adminProductsBaseUrl}/validate-sku`, { params });
  }

  // Validate slug uniqueness
  validateSlug(slug: string, excludeProductId?: string): Observable<{ isUnique: boolean }> {
    let params = new HttpParams().set('slug', slug);
    if (excludeProductId) {
      params = params.set('exclude', excludeProductId);
    }
    return this.http.get<{ isUnique: boolean }>(`${this.adminProductsBaseUrl}/validate-slug`, { params });
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

  private normalizeFilters(params: any): ProductFilters {
    return {
      q: params.q || params.search,
      category: params.category,
      categories: params.categories,
      brand: params.brand,
      brands: params.brands,
      minPrice: params.priceMin || params.minPrice,
      maxPrice: params.priceMax || params.maxPrice,
      isActive: params.isActive,
      status: params.status,
      featured: params.featured,
      inStock: params.inStock,
      lowStock: params.lowStock,
      outOfStock: params.outOfStock,
      hasImages: params.hasImages,
      hasVariants: params.hasVariants,
      tags: params.tags,
      attributes: params.attributes,
      page: params.page,
      limit: params.limit,
      sort: params.sort,
      order: params.order,
      createdAfter: params.createdAfter,
      createdBefore: params.createdBefore,
      updatedAfter: params.updatedAfter,
      updatedBefore: params.updatedBefore
    };
  }

  private mapPaginatedResponse<T>(response: any): Paginated<T> {
    const items = Array.isArray(response?.items)
      ? response.items
      : Array.isArray(response?.data)
        ? response.data
        : [];

    const pagination = response?.pagination ?? null;
    const total = typeof response?.total === 'number'
      ? response.total
      : typeof pagination?.total === 'number'
        ? pagination.total
        : items.length;
    const page = typeof response?.page === 'number'
      ? response.page
      : typeof pagination?.page === 'number'
        ? pagination.page
        : 1;
    const pages = typeof response?.pages === 'number'
      ? response.pages
      : typeof pagination?.pages === 'number'
        ? pagination.pages
        : 1;
    const limit = typeof response?.limit === 'number'
      ? response.limit
      : typeof pagination?.limit === 'number'
        ? pagination.limit
        : undefined;

    return {
      data: items,
      items,
      total,
      page,
      pages,
      pagination: limit !== undefined
        ? { page, limit, total, pages }
        : undefined
    };
  }

  private cleanProductForSave(productData: Partial<Product>): any {
    const cleanData = { ...productData };

    // Remove read-only fields
    delete cleanData._id;
    delete cleanData.createdAt;
    delete cleanData.updatedAt;

    // Clean up empty arrays and objects
    if (cleanData.images && Array.isArray(cleanData.images)) {
      cleanData.images = cleanData.images.filter(img => img && img.url && img.url.trim());
      if (cleanData.images.length === 0) {
        delete cleanData.images;
      }
    }

    if (cleanData.attributes && Array.isArray(cleanData.attributes)) {
      cleanData.attributes = cleanData.attributes.filter(attr => attr && attr.key && attr.key.trim());
      if (cleanData.attributes.length === 0) {
        delete cleanData.attributes;
      }
    }

    if (cleanData.variants && Array.isArray(cleanData.variants)) {
      cleanData.variants = cleanData.variants.filter(variant => this.isValidVariant(variant));
      if (cleanData.variants.length === 0) {
        delete cleanData.variants;
      }
    }

    if (cleanData.tags && Array.isArray(cleanData.tags)) {
      cleanData.tags = cleanData.tags.filter(tag => tag && tag.trim());
      if (cleanData.tags.length === 0) {
        delete cleanData.tags;
      }
    }

    // Ensure required fields have valid values
    if (typeof cleanData.price === 'string') {
      cleanData.price = parseFloat(cleanData.price) || 0;
    }
    if (typeof cleanData.stock === 'string') {
      cleanData.stock = parseInt(cleanData.stock, 10) || 0;
    }

    // Clean up empty strings
    Object.keys(cleanData).forEach(key => {
      if ((cleanData as any)[key] === '' || (cleanData as any)[key] === null) {
        delete (cleanData as any)[key];
      }
    });

    return cleanData;
  }

  private isValidVariant(variant: any): boolean {
    if (!variant) return false;

    // A variant is valid if it has at least one meaningful field
    return (
      (variant._id && variant._id.trim()) ||
      (variant.sku && variant.sku.trim()) ||
      (typeof variant.price === 'number' && variant.price > 0) ||
      (typeof variant.priceDelta === 'number' && variant.priceDelta !== 0) ||
      (typeof variant.stock === 'number' && variant.stock > 0) ||
      (variant.attributes && Array.isArray(variant.attributes) &&
       variant.attributes.some((attr: any) => attr && attr.key && attr.key.trim()))
    );
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