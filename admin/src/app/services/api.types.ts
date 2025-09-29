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
  id?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// Product interfaces
export interface Product extends BaseDocument {
  name: string;
  slug?: string;
  description?: string;
  longDescription?: string;
  sku?: string;
  price: number | MoneyAmount;
  compareAtPrice?: number | MoneyAmount;
  costPrice?: number | MoneyAmount;
  category?: Category | string;
  categories?: Category[]; // For backward compatibility
  currency?: string; // For backward compatibility
  brand?: Brand | string;
  vendor?: string;
  images?: ProductImage[];
  variants?: ProductVariant[];
  attributes?: ProductAttribute[] | Record<string, string>;
  stock: number;
  isActive: boolean;
  requiresShipping?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  tags?: string[];
  barcode?: string;
  taxClass?: string;
  weight?: number;
  weightUnit?: string;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: 'cm' | 'in';
  };
  seoKeywords?: string[];
  featured?: boolean;
  comparePrice?: number | MoneyAmount;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  lowStockThreshold?: number;
}

export interface ProductImage {
  _id?: string;
  url: string;
  alt?: string;
  isPrimary?: boolean;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
  position?: number;
}

export interface ProductVariant {
  _id?: string;
  sku?: string;
  barcode?: string;
  price?: number | MoneyAmount;
  comparePrice?: number | MoneyAmount;
  priceDelta?: number;
  stock?: number;
  isActive?: boolean;
  attributes?: ProductAttribute[] | Record<string, string>;
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    unit?: 'cm' | 'in';
  };
  images?: ProductImage[];
  position?: number;
  trackInventory?: boolean;
  allowBackorder?: boolean;
  lowStockThreshold?: number;
}

export interface ProductAttribute {
  _id?: string;
  key: string;
  value: string;
  type?: 'text' | 'number' | 'boolean' | 'date' | 'color' | 'size';
  unit?: string;
  required?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  position?: number;
}

// Category interfaces
export interface Category extends BaseDocument {
  name: string;
  slug: string;
  description?: string;
  parent?: string | Category;
  children?: Category[];
  displayOrder?: number;
  isActive?: boolean;
  productCount?: number;
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
  _id?: string;
  id?: string;
  name?: string;
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

export type InventoryAdjustmentReason =
  | 'ORDER'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'TRANSFER'
  | 'RESERVATION'
  | 'STOCKTAKE'
  | 'CORRECTION'
  | 'DAMAGED'
  | 'OTHER'
  | 'MANUAL'
  | 'RESTOCK';

export interface StockItem extends BaseDocument {
  product: string | Product;
  variant?: string | ProductVariant;
  location?: string | InventoryLocation;
  onHand: number;
  reserved: number;
  available: number;
  updatedAt: string;
  reorderPoint?: number | null;
}

export interface InventoryReservation extends BaseDocument {
  orderId?: string;
  product: string | Product;
  variant?: string | ProductVariant;
  location?: string | InventoryLocation;
  reservedQty: number;
  status: ReservationStatus;
  expiresAt?: string | null;
}

export type ReservationStatus = 'ACTIVE' | 'RELEASED' | 'EXPIRED';

export interface InventoryLocation extends BaseDocument {
  code: string;
  name: string;
  type?: LocationType;
  geo?: {
    address1?: string;
    address2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
  } | null;
  priority?: number | null;
  active: boolean;
  metadata?: Record<string, unknown> | null;
}

export type LocationType =
  | 'WAREHOUSE'
  | 'STORE'
  | 'DISTRIBUTION'
  | 'FULFILLMENT'
  | 'VENDOR'
  | 'OTHER'
  | 'DROPSHIP'
  | 'BUFFER';

export interface TransferOrder extends BaseDocument {
  fromLocation: string | InventoryLocation;
  toLocation: string | InventoryLocation;
  status: TransferStatus;
  lines: TransferOrderLine[];
  metadata?: Record<string, unknown> | null;
  timeline?: TransferTimelineEvent[];
}

export interface TransferOrderLine {
  product: string | Product;
  variant?: string | ProductVariant;
  quantity: number;
}

export type TransferStatus = 'DRAFT' | 'REQUESTED' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';

export interface TransferTimelineEvent {
  status: TransferStatus;
  occurredAt: string;
  actor?: string | User;
  note?: string;
}

export interface StockLedgerEntry extends BaseDocument {
  product: string | Product;
  variant?: string | ProductVariant;
  location?: string | InventoryLocation;
  quantity: number;
  direction: InventoryDirection;
  reason?: InventoryAdjustmentReason;
  refType?: string;
  refId?: string;
  occurredAt: string;
  actor?: string | User;
  metadata?: Record<string, unknown> | null;
}

export type InventoryDirection = 'IN' | 'OUT';

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
  search?: string; // Alias for q
  category?: string;
  categories?: string[]; // Multiple categories
  brand?: string;
  brands?: string[]; // Multiple brands
  minPrice?: number;
  maxPrice?: number;
  priceMin?: number; // Alias for minPrice
  priceMax?: number; // Alias for maxPrice
  isActive?: boolean;
  status?: 'active' | 'inactive' | 'all';
  featured?: boolean;
  inStock?: boolean;
  lowStock?: boolean;
  outOfStock?: boolean;
  tags?: string[];
  attributes?: Record<string, string | string[]>;
  hasImages?: boolean;
  hasVariants?: boolean;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
}

export interface OrderFilters extends PaginationParams, SortParams {
  status?: OrderStatus | (string & {});
  paymentStatus?: PaymentStatus | (string & {});
  userId?: string;
  userEmail?: string;
  customer?: string;
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
