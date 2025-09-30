export interface ProductOptionMetadata {
  [key: string]: string | number | boolean | null;
}

export interface ProductOption {
  _id: string;
  name: string;
  slug: string;
  sortOrder?: number;
  metadata?: ProductOptionMetadata;
  createdAt?: string;
  updatedAt?: string;
}
