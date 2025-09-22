import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators } from '@angular/forms';
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
}

interface AdjustmentFormValue {
  productSearch: string;
  productId: string;
  variantId: string;
  direction: 'add' | 'remove';
  quantity: number;
  reason: string;
  note: string;
}

@Component({
  selector: 'app-inventory-adjustment-dialog',
  templateUrl: './inventory-adjustment-dialog.component.html',
  styleUrls: ['./inventory-adjustment-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryAdjustmentDialogComponent implements OnInit, OnDestroy {
  form = this.fb.group({
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
    this.productResults$ = this.form.controls.productSearch.valueChanges.pipe(
      startWith(this.data?.productName || ''),
      debounceTime(300),
      distinctUntilChanged(),
      switchMap((term) => this.searchProducts(term || ''))
    );

    if (this.data?.productId) {
      this.form.patchValue({
        productId: this.data.productId,
        productSearch: this.data.productName || '',
        variantId: this.data.variantId || ''
      }, { emitEvent: false });
      this.loadProductById(this.data.productId, this.data.variantId);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  displayProduct(product?: ProductSummary | string | null): string {
    if (!product) {
      return '';
    }
    if (typeof product === 'string') {
      return product;
    }
    return product.name || product._id || '';
  }

  onProductSelected(event: MatAutocompleteSelectedEvent): void {
    const product = event.option.value as ProductSummary;
    this.selectedProduct = product;
    const productId = product?._id || product?.id;
    this.form.patchValue({
      productId: productId || '',
      variantId: '',
      productSearch: product?.name || ''
    }, { emitEvent: false });
    if (productId) {
      this.loadProductById(productId);
    }
  }

  onSubmit(): void {
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
    const qtyChange = raw.direction === 'remove' ? -quantity : quantity;
    const payload = {
      productId: raw.productId,
      variantId: raw.variantId || undefined,
      qtyChange,
      reason: raw.reason || undefined,
      note: raw.note || undefined
    };
    this.saving = true;
    this.cdr.markForCheck();
    this.admin.createInventoryAdjustment(payload).pipe(takeUntil(this.destroy$)).subscribe({
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

  private searchProducts(term: string): Observable<ProductSummary[]> {
    const query = term.trim();
    return this.products.list({ q: query, limit: 10 }).pipe(
      map((res) => res.items || []),
      tap((items) => {
        if (!items.length && !query && this.data?.productId && this.data?.productName) {
          this.selectedProduct = {
            _id: this.data.productId,
            name: this.data.productName,
            sku: this.data.productSku || undefined
          } as ProductSummary;
          this.cdr.markForCheck();
        }
      })
    );
  }

  private loadProductById(id: string, preselectVariant?: string): void {
    this.loadingVariants = true;
    this.cdr.markForCheck();
    this.products.get(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const product = res?.product;
        if (product) {
          this.selectedProduct = product;
          this.variants = (product.variants || []).map((variant) => ({
            id: variant?._id || variant?.sku || '',
            label: [variant?.sku, variant?.attributes ? Object.values(variant.attributes).join(' / ') : null]
              .filter(Boolean)
              .join(' • ')
          }));
          if (preselectVariant) {
            const match = this.variants.find((v) => v.id === preselectVariant);
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
}
