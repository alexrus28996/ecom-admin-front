import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { AdminService } from '../../services/admin.service';
import { orderStatusKey, paymentStatusKey } from './order-status.util';

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

  constructor(private admin: AdminService, private cdr: ChangeDetectorRef) {}

  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.errorKey = null; this.cdr.markForCheck();
    this.admin.listOrders({ page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
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
}
