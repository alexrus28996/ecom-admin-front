import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { SelectionModel } from '@angular/cdk/collections';
import { MatDialog } from '@angular/material/dialog';
import { OrdersService, Order } from '../../services/orders.service';
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS, orderStatusKey, paymentStatusKey } from './order-status.util';
import { MoneyAmount } from '../../services/api.types';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { PermissionsService } from '../../core/permissions.service';

@Component({
  selector: 'app-admin-orders-list',
  templateUrl: './orders-admin-list.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOrdersListComponent implements OnInit {
  readonly displayedColumns = ['select', 'id', 'customer', 'status', 'payment', 'total', 'createdAt', 'actions'];
  readonly pageSizeOptions = [10, 25, 50, 100];
  readonly skeletonRows = Array.from({ length: 6 });

  orders: Order[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  readonly selection = new SelectionModel<Order>(true, []);

  loading = false;
  errorKey: string | null = null;
  exporting = false;
  bulkUpdating = false;

  readonly statusKeyFor = orderStatusKey;
  readonly paymentStatusKeyFor = paymentStatusKey;
  readonly statusOptions = ORDER_STATUS_OPTIONS;
  readonly paymentOptions = PAYMENT_STATUS_OPTIONS;
  readonly filterForm = this.fb.group({
    status: [''],
    paymentStatus: [''],
    email: [''],
    customer: [''],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  readonly canEdit$ = this.permissions.can$('order:edit');

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
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
    private readonly permissions: PermissionsService
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
    if (value.customer) params.customer = value.customer.trim();
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
        this.selection.clear();
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
      customer: '',
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

  toggleAll(): void {
    if (this.isAllSelected()) {
      this.selection.clear();
      return;
    }
    this.orders.forEach((order) => this.selection.select(order));
  }

  isAllSelected(): boolean {
    return this.selection.selected.length === this.orders.length && this.orders.length > 0;
  }

  selectedIds(): string[] {
    return this.selection.selected
      .map((order) => this.orderId(order))
      .filter((id): id is string => !!id);
  }

  bulkMarkShipped(): void {
    const ids = this.selectedIds();
    if (!ids.length || this.bulkUpdating) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'orders.bulk.markShippedTitle',
        messageKey: 'orders.bulk.markShippedMessage',
        confirmKey: 'orders.bulk.markShippedConfirm',
        cancelKey: 'common.actions.cancel'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.bulkUpdating = true;
      this.cdr.markForCheck();
      this.ordersService.bulkUpdateAdminOrders(ids, { status: 'shipped' }).subscribe({
        next: () => {
          this.bulkUpdating = false;
          this.toast.success(this.t('orders.bulk.markShippedSuccess', 'Orders marked as shipped.'));
          this.load();
        },
        error: (error) => {
          this.bulkUpdating = false;
          this.toast.error(this.t('orders.bulk.markShippedError', 'Failed to update orders.'));
          this.errorKey = error?.error?.error?.code ? `errors.backend.${error.error.error.code}` : 'orders.errorLoad';
          this.cdr.markForCheck();
        }
      });
    });
  }

  exportOrders(): void {
    if (this.exporting) {
      return;
    }

    const value = this.filterForm.value;
    const filters = {
      status: value.status || undefined,
      paymentStatus: value.paymentStatus || undefined,
      userEmail: value.email?.trim() || undefined,
      customer: value.customer?.trim() || undefined,
      dateStart: value.range?.start ? new Date(value.range.start).toISOString() : undefined,
      dateEnd: value.range?.end ? new Date(value.range.end).toISOString() : undefined
    };

    this.exporting = true;
    this.cdr.markForCheck();
    this.ordersService.exportAdminOrders(filters).subscribe({
      next: (blob) => {
        this.exporting = false;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `orders-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
        this.toast.success(this.t('orders.actions.exportSuccess', 'Export complete.'));
      },
      error: (error) => {
        this.exporting = false;
        this.toast.error(this.t('orders.actions.exportError', 'Export failed.'));
        this.errorKey = error?.error?.error?.code ? `errors.backend.${error.error.error.code}` : 'orders.errorLoad';
        this.cdr.markForCheck();
      }
    });
  }

  private t(key: string, fallback: string): string {
    const value = this.i18n.instant(key);
    return value === key ? fallback : value;
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

  private money(value: number | MoneyAmount | null | undefined, fallbackCurrency?: string): { amount: number; currency: string } {
    const currency = this.isMoneyAmount(value)
      ? value.currency || fallbackCurrency || 'USD'
      : fallbackCurrency || 'USD';

    if (this.isMoneyAmount(value)) {
      return {
        amount: Number(value.amount ?? 0),
        currency
      };
    }
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return { amount: value, currency };
    }
    return { amount: 0, currency };
  }

  private isMoneyAmount(value: unknown): value is MoneyAmount {
    return typeof value === 'object' && value !== null && 'amount' in value && 'currency' in value;
  }
}
