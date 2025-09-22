import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';
import { InventoryAdjustmentDialogComponent, InventoryAdjustmentDialogData } from './inventory-adjustment-dialog.component';

type InventoryStatus = 'in-stock' | 'low' | 'out-of-stock';

interface InventoryViewModel {
  id: string;
  productId: string;
  productName: string;
  productSku?: string;
  productImage?: string | null;
  variantId?: string;
  variantName?: string | null;
  variantSku?: string | null;
  stock: number;
  reserved?: number | null;
  reorderPoint?: number | null;
  updatedAt?: string | null;
  status: InventoryStatus;
}

interface InventoryAdjustmentViewModel {
  id: string;
  createdAt?: string | null;
  productName: string;
  variantSku?: string | null;
  qtyChange: number;
  reason?: string | null;
  note?: string | null;
  userName?: string | null;
}

@Component({
  selector: 'app-admin-inventory',
  templateUrl: './inventory-admin.component.html',
  styleUrls: ['./inventory-admin.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminInventoryComponent implements OnInit {
  @ViewChild('adjustmentsSection') adjustmentsSection?: ElementRef<HTMLElement>;

  invFilters = this.fb.group({
    product: [''],
    variant: [''],
    location: [''],
    stockStatus: ['all']
  });
  inv = { items: [] as InventoryViewModel[], total: 0, page: 0, pageSize: 10 };
  invLoading = false;
  invErrorKey: string | null = null;

  invStatusOptions = [
    { value: 'all', labelKey: 'inventory.filters.status.all' },
    { value: 'in-stock', labelKey: 'inventory.filters.status.inStock' },
    { value: 'low', labelKey: 'inventory.filters.status.low' },
    { value: 'out-of-stock', labelKey: 'inventory.filters.status.outOfStock' }
  ];

  adjFilters = this.fb.group({
    product: [''],
    variant: [''],
    reason: ['']
  });
  adj = { items: [] as InventoryAdjustmentViewModel[], total: 0, page: 0, pageSize: 10 };
  adjLoading = false;
  adjErrorKey: string | null = null;

  lowFilters = this.fb.group({ threshold: [10] });
  low = { items: [] as InventoryViewModel[], total: 0, page: 0, pageSize: 10 };
  lowLoading = false;
  lowErrorKey: string | null = null;

  inventoryTabIndex = 0;

  constructor(
    private readonly admin: AdminService,
    private readonly fb: UntypedFormBuilder,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialog: MatDialog,
    private readonly i18n: TranslateService
  ) {}

  ngOnInit(): void {
    this.loadInv();
    this.loadAdj();
    this.loadLow();
  }

  loadInv(): void {
    this.invLoading = true;
    this.invErrorKey = null;
    this.cdr.markForCheck();
    const { product, variant, location, stockStatus } = this.invFilters.value as any;
    const params: Record<string, any> = {
      product,
      variant,
      location,
      page: this.inv.page + 1,
      limit: this.inv.pageSize
    };
    if (stockStatus && stockStatus !== 'all') {
      params.status = stockStatus;
    }

    this.admin.listInventory(params).subscribe({
      next: (res) => {
        const items = (res.items || []) as any[];
        this.inv.items = items.map((item, index) => this.mapInventoryItem(item, index));
        this.inv.total = res.total || items.length;
        this.inv.page = (res.page || 1) - 1;
        this.invLoading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        const code = e?.error?.error?.code;
        this.invErrorKey = code ? `errors.backend.${code}` : 'inventory.errors.overviewFailed';
        this.invLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  pageInv(e: any): void {
    this.inv.pageSize = e.pageSize;
    this.inv.page = e.pageIndex;
    this.loadInv();
  }

  loadAdj(): void {
    this.adjLoading = true;
    this.adjErrorKey = null;
    this.cdr.markForCheck();
    const { product, variant, reason } = this.adjFilters.value as any;
    this.admin.listInventoryAdjustments({
      product,
      variant,
      reason,
      page: this.adj.page + 1,
      limit: this.adj.pageSize
    }).subscribe({
      next: (res) => {
        const items = (res.items || []) as any[];
        this.adj.items = items.map((item, index) => this.mapAdjustment(item, index));
        this.adj.total = res.total || items.length;
        this.adj.page = (res.page || 1) - 1;
        this.adjLoading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        const code = e?.error?.error?.code;
        this.adjErrorKey = code ? `errors.backend.${code}` : 'inventory.errors.adjustmentsFailed';
        this.adjLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  pageAdj(e: any): void {
    this.adj.pageSize = e.pageSize;
    this.adj.page = e.pageIndex;
    this.loadAdj();
  }

  loadLow(): void {
    this.lowLoading = true;
    this.lowErrorKey = null;
    this.cdr.markForCheck();
    const { threshold } = this.lowFilters.value as any;
    this.admin.listLowStock({ threshold, page: this.low.page + 1, limit: this.low.pageSize }).subscribe({
      next: (res) => {
        const items = (res.items || []) as any[];
        this.low.items = items.map((item, index) => this.mapInventoryItem(item, index));
        this.low.total = res.total || items.length;
        this.low.page = (res.page || 1) - 1;
        this.lowLoading = false;
        this.cdr.markForCheck();
      },
      error: (e) => {
        const code = e?.error?.error?.code;
        this.lowErrorKey = code ? `errors.backend.${code}` : 'inventory.errors.lowFailed';
        this.lowLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  pageLow(e: any): void {
    this.low.pageSize = e.pageSize;
    this.low.page = e.pageIndex;
    this.loadLow();
  }

  refreshAll(): void {
    this.loadInv();
    this.loadLow();
  }

  openAdjustmentDialog(context?: InventoryViewModel): void {
    const data: InventoryAdjustmentDialogData = context ? {
      productId: context.productId,
      variantId: context.variantId,
      productName: context.productName,
      productSku: context.productSku || context.variantSku || undefined
    } : {};
    const ref = this.dialog.open(InventoryAdjustmentDialogComponent, {
      width: '560px',
      data
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.refresh) {
        this.loadInv();
        this.loadAdj();
        this.loadLow();
      }
    });
  }

  viewHistory(row: InventoryViewModel): void {
    this.adj.page = 0;
    this.adjFilters.patchValue({
      product: row.productName || row.productId,
      variant: row.variantSku || row.variantId || ''
    }, { emitEvent: false });
    this.loadAdj();
    setTimeout(() => {
      const el = this.adjustmentsSection?.nativeElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 150);
  }

  onInventoryTabChange(index: number): void {
    this.inventoryTabIndex = index;
    if (index === 1 && !this.low.items.length && !this.lowLoading) {
      this.loadLow();
    }
  }

  private mapInventoryItem(raw: any, index: number): InventoryViewModel {
    const productData = raw?.productData || raw?.product || {};
    const variantData = raw?.variantData || raw?.variant || {};
    const productId = raw?.productId || productData?._id || productData?.id || '';
    const variantId = raw?.variantId || variantData?._id || variantData?.id;
    const productName = productData?.name || raw?.productName || raw?.product || this.i18n.instant('inventory.table.unknownProduct');
    const productSku = productData?.sku || raw?.productSku;
    const stock = Number.isFinite(raw?.stock) ? Number(raw.stock) : Number(raw?.quantity ?? 0);
    const reserved = Number.isFinite(raw?.reserved) ? Number(raw.reserved) : null;
    const reorder = raw?.reorderPoint ?? raw?.reorderLevel ?? raw?.threshold ?? null;
    let status: InventoryStatus = 'in-stock';
    if (stock <= 0) {
      status = 'out-of-stock';
    } else if (reorder !== null && reorder !== undefined && stock <= reorder) {
      status = 'low';
    }
    return {
      id: raw?.id || raw?._id || `${productId || index}-${variantId || 'default'}`,
      productId,
      productName,
      productSku: productSku || undefined,
      productImage: productData?.images?.[0]?.url || productData?.imageUrl || raw?.imageUrl || null,
      variantId: variantId || undefined,
      variantName: variantData?.name || raw?.variantName || raw?.variant || null,
      variantSku: variantData?.sku || raw?.variantSku || raw?.sku || null,
      stock,
      reserved,
      reorderPoint: reorder ?? null,
      updatedAt: raw?.updatedAt || raw?.modifiedAt || raw?.time || null,
      status
    };
  }

  private mapAdjustment(raw: any, index: number): InventoryAdjustmentViewModel {
    const product = raw?.productData?.name || raw?.product || raw?.productId || this.i18n.instant('inventory.table.unknownProduct');
    const variantSku = raw?.variantData?.sku || raw?.variantSku || raw?.variantId || null;
    const userName = typeof raw?.user === 'string' ? raw.user : raw?.user?.name || raw?.user?.email || null;
    return {
      id: raw?._id || raw?.id || `${product}-${index}`,
      createdAt: raw?.createdAt || raw?.time || null,
      productName: product,
      variantSku: variantSku || undefined,
      qtyChange: raw?.qtyChange ?? 0,
      reason: raw?.reason || null,
      note: raw?.note || null,
      userName
    };
  }
}
