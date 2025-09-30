export interface ProductImage {
  url: string;
  alt?: string;
  sortOrder?: number;
}

export interface ProductDimension {
  length?: number;
  width?: number;
  height?: number;
  unit?: string;
}

export interface ProductSeo {
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords?: string[];
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  longDescription?: string;
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency: string;
  images: ProductImage[];
  attributes: Record<string, string>;
  category?: string;
  brand?: string;
  vendor?: string;
  taxClass?: string;
  tags?: string[];
  sku?: string;
  barcode?: string;
  mpn?: string;
  requiresShipping?: boolean;
  weight?: number;
  weightUnit?: string;
  dimensions?: ProductDimension;
  isActive?: boolean;
  seo?: ProductSeo;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaginatedProducts<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  limit?: number;
}

export interface ProductFilters {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  priceMin?: number;
  priceMax?: number;
}
