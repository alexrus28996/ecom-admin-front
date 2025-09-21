import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { AdminService } from '../../services/admin.service';
import {
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  orderStatusKey,
  paymentStatusKey
} from './order-status.util';

@Component({
  selector: 'app-admin-orders-list',
  templateUrl: './orders-admin-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOrdersListComponent implements OnInit {
  displayed = ['id', 'total', 'status', 'payment', 'createdAt', 'actions'];
  rows: any[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50, 100];

  loading = false;
  errorKey: string | null = null;

  readonly statusKeyFor = orderStatusKey;
  readonly paymentStatusKeyFor = paymentStatusKey;
  readonly statusOptions = ORDER_STATUS_OPTIONS;
  readonly paymentOptions = PAYMENT_STATUS_OPTIONS;
  readonly filterForm = this.fb.group({
    status: [''],
    paymentStatus: ['']
  });

  constructor(private admin: AdminService, private cdr: ChangeDetectorRef, private readonly fb: FormBuilder) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.errorKey = null; this.cdr.markForCheck();
    const { status, paymentStatus } = this.filterForm.value;
    this.admin
      .listOrders({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        status: status || undefined,
        paymentStatus: paymentStatus || undefined
      })
      .subscribe({
        next: (res) => {
          this.rows = res.items || [];
          this.total = res.total || 0;
          this.pageIndex = (res.page || 1) - 1;
          this.loading = false; this.cdr.markForCheck();
        },
        error: (e) => {
          const code = e?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'adminOrders.list.errors.loadFailed';
          this.loading = false; this.cdr.markForCheck();
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
}
