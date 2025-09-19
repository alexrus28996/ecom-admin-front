import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { OrdersService, OrderTimelineEntry } from '../../services/orders.service';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-admin-order-detail',
  templateUrl: './order-admin-detail.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOrderDetailComponent implements OnInit {
  id = '';
  order: any = null;
  loading = false;
  errorKey: string | null = null;
  lastError: any = null;
  saving = false;

  statusOptions = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded'];
  paymentOptions = ['unpaid', 'paid', 'refunded'];

  timeline: OrderTimelineEntry[] = [];
  tlLoading = false;
  tlErrorKey: string | null = null;
  tlLastError: any = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly admin: AdminService,
    private readonly orders: OrdersService,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.admin.getOrder(this.id).subscribe({
      next: ({ order }) => {
        this.order = order;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'adminOrders.detail.errors.loadFailed';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  save(): void {
    if (!this.order) {
      return;
    }

    this.saving = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.admin.updateOrder(this.id, { status: this.order.status, paymentStatus: this.order.paymentStatus }).subscribe({
      next: ({ order }) => {
        this.order = order;
        this.saving = false;
        this.toast.success(this.i18n.instant('adminOrders.detail.toasts.updated'));
        this.cdr.markForCheck();
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'adminOrders.detail.errors.updateFailed';
        this.lastError = err;
        this.saving = false;
        this.toast.error(this.i18n.instant('adminOrders.detail.errors.updateFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  openInvoice(): void {
    if (!this.id) {
      return;
    }
    window.open(`/api/orders/${this.id}/invoice`, '_blank');
  }

  loadTimeline(): void {
    if (!this.id) {
      return;
    }
    this.tlLoading = true;
    this.tlErrorKey = null;
    this.tlLastError = null;
    this.cdr.markForCheck();

    this.orders.timeline(this.id, { page: 1, limit: 50 }).subscribe({
      next: (res) => {
        this.timeline = res.items || [];
        this.tlLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.tlLastError = err;
        const code = err?.error?.error?.code;
        this.tlErrorKey = code ? `errors.backend.${code}` : 'adminOrders.detail.errors.timelineFailed';
        this.tlLoading = false;
        this.cdr.markForCheck();
      }
    });
  }
}
