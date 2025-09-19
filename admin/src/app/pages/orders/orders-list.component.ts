import { Component, OnInit } from '@angular/core';
import { OrdersService, Order, Paginated } from '../../services/orders.service';

@Component({ selector: 'app-orders-list', templateUrl: './orders-list.component.html' })
export class OrdersListComponent implements OnInit {
  page = 1;
  limit = 10;
  loading = false;
  error = '';
  data: Paginated<Order> | null = null;
  shipping = 0;
  taxRate = 0;

  constructor(private orders: OrdersService) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.error = '';
    this.orders.list({ page: this.page, limit: this.limit }).subscribe({
      next: (res) => { this.data = res; this.loading = false; },
      error: (err) => { this.loading = false; this.error = err?.error?.error?.message || 'Failed'; }
    });
  }

  createOrder() {
    this.orders.create({ shipping: this.shipping, taxRate: this.taxRate }).subscribe({
      next: () => this.load(),
      error: (err) => { this.error = err?.error?.error?.message || 'Create failed'; }
    });
  }
}

