// Base interfaces
export interface Paginated<T> {
  data?: T[];
  items?: T[];
  total: number;
  page: number;
  pages: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface MoneyAmount {
  amount: number;
  currency: string;
}

export interface BaseDocument {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

// Product interfaces
export interface Product extends BaseDocument {
  name: string;
  description?: string;
  longDescription?: string;
  sku?: string;
  price: MoneyAmount;
  category?: Category;
  categories?: Category[]; // For backward compatibility
  brand?: Brand;
  images?: ProductImage[];
  variants?: ProductVariant[];
  attributes?: ProductAttribute[];
  stock: number;
  isActive: boolean;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
}

export interface ProductImage {
  url: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface ProductVariant {
  _id?: string;
  sku?: string;
  price?: MoneyAmount;
  priceDelta?: number;
  stock: number;
  isActive: boolean;
  attributes: ProductAttribute[];
}

export interface ProductAttribute {
  key: string;
  value: string;
}

// Category interfaces
export interface Category extends BaseDocument {
  name: string;
  slug: string;
  description?: string;
  parent?: string | Category;
  children?: Category[];
  displayOrder?: number;
}

// Brand interfaces
export interface Brand extends BaseDocument {
  name: string;
  slug: string;
  description?: string;
  logoUrl?: string;
  isActive: boolean;
}

// User interfaces
export interface User extends BaseDocument {
  name: string;
  email: string;
  roles: string[];
  isActive: boolean;
  isVerified: boolean;
  avatarUrl?: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  locale?: string;
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
}

// Order interfaces
export interface Order extends BaseDocument {
  orderNumber?: string;
  number?: string; // Alias for orderNumber
  user: string | User;
  customer?: { name?: string; email?: string }; // For compatibility
  items: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  totals: OrderTotals;
  total?: MoneyAmount; // For compatibility - computed from totals.total
  currency?: string; // Default currency for backward compatibility
  addresses: {
    shipping?: Address;
    billing?: Address;
  };
  coupon?: Coupon;
  couponCode?: string; // For compatibility
  timeline?: OrderTimelineEvent[];
  notes?: string;
  invoiceUrl?: string; // For PDF invoice access
}

export interface OrderItem {
  product: string | Product;
  variant?: string | ProductVariant;
  quantity: number;
  price: MoneyAmount;
  total: MoneyAmount;
  currency?: string; // For backward compatibility
}

export interface OrderTotals {
  subtotal: MoneyAmount;
  discount?: MoneyAmount;
  shipping: MoneyAmount;
  tax: MoneyAmount;
  total: MoneyAmount;
}

export interface OrderTimelineEvent {
  _id: string;
  type: string;
  message?: string;
  actor?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type OrderStatus = 'pending' | 'processing' | 'confirmed' | 'fulfilled' | 'completed' | 'shipped' | 'delivered' | 'cancelled' | 'refunded' | 'failed';
export type PaymentStatus = 'pending' | 'paid' | 'unpaid' | 'refunded' | 'failed';

// Address interfaces
export interface Address extends BaseDocument {
  type: 'shipping' | 'billing';
  name: string;
  company?: string;
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

// Return interfaces
export interface Return extends BaseDocument {
  order: string | Order;
  items: ReturnItem[];
  reason: string;
  note?: string;
  status: ReturnStatus;
  amount: MoneyAmount;
  requestedAt: string;
  processedAt?: string;
  refund?: Refund;
}

export interface ReturnItem {
  orderItem: string;
  quantity: number;
  reason?: string;
}

export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'refunded';

// Shipment interfaces
export interface Shipment extends BaseDocument {
  order: string | Order;
  carrier: string;
  trackingNumber?: string;
  status: ShipmentStatus;
  estimatedDelivery?: string;
  items: ShipmentItem[];
  statusHistory?: ShipmentStatusUpdate[];
}

export interface ShipmentItem {
  orderItem: string;
  quantity: number;
}

export interface ShipmentStatusUpdate {
  status: ShipmentStatus;
  timestamp: string;
  note?: string;
}

export type ShipmentStatus = 'pending' | 'shipped' | 'delivered' | 'cancelled';

// Inventory interfaces
export interface InventorySnapshot {
  product: string | Product;
  variant?: string | ProductVariant;
  currentStock: number;
  reorderPoint?: number;
  location?: string;
  updatedAt: string;
}

export interface InventoryAdjustment extends BaseDocument {
  product: string | Product;
  variant?: string | ProductVariant;
  quantityChange: number;
  reason: InventoryAdjustmentReason;
  note?: string;
  location?: string;
  user?: string;
}

export type InventoryAdjustmentReason = 'manual' | 'restock' | 'damage' | 'correction' | 'other';

// Coupon interfaces
export interface Coupon extends BaseDocument {
  code: string;
  description?: string;
  type: 'percent' | 'fixed';
  value: number;
  minimumAmount?: MoneyAmount;
  usageLimits?: {
    perUser?: number;
    global?: number;
  };
  usageCount: number;
  startsAt?: string;
  expiresAt?: string;
  isActive: boolean;
  eligibility?: {
    products?: string[];
    categories?: string[];
    users?: string[];
  };
}

// Review interfaces
export interface Review extends BaseDocument {
  product: string | Product;
  user?: string | User;
  rating: number;
  comment?: string;
  status: ReviewStatus;
  isReported: boolean;
  media?: ReviewMedia[];
  helpful?: number;
}

export interface ReviewMedia {
  type: 'image' | 'video';
  url: string;
  alt?: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

// Payment interfaces
export interface Transaction extends BaseDocument {
  order: string | Order;
  amount: MoneyAmount;
  type: 'payment' | 'refund';
  method: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  externalId?: string;
  metadata?: Record<string, any>;
}

export interface Refund extends BaseDocument {
  transaction: string | Transaction;
  amount: MoneyAmount;
  reason?: string;
  status: 'pending' | 'completed' | 'failed';
  processedAt?: string;
}

// Cart interfaces
export interface Cart {
  items: CartItem[];
  totals: CartTotals;
  coupon?: Coupon;
  updatedAt: string;
}

export interface CartItem {
  product: string | Product;
  variant?: string | ProductVariant;
  quantity: number;
}

export interface CartTotals {
  subtotal: MoneyAmount;
  discount?: MoneyAmount;
  total: MoneyAmount;
  itemCount: number;
}

// Dashboard/Metrics interfaces
export interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  admins: number;
  productCount: number;
  totalOrders: number;
  revenueLast7Days: DashboardChartData[];
  health?: ServiceHealth;
}

export interface DashboardChartData {
  date: string;
  value: number;
}

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'down';
  version?: string;
  services?: Record<string, { status: string; version?: string }>;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code?: string;
    message: string;
    details?: any;
  };
}

// Query/Filter interfaces
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface SortParams {
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface ProductFilters extends PaginationParams, SortParams {
  q?: string;
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  isActive?: boolean;
}

export interface OrderFilters extends PaginationParams, SortParams {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  userId?: string;
  userEmail?: string;
  dateStart?: string;
  dateEnd?: string;
}

export interface UserFilters extends PaginationParams, SortParams {
  q?: string;
  roles?: string[];
  isActive?: boolean;
}

export interface ReviewFilters extends PaginationParams, SortParams {
  product?: string;
  status?: ReviewStatus;
  rating?: number;
  dateStart?: string;
  dateEnd?: string;
}

export interface ShipmentFilters extends PaginationParams, SortParams {
  status?: ShipmentStatus;
  carrier?: string;
  dateStart?: string;
  dateEnd?: string;
}

export interface CouponFilters extends PaginationParams, SortParams {
  status?: 'active' | 'expired' | 'all';
  type?: 'percent' | 'fixed';
  dateStart?: string;
  dateEnd?: string;
}
