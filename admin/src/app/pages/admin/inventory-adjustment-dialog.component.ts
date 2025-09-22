import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormControl, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, Subject, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, tap } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';
import { ProductsService, ProductSummary } from '../../services/products.service';
import { ToastService } from '../../core/toast.service';

export interface InventoryAdjustmentDialogData {
  productId?: string;
  productName?: string;
  productSku?: string;
  variantId?: string;
  defaultDirection?: 'increase' | 'decrease' | 'add' | 'remove';
  defaultQuantity?: number;
  defaultReason?: string;
  defaultNote?: string;
  defaultLocation?: string;
}

export interface InventoryAdjustmentDialogResult {
  refresh?: boolean;
}

interface AdjustmentFormValue {
  productSearch: string;
  productId: string;
  variantId: string;
  direction: 'increase' | 'decrease';
  quantity: number;
  reason: string;
  note: string;
  location: string;
}

interface ProductOption {
  product: ProductSummary;
  label: string;
  secondaryLabel?: string | null;
}

interface VariantOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-inventory-adjustment-dialog',
  templateUrl: './inventory-adjustment-dialog.component.html',
  styleUrls: ['./inventory-adjustment-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryAdjustmentDialogComponent implements OnInit, OnDestroy {
  readonly form = this.fb.group({
    productSearch: [''],
    productId: ['', Validators.required],
    variantId: [''],
    direction: [this.mapInitialDirection(this.data?.defaultDirection) ?? 'increase', Validators.required],
    quantity: [this.data?.defaultQuantity ?? 1, [Validators.required, Validators.min(1)]],
    reason: [this.data?.defaultReason ?? 'manual'],
    note: [this.data?.defaultNote ?? '', Validators.maxLength(240)],
    location: [this.data?.defaultLocation ?? '', Validators.maxLength(120)]
  });

  readonly reasons = [
    { value: 'manual', labelKey: 'inventory.adjustments.reasons.manual' },
    { value: 'restock', labelKey: 'inventory.adjustments.reasons.restock' },
    { value: 'damage', labelKey: 'inventory.adjustments.reasons.damage' },
    { value: 'correction', labelKey: 'inventory.adjustments.reasons.correction' },
    { value: 'other', labelKey: 'inventory.adjustments.reasons.other' }
  ];

  productOptions: ProductOption[] = [];
  variantOptions: VariantOption[] = [];
  selectedProduct: ProductSummary | null = null;
  loadingProducts = false;
  loadingVariants = false;
  saving = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly dialogRef: MatDialogRef<InventoryAdjustmentDialogComponent, InventoryAdjustmentDialogResult | null>,
    private readonly fb: UntypedFormBuilder,
    private readonly products: ProductsService,
    private readonly admin: AdminService,
    @Inject(MAT_DIALOG_DATA) public readonly data: InventoryAdjustmentDialogData,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  get productControl(): UntypedFormControl {
    return this.form.controls.productSearch as UntypedFormControl;
  }

  ngOnInit(): void {
    this.productControl.valueChanges
      .pipe(
        startWith(this.data?.productName || ''),
        debounceTime(300),
        distinctUntilChanged(),
        map((value) => (typeof value === 'string' ? value : value?.label || '')),
        tap(() => {
          this.loadingProducts = true;
          this.cdr.markForCheck();
        }),
        switchMap((term) => this.searchProducts(term)),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (options) => {
          this.productOptions = options;
          this.loadingProducts = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.productOptions = [];
          this.loadingProducts = false;
          this.cdr.markForCheck();
        }
      });

    if (this.data?.productId) {
      this.form.patchValue(
        {
          productId: this.data.productId,
          productSearch: this.data.productName || '',
          variantId: this.data.variantId || ''
        },
        { emitEvent: false }
      );
      this.loadProductById(this.data.productId, this.data.variantId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  displayProductOption(option?: ProductOption | string | null): string {
    if (!option) {
      return '';
    }
    if (typeof option === 'string') {
      return option;
    }
    return option.label;
  }

  clearProductSelection(): void {
    this.selectedProduct = null;
    this.variantOptions = [];
    this.form.patchValue(
      {
        productId: '',
        variantId: '',
        productSearch: ''
      },
      { emitEvent: false }
    );
    this.productControl.setValue('', { emitEvent: true });
  }

  onProductSelected(event: MatAutocompleteSelectedEvent): void {
    const option = event.option.value as ProductOption | null;
    const product = option?.product;
    if (!product) {
      return;
    }
    this.selectedProduct = product;
    this.variantOptions = [];
    this.form.patchValue(
      {
        productId: product._id || '',
        variantId: '',
        productSearch: product.name || ''
      },
      { emitEvent: false }
    );
    this.productControl.setValue(product.name || '', { emitEvent: false });
    if (product._id) {
      this.loadProductById(product._id);
    }
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue() as AdjustmentFormValue;
    const quantity = Math.abs(raw.quantity || 0);
    if (!quantity) {
      this.form.controls.quantity.setErrors({ min: true });
      return;
    }
    const qtyChange = raw.direction === 'decrease' ? -quantity : quantity;
    const payload = {
      productId: raw.productId,
      variantId: raw.variantId || undefined,
      qtyChange,
      reason: raw.reason || undefined,
      note: raw.note || undefined,
      location: raw.location || undefined
    };
    this.saving = true;
    this.cdr.markForCheck();
    this.admin
      .createInventoryAdjustment(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.toast.success(this.i18n.instant('inventory.adjustments.toasts.created'));
          this.dialogRef.close({ refresh: true });
        },
        error: () => {
          this.saving = false;
          this.toast.error(this.i18n.instant('inventory.errors.adjustmentCreateFailed'));
          this.cdr.markForCheck();
        }
      });
  }

  private searchProducts(term: string): Observable<ProductOption[]> {
    const query = term.trim();
    return this.products
      .list({ q: query, limit: 10 })
      .pipe(map((res) => (res.items || []).map((product) => this.toProductOption(product))));
  }

  private toProductOption(product: ProductSummary): ProductOption {
    const sku = (product as any)?.sku ?? product.variants?.find((variant) => variant?.sku)?.sku ?? null;
    return {
      product,
      label: product.name || product._id,
      secondaryLabel: sku
    };
  }

  private loadProductById(id: string, preselectVariant?: string): void {
    this.loadingVariants = true;
    this.cdr.markForCheck();
    this.products
      .get(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const product = res?.product;
          if (product) {
            this.selectedProduct = product;
            this.form.patchValue(
              {
                productId: product._id || '',
                productSearch: product.name || ''
              },
              { emitEvent: false }
            );
            this.productControl.setValue(product.name || '', { emitEvent: false });
            this.variantOptions = (product.variants || []).map((variant) => {
              const variantId = variant?._id || (variant as any)?.id || variant?.sku || '';
              const attributes = variant?.attributes ? Object.values(variant.attributes).filter(Boolean).join(' / ') : null;
              const labelParts = [variant?.sku || null, attributes];
              const label = labelParts.filter(Boolean).join(' • ') || variantId;
              return {
                id: variantId,
                label
              };
            });
            if (preselectVariant) {
              const match = this.variantOptions.find((variant) => variant.id === preselectVariant);
              if (match) {
                this.form.patchValue({ variantId: match.id }, { emitEvent: false });
              }
            }
          }
          this.loadingVariants = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingVariants = false;
          this.toast.error(this.i18n.instant('inventory.errors.productLoadFailed'));
          this.cdr.markForCheck();
        }
      });
  }

  private mapInitialDirection(direction?: string | null): 'increase' | 'decrease' | null {
    if (!direction) {
      return null;
    }
    if (direction === 'increase' || direction === 'decrease') {
      return direction;
    }
    if (direction === 'add') {
      return 'increase';
    }
    if (direction === 'remove') {
      return 'decrease';
    }
    return null;
  }
}
