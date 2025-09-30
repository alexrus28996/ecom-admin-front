export interface ProductVariantSelection {
  attributeId: string;
  optionId: string;
  attributeName?: string;
  optionName?: string;
}

export interface ProductVariant {
  _id: string;
  sku?: string;
  barcode?: string;
  isActive?: boolean;
  priceOverride?: number;
  priceDelta?: number;
  stock?: number;
  selections: ProductVariantSelection[];
  createdAt?: string;
  updatedAt?: string;
}

export interface VariantMatrixPreviewRequest {
  attributes: Array<{ attributeId: string; optionIds: string[] }>;
  basePrice?: number;
  skuPrefix?: string;
}

export interface VariantMatrixItem {
  sku?: string;
  price?: number;
  selections: ProductVariantSelection[];
  disabled?: boolean;
}

export interface VariantMatrixPreviewResponse {
  count: number;
  items: VariantMatrixItem[];
}
