import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, Subject, catchError, debounceTime, finalize, map, of, switchMap, takeUntil } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { ProductDetail, ProductsService, ProductSummary, ProductVariant } from '../../services/products.service';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';

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

interface ProductOption {
  product: ProductSummary;
  label: string;
  secondaryLabel?: string | null;
}

type AdjustmentDirection = 'increase' | 'decrease';

@Component({
  selector: 'app-inventory-adjustment-dialog',
  templateUrl: './inventory-adjustment-dialog.component.html',
  styleUrls: ['./inventory-adjustment-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryAdjustmentDialogComponent implements OnInit, OnDestroy {
  readonly productControl = new FormControl<ProductOption | string | null>(null, Validators.required);

  readonly form = this.fb.group({
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
  variantOptions: { id: string; label: string }[] = [];
  selectedProduct: ProductSummary | null = null;
  loadingProducts = false;
  loadingVariants = false;
  saving = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly dialogRef: MatDialogRef<InventoryAdjustmentDialogComponent, InventoryAdjustmentDialogResult | null>,
    private readonly fb: FormBuilder,
    private readonly products: ProductsService,
    private readonly admin: AdminService,
    @Inject(MAT_DIALOG_DATA) public readonly data: InventoryAdjustmentDialogData,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.productControl.valueChanges
      .pipe(
        debounceTime(250),
        takeUntil(this.destroy$),
        switchMap((value) => this.fetchProductOptions(value))
      )
      .subscribe((options) => {
        this.productOptions = options;
        this.cdr.markForCheck();
      });

    if (this.data?.productId) {
      this.loadInitialProduct(this.data.productId, this.data.variantId || null);
    } else if (this.data?.productName) {
      this.productControl.setValue(this.data.productName);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  displayProductOption(option: ProductOption | string | null): string {
    if (!option) {
      return '';
    }

    if (typeof option === 'string') {
      return option;
    }

    return option.label;
  }

  onProductSelected(event: MatAutocompleteSelectedEvent): void {
    const option = event.option.value as ProductOption | null;
    if (!option) {
      return;
    }

    this.applySelectedProduct(option.product, true, null);
  }

  clearProductSelection(): void {
    this.productControl.setValue(null);
    this.form.patchValue({
      productId: '',
      variantId: ''
    });
    this.selectedProduct = null;
    this.variantOptions = [];
    this.cdr.markForCheck();
  }

  submit(): void {
    if (!this.selectedProduct) {
      this.productControl.markAsTouched();
    }

    if (this.form.invalid || !this.selectedProduct) {
      this.form.markAllAsTouched();
      this.cdr.markForCheck();
      return;
    }

    const raw = this.form.getRawValue();
    const quantity = Math.abs(raw.quantity ?? 0);

    if (!quantity) {
      this.form.controls.quantity.setErrors({ min: true });
      this.cdr.markForCheck();
      return;
    }

    const qtyChange = raw.direction === 'decrease' ? -quantity : quantity;
    const productId = raw.productId ?? '';

    const payload: {
      productId: string;
      variantId?: string;
      qtyChange: number;
      reason?: string;
      note?: string;
      location?: string;
    } = {
      productId,
      qtyChange,
      variantId: raw.variantId ? raw.variantId : undefined,
      reason: raw.reason || undefined,
      note: raw.note?.trim() ? raw.note.trim() : undefined,
      location: raw.location?.trim() ? raw.location.trim() : undefined
    };

    this.saving = true;
    this.cdr.markForCheck();

    this.admin
      .createInventoryAdjustment(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.saving = false;
          this.toast.success(this.translate.instant('inventory.adjustments.toasts.created'));
          this.dialogRef.close({ refresh: true });
        },
        error: () => {
          this.saving = false;
          this.toast.error(this.translate.instant('inventory.errors.adjustmentCreateFailed'));
          this.cdr.markForCheck();
        }
      });
  }

  private mapInitialDirection(direction?: InventoryAdjustmentDialogData['defaultDirection']): AdjustmentDirection {
    if (direction === 'add' || direction === 'increase' || direction === undefined) {
      return 'increase';
    }

    if (direction === 'remove' || direction === 'decrease') {
      return 'decrease';
    }

    return 'increase';
  }

  private fetchProductOptions(value: ProductOption | string | null): Observable<ProductOption[]> {
    if (value && typeof value !== 'string') {
      return of(this.productOptions);
    }

    const query = (value ?? '').toString().trim();
    this.loadingProducts = true;
    this.cdr.markForCheck();

    return this.products.list({ q: query, limit: 10 }).pipe(
      map((response) => (response.items ?? []).map((product) => this.toProductOption(product))),
      catchError(() => of([] as ProductOption[])),
      finalize(() => {
        this.loadingProducts = false;
        this.cdr.markForCheck();
      })
    );
  }

  private applySelectedProduct(product: ProductSummary, updateControl = false, variantId: string | null = null): void {
    this.selectedProduct = product;
    const productId = this.resolveProductId(product);

    if (updateControl) {
      const option = this.toProductOption(product);
      this.productControl.setValue(option, { emitEvent: false });
    }

    this.form.patchValue({
      productId,
      variantId: variantId ?? ''
    });

    this.variantOptions = this.createVariantOptions(product.variants ?? []);
    if (!this.variantOptions.length) {
      this.form.patchValue({ variantId: '' });
    }

    this.cdr.markForCheck();
  }

  private loadInitialProduct(productId: string, variantId: string | null): void {
    this.loadingVariants = true;
    this.cdr.markForCheck();

    this.products
      .get(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: { product: ProductDetail }) => {
          const product = response?.product;
          if (!product) {
            return;
          }

          this.productOptions = [this.toProductOption(product)];
          this.applySelectedProduct(product, true, variantId);
        },
        error: () => {
          this.toast.error(this.translate.instant('inventory.errors.productLoadFailed'));
          if (this.data?.productName) {
            const fallback: ProductSummary = {
              _id: productId,
              name: this.data.productName,
              sku: this.data.productSku || undefined,
              price: 0,
              currency: ''
            } as ProductSummary;
            this.productOptions = [this.toProductOption(fallback)];
            this.applySelectedProduct(fallback, true, variantId);
          }
          this.loadingVariants = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.loadingVariants = false;
          this.cdr.markForCheck();
        }
      });
  }

  private resolveProductId(product: ProductSummary): string {
    const candidate = (product as ProductSummary & { id?: string }).id;
    return product._id || candidate || '';
  }

  private toProductOption(product: ProductSummary): ProductOption {
    const sku = (product as ProductSummary & { sku?: string }).sku ?? (product as ProductSummary & { defaultSku?: string }).defaultSku;
    return {
      product,
      label: product.name || sku || this.resolveProductId(product),
      secondaryLabel: sku || null
    };
  }

  private createVariantOptions(variants: ProductVariant[]): { id: string; label: string }[] {
    return variants
      .map((variant) => {
        const id = variant?._id || variant?.sku || '';
        const attributeLabel = variant?.attributes ? Object.values(variant.attributes).filter(Boolean).join(' • ') : '';
        const parts = [variant?.sku, attributeLabel].filter(Boolean);
        return {
          id,
          label: parts.length ? parts.join(' • ') : this.translate.instant('inventory.adjustDialog.labels.allVariants')
        };
      })
      .filter((variant) => !!variant.id);
  }
}
