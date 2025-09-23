import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ToastService } from '../../core/toast.service';
import { OrdersService, Order, OrderTimelineEntry, OrderAddress, OrderItem } from '../../services/orders.service';
import { ORDER_STATUS_OPTIONS, PAYMENT_STATUS_OPTIONS, StatusOption, orderStatusKey, paymentStatusKey, OrderStatusValue, PaymentStatusValue } from './order-status.util';
import { MoneyAmount } from '../../services/api.types';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { ShipmentFormComponent, ShipmentFormData } from './shipments/shipment-form.component';
import { PermissionsService } from '../../core/permissions.service';

@Component({
  selector: 'app-admin-order-detail',
  templateUrl: './order-admin-detail.component.html',
  styleUrls: ['./order-admin-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminOrderDetailComponent implements OnInit, OnDestroy {
  id = '';
  order: Order | null = null;
  loading = false;
  errorKey: string | null = null;
  lastError: any = null;
  saving = false;
  cancelling = false;

  readonly statusOptions: StatusOption<OrderStatusValue>[] = ORDER_STATUS_OPTIONS;
  readonly paymentOptions: StatusOption<PaymentStatusValue>[] = PAYMENT_STATUS_OPTIONS;
  readonly statusKeyFor = orderStatusKey;
  readonly paymentStatusKeyFor = paymentStatusKey;

  timeline: OrderTimelineEntry[] = [];
  tlLoading = false;
  tlErrorKey: string | null = null;
  tlLastError: any = null;

  readonly statusForm = this.fb.group({
    status: ['', Validators.required],
    paymentStatus: ['', Validators.required]
  });

  readonly orderPermissions$ = combineLatest({
    update: this.permissions.can$('orders.update'),
    shipment: this.permissions.can$('orders.shipments.create')
  });
  canUpdateOrder = true;
  private readonly destroy$ = new Subject<void>();

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
    private readonly route: ActivatedRoute,
    private readonly orders: OrdersService,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly cdr: ChangeDetectorRef,
    private readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.observePermissions();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private observePermissions(): void {
    this.orderPermissions$
      .pipe(
        map((perms) => perms.update),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((canUpdate) => {
        this.canUpdateOrder = !!canUpdate;
        if (this.canUpdateOrder) {
          this.statusForm.enable({ emitEvent: false });
        } else {
          this.statusForm.disable({ emitEvent: false });
        }
        this.cdr.markForCheck();
      });
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.orders.adminGet(this.id).subscribe({
      next: ({ order }) => {
        this.order = order;
        this.statusForm.patchValue({
          status: order.status || '',
          paymentStatus: order.paymentStatus || ''
        });
        this.loading = false;
        this.cdr.markForCheck();
        this.loadTimeline();
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

  updateStatus(): void {
    if (!this.canUpdateOrder) {
      return;
    }

    if (!this.order || this.statusForm.invalid) {
      this.statusForm.markAllAsTouched();
      return;
    }

    const { status, paymentStatus } = this.statusForm.value;
    this.saving = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.orders.adminUpdate(this.id, { status: status || undefined, paymentStatus: paymentStatus || undefined }).subscribe({
      next: ({ order }) => {
        this.order = order;
        this.statusForm.patchValue({ status: order.status || '', paymentStatus: order.paymentStatus || '' }, { emitEvent: false });
        this.saving = false;
        this.toast.success(this.i18n.instant('orders.saveSuccess'));
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'orders.errorLoad';
        this.saving = false;
        this.toast.error(this.i18n.instant('orders.errorLoad'));
        this.cdr.markForCheck();
      }
    });
  }

  openInvoice(): void {
    if (!this.id) {
      return;
    }
    const url = this.order?.invoiceUrl || `/api/orders/${this.id}/invoice`;
    window.open(url, '_blank');
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
        this.tlErrorKey = code ? `errors.backend.${code}` : 'orders.errorTimeline';
        this.tlLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancelOrder(): void {
    if (!this.canUpdateOrder || !this.order || this.cancelling) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'orders.cancel',
        messageKey: 'orders.cancelConfirm',
        confirmKey: 'orders.cancel',
        cancelKey: 'common.actions.cancel'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.cancelling = true;
      this.cdr.markForCheck();

      this.orders.adminCancel(this.id).subscribe({
        next: ({ order }) => {
          this.order = order;
          this.statusForm.patchValue({ status: order.status || '', paymentStatus: order.paymentStatus || '' }, { emitEvent: false });
          this.cancelling = false;
          this.toast.success(this.i18n.instant('orders.cancelSuccess'));
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cancelling = false;
          this.lastError = err;
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'orders.errorLoad';
          this.toast.error(this.i18n.instant('orders.errorLoad'));
          this.cdr.markForCheck();
        }
      });
    });
  }

  createShipment(): void {
    if (!this.permissions.can('orders.shipments.create') || !this.order) {
      return;
    }

    const ref = this.dialog.open<ShipmentFormComponent, ShipmentFormData>(ShipmentFormComponent, {
      width: '520px',
      data: {
        mode: 'create',
        orderId: this.orderId(this.order)
      }
    });

    ref.afterClosed().subscribe((created) => {
      if (created) {
        this.toast.success(this.i18n.instant('shipments.list.toasts.created'));
        this.load();
      }
    });
  }

  badgeClass(value: string | null | undefined, type: 'status' | 'payment'): string {
    const toneMap = type === 'status' ? this.statusTone : this.paymentTone;
    const tone = toneMap[(value || '').toLowerCase()] || 'neutral';
    return `badge badge--${tone}`;
  }

  orderId(order: Order): string {
    return order?._id || (order as any)?.id || '';
  }

  customerName(order: Order | null): string {
    if (!order) {
      return '';
    }
    if (order.customer?.name) {
      return order.customer.name;
    }
    if (!order.user) {
      return '';
    }
    if (typeof order.user === 'string') {
      return order.user;
    }
    return order.user.name || order.user.email || order.user._id || '';
  }

  customerEmail(order: Order | null): string {
    if (!order) {
      return '';
    }
    if (order.customer?.email) {
      return order.customer.email;
    }
    if (!order.user || typeof order.user === 'string') {
      return '';
    }
    return order.user.email || '';
  }

  addressLines(address: OrderAddress | null | undefined): string[] {
    if (!address) {
      return [];
    }
    const lines: string[] = [];
    if (address.name) lines.push(address.name);
    if (address.company) lines.push(address.company);
    const street = [address.line1, address.line2].filter(Boolean).join(', ');
    if (street) lines.push(street);
    const cityLine = [address.city, address.region, address.postalCode].filter(Boolean).join(', ');
    if (cityLine) lines.push(cityLine);
    if (address.country) lines.push(address.country);
    if (address.phone) lines.push(address.phone);
    return lines;
  }

  itemPrice(item: OrderItem, fallbackCurrency: string): { amount: number; currency: string } {
    return this.money(item.price, item.currency || fallbackCurrency);
  }

  itemLineTotal(item: OrderItem, fallbackCurrency: string): { amount: number; currency: string } {
    const price = this.itemPrice(item, fallbackCurrency);
    return { amount: price.amount * (item.quantity ?? 0), currency: price.currency };
  }

  money(value: number | MoneyAmount | null | undefined, fallbackCurrency: string): { amount: number; currency: string } {
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

  timelineLabel(entry: OrderTimelineEntry): string {
    const type = (entry?.type || 'event').toLowerCase().replace(/\s+/g, '_');
    return `orders.timelineTypes.${type}`;
  }

  timelineDescription(entry: OrderTimelineEntry): string {
    if (entry?.message) {
      return entry.message;
    }
    if (entry?.actor?.name) {
      return entry.actor.name;
    }
    return this.i18n.instant('orders.timelineNoDetails');
  }

  private isMoneyAmount(value: unknown): value is MoneyAmount {
    return typeof value === 'object' && value !== null && 'amount' in value && 'currency' in value;
  }
}
