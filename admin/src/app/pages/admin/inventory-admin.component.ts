import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-inventory',
  templateUrl: './inventory-admin.component.html',
  styleUrls: ['./inventory-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminInventoryComponent implements OnInit {
  // Overview
  invFilters = this.fb.group({ product: [''], variant: [''], location: [''] });
  inv = { items: [] as any[], total: 0, page: 0, pageSize: 10 };
  invLoading = false; invErrorKey: string | null = null;

  // Adjustments
  adjFilters = this.fb.group({ product: [''], variant: [''], reason: [''] });
  adj = { items: [] as any[], total: 0, page: 0, pageSize: 10 };
  adjLoading = false; adjErrorKey: string | null = null;

  // Create adjustment
  adjForm = this.fb.group({ productId: [''], variantId: [''], qtyChange: [0], reason: [''], note: [''] });
  adjSaving = false;

  // Low stock
  lowFilters = this.fb.group({ threshold: [10] });
  low = { items: [] as any[], total: 0, page: 0, pageSize: 10 };
  lowLoading = false; lowErrorKey: string | null = null;

  constructor(private readonly admin: AdminService, private readonly fb: UntypedFormBuilder, private readonly cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.loadInv();
    this.loadAdj();
    this.loadLow();
  }

  loadInv(): void {
    this.invLoading = true; this.invErrorKey = null; this.cdr.markForCheck();
    const { product, variant, location } = this.invFilters.value as any;
    this.admin.listInventory({ product, variant, location, page: this.inv.page + 1, limit: this.inv.pageSize }).subscribe({
      next: (res) => { this.inv.items = res.items || []; this.inv.total = res.total || 0; this.inv.page = (res.page || 1) - 1; this.invLoading = false; this.cdr.markForCheck(); },
      error: (e) => { const code = e?.error?.error?.code; this.invErrorKey = code ? `errors.backend.${code}` : 'inventory.errors.overviewFailed'; this.invLoading = false; this.cdr.markForCheck(); }
    });
  }

  loadAdj(): void {
    this.adjLoading = true; this.adjErrorKey = null; this.cdr.markForCheck();
    const { product, variant, reason } = this.adjFilters.value as any;
    this.admin.listInventoryAdjustments({ product, variant, reason, page: this.adj.page + 1, limit: this.adj.pageSize }).subscribe({
      next: (res) => { this.adj.items = res.items || []; this.adj.total = res.total || 0; this.adj.page = (res.page || 1) - 1; this.adjLoading = false; this.cdr.markForCheck(); },
      error: (e) => { const code = e?.error?.error?.code; this.adjErrorKey = code ? `errors.backend.${code}` : 'inventory.errors.adjustmentsFailed'; this.adjLoading = false; this.cdr.markForCheck(); }
    });
  }

  pageInv(e: any) { this.inv.pageSize = e.pageSize; this.inv.page = e.pageIndex; this.loadInv(); }
  pageAdj(e: any) { this.adj.pageSize = e.pageSize; this.adj.page = e.pageIndex; this.loadAdj(); }

  loadLow(): void {
    this.lowLoading = true; this.lowErrorKey = null; this.cdr.markForCheck();
    const { threshold } = this.lowFilters.value as any;
    this.admin.listLowStock({ threshold, page: this.low.page + 1, limit: this.low.pageSize }).subscribe({
      next: (res) => { this.low.items = res.items || []; this.low.total = res.total || 0; this.low.page = (res.page || 1) - 1; this.lowLoading = false; this.cdr.markForCheck(); },
      error: (e) => { const code = e?.error?.error?.code; this.lowErrorKey = code ? `errors.backend.${code}` : 'inventory.errors.overviewFailed'; this.lowLoading = false; this.cdr.markForCheck(); }
    });
  }

  pageLow(e: any) { this.low.pageSize = e.pageSize; this.low.page = e.pageIndex; this.loadLow(); }

  saveAdjustment(): void {
    const payload = this.adjForm.getRawValue() as any;
    if (!payload.productId || !payload.qtyChange) return;
    this.adjSaving = true; this.cdr.markForCheck();
    this.admin.createInventoryAdjustment(payload).subscribe({
      next: () => { this.adjSaving = false; this.adjForm.reset({ productId: '', variantId: '', qtyChange: 0, reason: '', note: '' }); this.loadAdj(); this.loadInv(); this.cdr.markForCheck(); },
      error: () => { this.adjSaving = false; this.adjErrorKey = 'inventory.errors.adjustmentCreateFailed'; this.cdr.markForCheck(); }
    });
  }
}
