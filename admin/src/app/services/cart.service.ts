import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MoneyAmount, Paginated } from './api.types';
export { MoneyAmount } from './api.types';

export interface CartItemTotals {
  unit?: MoneyAmount | null;
  line?: MoneyAmount | null;
}

export interface CartItemProduct {
  _id?: string | null;
  name?: string | null;
  slug?: string | null;
  sku?: string | null;
}

export interface CartItem {
  _id?: string | null;
  itemId?: string | null;
  product?: string | null;
  productId?: string | null;
  variant?: string | null;
  sku?: string | null;
  name?: string | null;
  price?: number | null;
  currency?: string | null;
  quantity: number;
  unitPrice?: MoneyAmount | null;
  lineTotal?: MoneyAmount | null;
  totals?: CartItemTotals | null;
  image?: string | null;
  productData?: CartItemProduct | null;
}

export interface CartCoupon {
  code: string;
  name?: string | null;
  description?: string | null;
  discountAmount?: number | MoneyAmount | null;
  amountOff?: number | MoneyAmount | null;
  percentOff?: number | null;
  type?: 'percentage' | 'fixed' | string;
}

export interface CartTotals {
  subtotal?: number | MoneyAmount | null;
  discountTotal?: number | MoneyAmount | null;
  shippingTotal?: number | MoneyAmount | null;
  taxTotal?: number | MoneyAmount | null;
  total?: number | MoneyAmount | null;
}

export interface Cart {
  _id?: string | null;
  id?: string | null;
  user?: string | null;
  items: CartItem[];
  subtotal?: number | null;
  discountTotal?: number | null;
  shipping?: number | null;
  tax?: number | null;
  total?: number | null;
  currency?: string | null;
  status?: string | null;
  coupon?: CartCoupon | null;
  totals?: CartTotals | null;
  updatedAt?: string | null;
}

export interface CartEstimateInput {
  shipping?: Record<string, any> | null;
  taxRate?: number | null;
}

export interface CartEstimate {
  subtotal: number;
  discount?: number | null;
  shipping?: number | null;
  tax?: number | null;
  total: number;
  currency: string;
}

export interface SavedCart {
  _id: string;
  name?: string | null;
  description?: string | null;
  items: CartItem[];
  totals?: CartTotals | null;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({ providedIn: 'root' })
export class CartService {
  private readonly base = `${environment.apiBaseUrl}/cart`;
  private readonly savedBase = `${this.base}/saved`;

  constructor(private readonly http: HttpClient) {}

  get(): Observable<{ cart: Cart }> {
    return this.http.get<{ cart: Cart }>(this.base);
  }

  addItem(productId: string, quantity = 1, variantId?: string): Observable<{ cart: Cart }> {
    return this.http.post<{ cart: Cart }>(`${this.base}/items`, { productId, variantId, quantity });
  }

  updateItem(productId: string, quantity: number, variantId?: string): Observable<{ cart: Cart }> {
    return this.http.patch<{ cart: Cart }>(`${this.base}/items/${productId}`, { quantity, variantId });
  }

  removeItem(productId: string, params: { variantId?: string } = {}): Observable<{ cart: Cart }> {
    let httpParams = new HttpParams();
    if (params.variantId) httpParams = httpParams.set('variantId', params.variantId);
    return this.http.delete<{ cart: Cart }>(`${this.base}/items/${productId}`, { params: httpParams });
  }

  clear(): Observable<{ cart: Cart }> {
    return this.http.post<{ cart: Cart }>(`${this.base}/clear`, {});
  }

  applyCoupon(code: string): Observable<{ cart: Cart }> {
    return this.http.post<{ cart: Cart }>(`${this.base}/coupon`, { code });
  }

  removeCoupon(): Observable<{ cart: Cart }> {
    return this.http.delete<{ cart: Cart }>(`${this.base}/coupon`);
  }

  estimate(payload: CartEstimateInput): Observable<CartEstimate> {
    return this.http.post<CartEstimate>(`${this.base}/estimate`, payload ?? {});
  }

  listSaved(params: { page?: number; limit?: number } = {}): Observable<Paginated<SavedCart>> {
    let httpParams = new HttpParams();
    if (params.page) httpParams = httpParams.set('page', String(params.page));
    if (params.limit) httpParams = httpParams.set('limit', String(params.limit));
    return this.http.get<Paginated<SavedCart>>(this.savedBase, { params: httpParams });
  }

  getSaved(id: string): Observable<{ savedCart: SavedCart }> {
    return this.http.get<{ savedCart: SavedCart }>(`${this.savedBase}/${id}`);
  }

  saveCurrent(payload: { name?: string; description?: string } = {}): Observable<{ savedCart: SavedCart }> {
    return this.http.post<{ savedCart: SavedCart }>(this.savedBase, payload);
  }

  restoreSaved(id: string): Observable<{ cart: Cart }> {
    return this.http.post<{ cart: Cart }>(`${this.savedBase}/${id}/restore`, {});
  }

  deleteSaved(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.savedBase}/${id}`);
  }
}
