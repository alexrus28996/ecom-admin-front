export interface ProductAttribute {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  isRequired?: boolean;
  sortOrder?: number;
  createdAt?: string;
  updatedAt?: string;
}
