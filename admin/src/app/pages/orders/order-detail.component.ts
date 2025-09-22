import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrdersService, Order, OrderTimelineEntry, OrderItem, OrderAddress } from '../../services/orders.service';
import { MoneyAmount } from '../../services/api.types';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-order-detail',
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDetailComponent implements OnInit {
  id = '';
  order: Order | null = null;
  loading = false;
  errorKey: string | null = null;
  timeline: OrderTimelineEntry[] = [];
  tlLoading = false; tlErrorKey: string | null = null;
  lastError: any = null;
  requestingReturn = false;

  private readonly statusTone: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'neutral'> = {
    pending: 'warning',
    processing: 'warning',
    confirmed: 'info',
    paid: 'success',
    fulfilled: 'success',
    completed: 'success',
    shipped: 'info',
    delivered: 'success',
    refunded: 'info',
    cancelled: 'danger',
    failed: 'danger'
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly orders: OrdersService,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load() {
    this.loading = true; this.errorKey = null; this.lastError = null; this.cdr.markForCheck();
    this.orders.get(this.id).subscribe({
      next: ({ order }) => {
        this.order = order;
        this.loading = false;
        this.cdr.markForCheck();
        this.loadTimeline();
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'orders.errorLoad';
        this.lastError = err;
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  openInvoice() { if (this.id) window.open(`/api/orders/${this.id}/invoice`, '_blank'); }
  loadTimeline() {
    if (!this.id) return;
    this.tlLoading = true; this.tlErrorKey = null; this.cdr.markForCheck();
    this.orders.timeline(this.id, { page: 1, limit: 50 }).subscribe({
      next: (res) => { this.timeline = res.items || []; this.tlLoading = false; this.cdr.markForCheck(); },
      error: (e) => { const code = e?.error?.error?.code; this.tlErrorKey = code ? `errors.backend.${code}` : 'orders.errorTimeline'; this.tlLoading = false; this.cdr.markForCheck(); }
    });
  }

  money(value: number | MoneyAmount | null | undefined, fallbackCurrency: string): { amount: number; currency: string } {
    if (this.isMoneyAmount(value)) {
      return { amount: value.amount ?? 0, currency: value.currency || fallbackCurrency };
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
      return { amount: value, currency: fallbackCurrency };
    }

    return { amount: 0, currency: fallbackCurrency };
  }

  badgeClass(value: string | null | undefined): string {
    const tone = this.statusTone[(value || '').toLowerCase()] || 'neutral';
    return `badge badge--${tone}`;
  }

  itemPrice(item: OrderItem, fallbackCurrency: string): { amount: number; currency: string } {
    const base = this.money(item.price, item.currency || fallbackCurrency);
    return base;
  }

  itemLineTotal(item: OrderItem, fallbackCurrency: string): { amount: number; currency: string } {
    const price = this.itemPrice(item, fallbackCurrency);
    return { amount: price.amount * (item.quantity ?? 0), currency: price.currency };
  }

  customerName(order: Order | null): string | null {
    if (!order?.user) {
      return null;
    }

    if (typeof order.user === 'string') {
      return order.user;
    }

    return order.user.name || order.user.email || order.user._id || null;
  }

  customerEmail(order: Order | null): string | null {
    if (!order) {
      return null;
    }
    if (order.customer?.email) {
      return order.customer.email;
    }
    if (!order.user || typeof order.user === 'string') {
      return null;
    }

    return order.user.email || null;
  }

  timelineTypeKey(entry: OrderTimelineEntry): string {
    const type = (entry?.type || 'unknown').replace(/\s+/g, '_').toLowerCase();
    return `orders.timelineTypes.${type}`;
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

  requestReturn(): void {
    if (!this.id || this.requestingReturn) {
      return;
    }

    this.requestingReturn = true;
    this.cdr.markForCheck();

    this.orders.requestReturn(this.id).subscribe({
      next: () => {
        this.requestingReturn = false;
        this.toast.success(this.translate.instant('orders.returnRequested'));
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.requestingReturn = false;
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'orders.errorLoad';
        this.toast.error(this.translate.instant('orders.errorLoad'));
        this.cdr.markForCheck();
      }
    });
  }

  statusKey(status?: string | null): string {
    return status ? `orders.status.${status.toLowerCase()}` : 'orders.status.unknown';
  }

  paymentKey(status?: string | null): string {
    return status ? `orders.payment.${status.toLowerCase()}` : 'orders.payment.unknown';
  }

  timelineDescription(entry: OrderTimelineEntry): string {
    if (entry?.message) {
      return entry.message;
    }
    if (entry?.actor?.name) {
      return entry.actor.name;
    }
    return this.translate.instant('orders.timelineNoDetails');
  }

  private isMoneyAmount(value: unknown): value is MoneyAmount {
    return typeof value === 'object' && value !== null && 'amount' in value && 'currency' in value;
  }
}
