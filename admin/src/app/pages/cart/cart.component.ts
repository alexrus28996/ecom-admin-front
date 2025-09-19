import { Component, OnInit } from '@angular/core';
import { CartService, Cart } from '../../services/cart.service';

@Component({ selector: 'app-cart', templateUrl: './cart.component.html' })
export class CartComponent implements OnInit {
  cart: Cart | null = null;
  loading = false;
  error = '';

  constructor(private cartSvc: CartService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.cartSvc.get().subscribe({ next: ({ cart }) => { this.cart = cart; this.loading = false; }, error: (err) => { this.loading = false; this.error = err?.error?.error?.message || 'Failed'; } });
  }

  inc(p: string, q: number) {
    const newQ = q + 1;
    this.cartSvc.updateItem(p, newQ).subscribe({ next: ({ cart }) => { this.cart = cart; }, error: () => {} });
  }
  dec(p: string, q: number) {
    const newQ = Math.max(1, q - 1);
    this.cartSvc.updateItem(p, newQ).subscribe({ next: ({ cart }) => { this.cart = cart; }, error: () => {} });
  }
  remove(p: string) {
    this.cartSvc.removeItem(p).subscribe({ next: ({ cart }) => { this.cart = cart; }, error: () => {} });
  }
  clear() {
    this.cartSvc.clear().subscribe({ next: ({ cart }) => { this.cart = cart; }, error: () => {} });
  }
}

