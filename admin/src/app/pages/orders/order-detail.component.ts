import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { OrdersService, Order, OrderTimelineEntry } from '../../services/orders.service';
import { TranslateService } from '@ngx-translate/core';

@Component({ selector: 'app-order-detail', templateUrl: './order-detail.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class OrderDetailComponent implements OnInit {
  id = '';
  order: Order | null = null;
  loading = false;
  errorKey: string | null = null;
  timeline: OrderTimelineEntry[] = [];
  tlLoading = false; tlErrorKey: string | null = null;

  constructor(private route: ActivatedRoute, private orders: OrdersService, private cdr: ChangeDetectorRef, private i18n: TranslateService) {}

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
}
