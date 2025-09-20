import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MoneyAmount {
  amount: number;
  currency: string;
}

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

@Injectable({ providedIn: 'root' })
export class CartService {
  private base = `${environment.apiBaseUrl}/cart`;
  constructor(private http: HttpClient) {}

  get(): Observable<{ cart: Cart }> { return this.http.get<{ cart: Cart }>(this.base); }
  addItem(productId: string, quantity = 1): Observable<{ cart: Cart }> { return this.http.post<{ cart: Cart }>(`${this.base}/items`, { productId, quantity }); }
  updateItem(productId: string, quantity: number): Observable<{ cart: Cart }> { return this.http.patch<{ cart: Cart }>(`${this.base}/items/${productId}`, { quantity }); }
  removeItem(productId: string): Observable<{ cart: Cart }> { return this.http.delete<{ cart: Cart }>(`${this.base}/items/${productId}`); }
  clear(): Observable<{ cart: Cart }> { return this.http.post<{ cart: Cart }>(`${this.base}/clear`, {}); }

  applyCoupon(code: string): Observable<{ cart: Cart }> {
    return this.http.post<{ cart: Cart }>(`${this.base}/coupon`, { code });
  }

  removeCoupon(): Observable<{ cart: Cart }> {
    return this.http.delete<{ cart: Cart }>(`${this.base}/coupon`);
  }
}

