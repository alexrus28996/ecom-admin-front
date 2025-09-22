import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';

import { OrdersService, Order } from '../../services/orders.service';
import { MoneyAmount } from '../../services/api.types';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersListComponent implements OnInit {
  readonly displayedColumns = ['id', 'date', 'status', 'total', 'actions'];
  readonly pageSizeOptions = [10, 25, 50];
  readonly skeletonRows = Array.from({ length: 6 });

  rows: Order[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;

  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  private readonly statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
    pending: 'warning',
    processing: 'warning',
    confirmed: 'info',
    paid: 'success',
    fulfilled: 'success',
    completed: 'success',
    shipped: 'info',
    delivered: 'success',
    refunded: 'danger',
    cancelled: 'danger',
    failed: 'danger',
    unpaid: 'warning'
  };

  constructor(
    private readonly orders: OrdersService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.orders.list({ page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
      next: (res) => {
        this.rows = res.items || [];
        this.total = res.total;
        this.pageIndex = Math.max(res.page - 1, 0);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'orders.errorLoad';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPageChange(event: PageEvent): void {
    if (this.pageSize !== event.pageSize) {
      this.pageSize = event.pageSize;
    }
    this.pageIndex = event.pageIndex;
    this.load();
  }

  statusChipClass(value: string | undefined | null): string {
    if (!value) {
      return 'badge badge--neutral';
    }
    const tone = this.statusTone[value.toLowerCase()] ?? 'neutral';
    return `badge badge--${tone}`;
  }

  statusKey(value: string | undefined | null): string {
    return value ? `orders.status.${value.toLowerCase()}` : 'orders.status.unknown';
  }

  trackById(_: number, order: Order): string {
    return order._id;
  }

  totalFor(order: Order): { amount: number; currency: string } {
    return this.money(order.total, order.currency);
  }

  private money(value: number | MoneyAmount | null | undefined, fallbackCurrency: string): { amount: number; currency: string } {
    if (this.isMoneyAmount(value)) {
      return {
        amount: Number(value.amount || 0),
        currency: value.currency || fallbackCurrency
      };
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return { amount: value, currency: fallbackCurrency };
    }
    return { amount: 0, currency: fallbackCurrency };
  }

  private isMoneyAmount(value: unknown): value is MoneyAmount {
    return typeof value === 'object' && value !== null && 'amount' in value && 'currency' in value;
  }
}

