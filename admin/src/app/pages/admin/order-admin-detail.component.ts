import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { combineLatest, Subject } from 'rxjs';
import { distinctUntilChanged, map, takeUntil } from 'rxjs/operators';
import { ToastService } from '../../core/toast.service';
import {
  OrdersService,
  Order,
  OrderTimelineEntry,
  OrderAddress,
  OrderItem,
  OrderFulfillmentPayload,
  OrderRefundPayload,
  OrderTimelinePayload
} from '../../services/orders.service';
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

  readonly fulfillmentForm = this.fb.group({
    carrier: [''],
    trackingNumber: [''],
    note: [''],
    items: this.fb.array([] as FormGroup[])
  });

  readonly refundForm = this.fb.group({
    reason: [''],
    note: [''],
    amount: [null as number | null],
    items: this.fb.array([] as FormGroup[])
  });

  readonly timelineForm = this.fb.group({
    message: ['', [Validators.required, Validators.maxLength(500)]]
  });

  fulfillmentSaving = false;
  refundSaving = false;
  timelineSaving = false;

  readonly orderPermissions$ = combineLatest({
    update: this.permissions.can$('order:edit'),
    shipment: this.permissions.can$('order:edit')
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
        this.buildItemForms(order);
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
        this.buildItemForms(order);
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
    if (!this.permissions.can('order:edit') || !this.order) {
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

  money(value: number | MoneyAmount | null | undefined, fallbackCurrency?: string): { amount: number; currency: string } {
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

  timelineLabel(entry: OrderTimelineEntry): string {
    const type = (entry?.type || 'event').toLowerCase().replace(/\s+/g, '_');
    return `orders.timelineTypes.${type}`;
  }

  timelineDescription(entry: OrderTimelineEntry): string {
    if (entry?.message) {
      return entry.message;
    }
    const actor = this.timelineActorName(entry?.actor);
    if (actor) {
      return actor;
    }
    return this.i18n.instant('orders.timelineNoDetails');
  }

  private timelineActorName(actor: unknown): string | null {
    if (!actor) {
      return null;
    }
    if (typeof actor === 'string') {
      return actor;
    }
    if (typeof actor === 'object') {
      const anyActor = actor as { name?: string; email?: string; id?: string };
      return anyActor.name || anyActor.email || anyActor.id || null;
    }
    return null;
  }

  private isMoneyAmount(value: unknown): value is MoneyAmount {
    return typeof value === 'object' && value !== null && 'amount' in value && 'currency' in value;
  }

  get fulfillmentItems(): FormArray<FormGroup> {
    return this.fulfillmentForm.get('items') as FormArray<FormGroup>;
  }

  get refundItems(): FormArray<FormGroup> {
    return this.refundForm.get('items') as FormArray<FormGroup>;
  }

  submitFulfillment(): void {
    if (!this.order || this.fulfillmentSaving || !this.canUpdateOrder) {
      return;
    }

    const payload: OrderFulfillmentPayload = {
      carrier: this.fulfillmentForm.value.carrier || undefined,
      trackingNumber: this.fulfillmentForm.value.trackingNumber || undefined,
      note: this.fulfillmentForm.value.note || undefined,
      items: this.fulfillmentItems.controls
        .map((group) => group.value)
        .filter((value) => value.selected && value.itemId)
        .map((value) => ({ itemId: value.itemId, quantity: Number(value.quantity) || 0 }))
        .filter((value) => value.quantity > 0)
    };

    if (!payload.items.length) {
      this.toast.show(this.i18n.instant('orders.fulfillment.selectItems') || 'Select at least one item to fulfill.', 'info');
      return;
    }

    this.fulfillmentSaving = true;
    this.cdr.markForCheck();
    this.orders.fulfillAdminOrder(this.id, payload).subscribe({
      next: (order) => {
        this.fulfillmentSaving = false;
        this.fulfillmentForm.patchValue({ note: '' });
        this.buildItemForms(order);
        this.toast.success(this.t('orders.fulfillment.success', 'Fulfillment recorded.'));
        this.load();
      },
      error: (error) => {
        this.fulfillmentSaving = false;
        this.toast.error(this.resolveError(error, 'orders.fulfillment.error'));
        this.cdr.markForCheck();
      }
    });
  }

  submitRefund(): void {
    if (!this.order || this.refundSaving || !this.canUpdateOrder) {
      return;
    }

    const payload: OrderRefundPayload = {
      reason: this.refundForm.value.reason || undefined,
      note: this.refundForm.value.note || undefined,
      amount: this.refundForm.value.amount ? Number(this.refundForm.value.amount) : undefined,
      items: this.refundItems.controls
        .map((group) => group.value)
        .filter((value) => value.selected && value.itemId)
        .map((value) => ({ itemId: value.itemId, quantity: value.quantity ? Number(value.quantity) : undefined, amount: value.amount ? Number(value.amount) : undefined }))
    };

    if (!payload.items?.length && !payload.amount) {
      this.toast.show(this.i18n.instant('orders.refund.noSelection'), 'info');
      return;
    }

    this.refundSaving = true;
    this.cdr.markForCheck();
    this.orders.refundAdminOrder(this.id, payload).subscribe({
      next: (order) => {
        this.refundSaving = false;
        this.refundForm.reset({ reason: '', note: '', amount: null });
        this.buildItemForms(order);
        this.toast.success(this.t('orders.refund.success', 'Refund issued.'));
        this.load();
      },
      error: (error) => {
        this.refundSaving = false;
        this.toast.error(this.resolveError(error, 'orders.refund.error'));
        this.cdr.markForCheck();
      }
    });
  }

  submitTimelineEntry(): void {
    if (!this.canUpdateOrder || !this.id || this.timelineSaving || this.timelineForm.invalid) {
      this.timelineForm.markAllAsTouched();
      return;
    }

    const payload: OrderTimelinePayload = {
      message: this.timelineForm.value.message || ''
    };

    this.timelineSaving = true;
    this.cdr.markForCheck();
    this.orders.addTimelineEntry(this.id, payload).subscribe({
      next: (entry) => {
        this.timelineSaving = false;
        this.timelineForm.reset({ message: '' });
        this.timeline = [entry, ...this.timeline];
        this.toast.success(this.t('orders.timeline.added', 'Timeline entry added.'));
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.timelineSaving = false;
        this.toast.error(this.resolveError(error, 'orders.timelineError'));
        this.cdr.markForCheck();
      }
    });
  }

  private buildItemForms(order: Order): void {
    const items = Array.isArray(order?.items) ? order.items : [];
    this.fulfillmentItems.clear();
    this.refundItems.clear();

    items.forEach((item) => {
      this.fulfillmentItems.push(
        this.fb.group({
          itemId: [item._id || (item as any).id],
          name: [item.name],
          selected: [false],
          quantity: [item.quantity || 1, [Validators.min(1)]]
        })
      );

      this.refundItems.push(
        this.fb.group({
          itemId: [item._id || (item as any).id],
          name: [item.name],
          selected: [false],
          quantity: [item.quantity || 1, [Validators.min(0)]],
          amount: [null as number | null, [Validators.min(0)]]
        })
      );
    });
    this.cdr.markForCheck();
  }

  private resolveError(error: any, fallbackKey: string): string {
    const code = error?.error?.error?.code;
    if (code) {
      return this.i18n.instant(`errors.backend.${code}`);
    }
    return this.t(fallbackKey, 'Unable to complete the action. Please try again.');
  }

  private t(key: string, fallback: string): string {
    const value = this.i18n.instant(key);
    return value === key ? fallback : value;
  }
}
