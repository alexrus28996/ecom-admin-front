import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CartItem { product: string; name: string; price: number; currency: string; quantity: number; }
export interface Cart { _id: string; user: string; items: CartItem[]; subtotal: number; currency: string; status: string; }

@Injectable({ providedIn: 'root' })
export class CartService {
  private base = `${environment.apiBaseUrl}/cart`;
  constructor(private http: HttpClient) {}

  get(): Observable<{ cart: Cart }> { return this.http.get<{ cart: Cart }>(this.base); }
  addItem(productId: string, quantity = 1): Observable<{ cart: Cart }> { return this.http.post<{ cart: Cart }>(`${this.base}/items`, { productId, quantity }); }
  updateItem(productId: string, quantity: number): Observable<{ cart: Cart }> { return this.http.patch<{ cart: Cart }>(`${this.base}/items/${productId}`, { quantity }); }
  removeItem(productId: string): Observable<{ cart: Cart }> { return this.http.delete<{ cart: Cart }>(`${this.base}/items/${productId}`); }
  clear(): Observable<{ cart: Cart }> { return this.http.post<{ cart: Cart }>(`${this.base}/clear`, {}); }
}

