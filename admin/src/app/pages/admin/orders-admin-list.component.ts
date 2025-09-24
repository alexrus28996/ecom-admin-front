import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { OrdersService, Order } from '../../services/orders.service';
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS, orderStatusKey, paymentStatusKey } from './order-status.util';
import { MoneyAmount } from '../../services/api.types';

@Component({
  selector: 'app-admin-orders-list',
  templateUrl: './orders-admin-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOrdersListComponent implements OnInit {
  readonly displayedColumns = ['id', 'customer', 'status', 'payment', 'total', 'createdAt', 'actions'];
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly skeletonRows = Array.from({ length: 6 });

  orders: Order[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;

  loading = false;
  errorKey: string | null = null;

  readonly statusKeyFor = orderStatusKey;
  readonly paymentStatusKeyFor = paymentStatusKey;
  readonly statusOptions = ORDER_STATUS_OPTIONS;
  readonly paymentOptions = PAYMENT_STATUS_OPTIONS;
  readonly filterForm = this.fb.group({
    status: [''],
    paymentStatus: [''],
    email: [''],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  private readonly statusTone: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'neutral'> = {
    pending: 'warning',
    processing: 'warning',
    paid: 'success',
    shipped: 'info',
    delivered: 'info',
    cancelled: 'danger',
    refunded: 'danger'
  };

  private readonly paymentTone: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'neutral'> = {
    pending: 'warning',
    unpaid: 'warning',
    paid: 'success',
    refunded: 'info',
    failed: 'danger'
  };

  constructor(
    private readonly ordersService: OrdersService,
    private readonly cdr: ChangeDetectorRef,
    private readonly fb: FormBuilder
  ) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true;
    this.errorKey = null;
    this.cdr.markForCheck();

    const value = this.filterForm.value;
    const params: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    if (value.status) params.status = value.status;
    if (value.paymentStatus) params.paymentStatus = value.paymentStatus;
    if (value.email) params.email = value.email.trim();
    const start = value.range?.start ? new Date(value.range.start) : null;
    const end = value.range?.end ? new Date(value.range.end) : null;
    if (start) params.from = start.toISOString();
    if (end) params.to = end.toISOString();

    this.ordersService.adminList(params).subscribe({
      next: (res) => {
        this.orders = res.data || res.items || [];
        this.total = res.pagination?.total || res.total || this.orders.length;
        this.pageIndex = Math.max((res.pagination?.page || res.page || 1) - 1, 0);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'orders.errorLoad';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onPage(ev: PageEvent) {
    this.pageSize = ev.pageSize;
    this.pageIndex = ev.pageIndex;
    this.load();
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: '',
      paymentStatus: '',
      email: '',
      range: { start: null, end: null }
    });
    this.applyFilters();
  }

  refresh(): void {
    this.load();
  }

  trackById(_: number, order: Order): string {
    return order?._id ?? (order as any)?.id ?? `${_}`;
  }

  statusBadgeClass(value: string | null | undefined): string {
    return this.badgeClass(this.statusTone, value);
  }

  paymentBadgeClass(value: string | null | undefined): string {
    return this.badgeClass(this.paymentTone, value);
  }

  orderId(order: Order): string {
    return order?._id || (order as any)?.id || '';
  }

  customerName(order: Order): string {
    if (!order?.user) {
      return order?.customer?.name || '';
    }
    if (typeof order.user === 'string') {
      return order.user;
    }
    return order.user?.name || order.user?.email || order.user?._id || '';
  }

  customerEmail(order: Order): string {
    if (order?.customer?.email) {
      return order.customer.email;
    }
    if (!order?.user || typeof order.user === 'string') {
      return '';
    }
    return order.user.email || '';
  }

  totalFor(order: Order): { amount: number; currency: string } {
    return this.money(order.total, order.currency);
  }

  private badgeClass(map: Record<string, 'warning' | 'success' | 'danger' | 'info' | 'neutral'>, value: string | null | undefined): string {
    const tone = map[(value || '').toLowerCase()] || 'neutral';
    return `badge badge--${tone}`;
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
