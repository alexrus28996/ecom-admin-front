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
    return this.http.get<ApiResponse<{ product: Product }>>(`${this.baseUrl}/products/${id}`)
      .pipe(map(response => response.data!.product));
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

    return this.http.post<ApiResponse<{ product: Product }>>(`${this.baseUrl}/admin/products`, cleanData, {
      headers: { 'Idempotency-Key': this.generateIdempotencyKey() }
    }).pipe(map(response => response.data!.product));
  }

  updateProduct(id: string, productData: Partial<Product>): Observable<Product> {
    // Strip read-only fields
    const cleanData = this.cleanProductForSave(productData);

    return this.http.patch<ApiResponse<{ product: Product }>>(`${this.baseUrl}/admin/products/${id}`, cleanData)
      .pipe(map(response => response.data!.product));
  }

  deleteProduct(id: string): Observable<{ success: boolean }> {
    return this.http.delete<ApiResponse<any>>(`${this.baseUrl}/admin/products/${id}`)
      .pipe(map(response => ({ success: true })));
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
  importProducts(products: Partial<Product>[]): Observable<{ inserted: number; failed: number; errors: any[] }> {
    const importData = {
      items: products.map(product => this.cleanProductForSave(product))
    };
    return this.http.post<{ inserted: number; failed: number; errors: any[] }>(
      `${this.baseUrl}/admin/products/import`,
      importData
    );
  }

  exportProducts(format: 'json' | 'csv' = 'json'): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/admin/products/export`, {
      params: { format },
      responseType: 'blob'
    });
  }

  // Bulk Operations
  bulkUpdatePrices(factorPercent: number, filter?: { q?: string; category?: string }): Observable<{ matched: number; modified: number; factor: number }> {
    const body = {
      factorPercent,
      ...(filter && { filter })
    };
    return this.http.post<{ matched: number; modified: number; factor: number }>(
      `${this.baseUrl}/admin/products/price-bulk`,
      body
    );
  }

  bulkUpdateCategory(categoryId: string, productIds: string[]): Observable<{ matched: number; modified: number }> {
    return this.http.post<{ matched: number; modified: number }>(
      `${this.baseUrl}/admin/products/category-bulk`,
      { categoryId, productIds }
    );
  }

  bulkUpdateStatus(productIds: string[], isActive: boolean): Observable<{ matched: number; modified: number }> {
    return this.http.post<{ matched: number; modified: number }>(
      `${this.baseUrl}/admin/products/status-bulk`,
      { productIds, isActive }
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
  bulkUpdateStatus(productIds: string[], isActive: boolean): Observable<{ success: boolean; updated: number }> {
    return this.http.patch<ApiResponse<{ updated: number }>>(`${this.baseUrl}/admin/products/bulk/status`, {
      productIds,
      isActive
    }).pipe(map(response => ({ success: true, updated: response.data!.updated })));
  }

  bulkDelete(productIds: string[]): Observable<{ success: boolean; deleted: number }> {
    return this.http.delete<ApiResponse<{ deleted: number }>>(`${this.baseUrl}/admin/products/bulk`, {
      body: { productIds }
    }).pipe(map(response => ({ success: true, deleted: response.data!.deleted })));
  }

  // Duplicate product
  duplicate(productId: string, newName?: string): Observable<Product> {
    return this.http.post<ApiResponse<{ product: Product }>>(`${this.baseUrl}/admin/products/${productId}/duplicate`, {
      name: newName
    }).pipe(map(response => response.data!.product));
  }

  // Validate SKU uniqueness
  validateSku(sku: string, excludeProductId?: string): Observable<{ isUnique: boolean }> {
    let params = new HttpParams().set('sku', sku);
    if (excludeProductId) {
      params = params.set('exclude', excludeProductId);
    }
    return this.http.get<ApiResponse<{ isUnique: boolean }>>(`${this.baseUrl}/admin/products/validate-sku`, { params })
      .pipe(map(response => response.data!));
  }

  // Validate slug uniqueness
  validateSlug(slug: string, excludeProductId?: string): Observable<{ isUnique: boolean }> {
    let params = new HttpParams().set('slug', slug);
    if (excludeProductId) {
      params = params.set('exclude', excludeProductId);
    }
    return this.http.get<ApiResponse<{ isUnique: boolean }>>(`${this.baseUrl}/admin/products/validate-slug`, { params })
      .pipe(map(response => response.data!));
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