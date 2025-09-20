import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrdersService, Order, OrderTimelineEntry, OrderItem } from '../../services/orders.service';
import { MoneyAmount } from '../../services/api.types';

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

  constructor(private route: ActivatedRoute, private orders: OrdersService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  load() {
    this.loading = true; this.errorKey = null; this.cdr.markForCheck();
    this.orders.get(this.id).subscribe({
      next: ({ order }) => { this.order = order; this.loading = false; this.cdr.markForCheck(); },
      error: (err) => { const code = err?.error?.error?.code; this.errorKey = code ? `errors.backend.${code}` : 'orders.detail.errors.loadFailed'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  openInvoice() { if (this.id) window.open(`/api/orders/${this.id}/invoice`, '_blank'); }
  loadTimeline() {
    if (!this.id) return;
    this.tlLoading = true; this.tlErrorKey = null; this.cdr.markForCheck();
    this.orders.timeline(this.id, { page: 1, limit: 50 }).subscribe({
      next: (res) => { this.timeline = res.items || []; this.tlLoading = false; this.cdr.markForCheck(); },
      error: (e) => { const code = e?.error?.error?.code; this.tlErrorKey = code ? `errors.backend.${code}` : 'orders.detail.errors.timelineFailed'; this.tlLoading = false; this.cdr.markForCheck(); }
    });
  }

  statusKey(status?: string | null, context: 'order' | 'payment' = 'order'): string {
    if (!status) {
      return context === 'payment' ? 'orders.detail.status.unknownPayment' : 'orders.detail.status.unknown';
    }

    const normalized = status.toLowerCase().replace(/\s+/g, '_');
    return `orders.detail.status.${context}.${normalized}`;
  }

  statusColor(status?: string | null): 'primary' | 'warn' | 'accent' {
    const normalized = (status || '').toLowerCase();
    if (['completed', 'paid', 'delivered', 'fulfilled', 'confirmed'].includes(normalized)) {
      return 'primary';
    }
    if (['pending', 'processing', 'shipped', 'refunded'].includes(normalized)) {
      return 'accent';
    }
    return 'warn';
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
    if (!order?.user || typeof order.user === 'string') {
      return null;
    }

    return order.user.email || null;
  }

  timelineTypeKey(entry: OrderTimelineEntry): string {
    const type = (entry?.type || 'unknown').replace(/\s+/g, '_').toLowerCase();
    return `orders.detail.timeline.types.${type}`;
  }

  private isMoneyAmount(value: unknown): value is MoneyAmount {
    return typeof value === 'object' && value !== null && 'amount' in value && 'currency' in value;
  }
}
