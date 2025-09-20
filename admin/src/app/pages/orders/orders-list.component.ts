import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';

import { OrdersService, Order } from '../../services/orders.service';
import { ToastService } from '../../core/toast.service';

@Component({
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrdersListComponent implements OnInit {
  readonly createForm = this.fb.group({
    shipping: [0, [Validators.min(0)]],
    taxRate: [0, [Validators.min(0), Validators.max(1)]]
  });

  displayedColumns: string[] = ['id', 'total', 'status', 'placed', 'actions'];
  dataSource: Order[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  readonly pageSizeOptions = [5, 10, 25, 50];

  loading = false;
  creating = false;
  errorKey: string | null = null;
  lastError: any = null;

  private readonly statusTone: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
    pending: 'warning',
    processing: 'warning',
    confirmed: 'warning',
    paid: 'success',
    fulfilled: 'success',
    completed: 'success',
    shipped: 'success',
    delivered: 'success',
    refunded: 'danger',
    cancelled: 'danger',
    failed: 'danger',
    unpaid: 'warning'
  };

  constructor(
    private readonly orders: OrdersService,
    private readonly fb: FormBuilder,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
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
        this.dataSource = res.items;
        this.total = res.total;
        this.pageIndex = Math.max(res.page - 1, 0);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'orders.list.errors.loadFailed';
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

  createOrder(): void {
    if (this.creating || this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }

    const shipping = Number(this.createForm.value.shipping ?? 0) || 0;
    const taxRate = Number(this.createForm.value.taxRate ?? 0) || 0;

    this.creating = true;
    this.cdr.markForCheck();

    this.orders.create({ shipping, taxRate }).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('orders.list.toasts.created'));
        this.creating = false;
        this.load();
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'orders.list.errors.createFailed';
        this.creating = false;
        this.toast.error(this.translate.instant('orders.list.errors.createFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  statusChipClass(value: string | undefined | null): string {
    if (!value) {
      return 'neutral';
    }
    const tone = this.statusTone[value.toLowerCase()] ?? 'neutral';
    return tone;
  }

  statusKey(value: string | undefined | null, scope: 'status' | 'paymentStatus'): string {
    const normalized = value?.toLowerCase() || 'unknown';
    return `orders.list.${scope}.${normalized}`;
  }

  trackById(_: number, order: Order): string {
    return order._id;
  }
}

