import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
import { UntypedFormBuilder, Validators } from '@angular/forms';
=======
import { FormBuilder, FormControl, Validators } from '@angular/forms';
>>>>>>> theirs
=======
import { UntypedFormBuilder, Validators } from '@angular/forms';
>>>>>>> theirs
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Observable, Subject, debounceTime, distinctUntilChanged, map, startWith, switchMap, takeUntil, tap } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { ProductsService, ProductSummary } from '../../services/products.service';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';
=======
=======
>>>>>>> theirs
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subject, of, switchMap, takeUntil, tap, catchError, finalize, debounceTime } from 'rxjs';

import { ProductDetail, ProductService, ProductSummary, ProductVariant } from '../../services/products.service';
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs

export interface InventoryAdjustmentDialogData {
  productId?: string;
  productName?: string;
  productSku?: string;
  variantId?: string;
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
}

interface AdjustmentFormValue {
  productSearch: string;
  productId: string;
  variantId: string;
  direction: 'add' | 'remove';
  quantity: number;
  reason: string;
  note: string;
=======
=======
>>>>>>> theirs
  defaultDirection?: 'increase' | 'decrease';
  defaultReason?: string;
  defaultQuantity?: number;
=======
  defaultDirection?: 'increase' | 'decrease' | 'add' | 'remove';
  defaultQuantity?: number;
  defaultReason?: string;
>>>>>>> theirs
  defaultNote?: string;
  defaultLocation?: string;
}

export interface InventoryAdjustmentDialogResult {
  productId: string;
  variantId?: string;
  qtyChange: number;
  reason?: string;
  note?: string;
  location?: string;
}

interface ProductOption {
  id: string;
  label: string;
  product: ProductSummary;
  subtitle?: string;
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
}

interface AdjustmentFormValue {
  productSearch: string;
  productId: string;
  variantId: string;
  direction: 'add' | 'remove';
  quantity: number;
  reason: string;
  note: string;
>>>>>>> theirs
}

export interface InventoryAdjustmentDialogResult {
  refresh?: boolean;
}

@Component({
  selector: 'app-inventory-adjustment-dialog',
  templateUrl: './inventory-adjustment-dialog.component.html',
  styleUrls: ['./inventory-adjustment-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryAdjustmentDialogComponent implements OnInit, OnDestroy {
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
  form = this.fb.group({
    productSearch: [''],
=======
  readonly productControl = new FormControl<ProductOption | string | null>(null, Validators.required);

  readonly form = this.fb.group({
>>>>>>> theirs
=======
  form = this.fb.group({
    productSearch: [''],
>>>>>>> theirs
    productId: ['', Validators.required],
    variantId: [''],
    direction: ['add' as 'add' | 'remove'],
    quantity: [1, [Validators.required, Validators.min(1)]],
    reason: ['manual'],
    note: ['']
  });

  reasons = [
    { value: 'manual', labelKey: 'inventory.adjustments.reasons.manual' },
    { value: 'restock', labelKey: 'inventory.adjustments.reasons.restock' },
    { value: 'damage', labelKey: 'inventory.adjustments.reasons.damage' },
    { value: 'correction', labelKey: 'inventory.adjustments.reasons.correction' },
    { value: 'other', labelKey: 'inventory.adjustments.reasons.other' }
  ];

  productResults$!: Observable<ProductSummary[]>;
  selectedProduct?: ProductSummary;
  variants: { id: string; label: string }[] = [];
  loadingVariants = false;
  saving = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly admin: AdminService,
    private readonly products: ProductsService,
    private readonly dialogRef: MatDialogRef<InventoryAdjustmentDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: InventoryAdjustmentDialogData,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
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
<<<<<<< ours
<<<<<<< ours
=======
>>>>>>> theirs
      this.form.patchValue({
        productId: this.data.productId,
        productSearch: this.data.productName || '',
        variantId: this.data.variantId || ''
      }, { emitEvent: false });
      this.loadProductById(this.data.productId, this.data.variantId);
<<<<<<< ours
=======
=======
>>>>>>> theirs
  readonly productControl = new FormControl<ProductOption | string | null>(null, { validators: Validators.required });

  readonly form = this.fb.group({
    product: this.productControl,
    variantId: [''],
    direction: [this.data?.defaultDirection ?? 'increase', Validators.required],
    quantity: [this.data?.defaultQuantity ?? 1, [Validators.required, Validators.min(1)]],
    reason: [this.data?.defaultReason ?? '', Validators.maxLength(120)],
    note: [this.data?.defaultNote ?? '', Validators.maxLength(240)],
    location: [this.data?.defaultLocation ?? '', Validators.maxLength(120)]
  });

  productOptions: ProductOption[] = [];
  variantOptions: ProductVariant[] = [];
  selectedProduct: ProductSummary | null = null;

  loadingProducts = false;
  private readonly destroy$ = new Subject<void>();
  private readonly search$ = new Subject<string>();

  constructor(
    private readonly dialogRef: MatDialogRef<InventoryAdjustmentDialogComponent, InventoryAdjustmentDialogResult | null>,
    private readonly fb: FormBuilder,
    private readonly productService: ProductService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public readonly data: InventoryAdjustmentDialogData
  ) {}

  ngOnInit(): void {
    this.productControl.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
      if (!value) {
        this.selectedProduct = null;
        this.variantOptions = [];
        this.form.get('variantId')?.reset('');
        this.cdr.markForCheck();
        return;
      }

      if (typeof value === 'string') {
        this.search$.next(value);
        return;
      }

      if (value && value.product) {
        this.applySelectedProduct(value.product, false);
      }
    });

    this.search$
      .pipe(
        debounceTime(250),
        takeUntil(this.destroy$),
        switchMap((term) => this.performSearch(term))
      )
      .subscribe();

    if (this.data?.productId) {
      this.loadInitialProduct(this.data.productId);
    } else if (this.data?.productName) {
      this.productControl.setValue(this.data.productName, { emitEvent: false });
    }

    if (this.data?.variantId) {
      this.form.patchValue({ variantId: this.data.variantId });
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
      this.loadInitialProduct(this.data.productId, this.data.variantId || null);
    } else if (this.data?.productName) {
      this.productControl.setValue(this.data.productName);
>>>>>>> theirs
=======
>>>>>>> theirs
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
<<<<<<< ours
<<<<<<< ours
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
<<<<<<< ours
<<<<<<< ours
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
=======
    const option = event.option.value as ProductOption | null;
    if (!option) {
      return;
>>>>>>> theirs
    }

    this.applySelectedProduct(option.product, true, null);
  }

  clearProductSelection(): void {
    this.productControl.setValue(null);
=======
    const product = event.option.value as ProductSummary;
    this.selectedProduct = product;
    const productWithId = product as ProductSummary & { id?: string };
    const productId = productWithId?._id || productWithId?.id;
>>>>>>> theirs
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
<<<<<<< ours

<<<<<<< ours
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
=======
=======
>>>>>>> theirs
    this.search$.complete();
  }

  displayProductOption = (option: ProductOption | string | null): string => {
    if (!option) {
      return '';
    }

    if (typeof option === 'string') {
      return option;
    }

    return option.label;
  };

  onProductSelected(event: MatAutocompleteSelectedEvent): void {
    const option = event.option.value as ProductOption | null;
    if (!option) {
      return;
    }
    this.applySelectedProduct(option.product, true);
  }

  clearProductSelection(): void {
    this.productControl.setValue(null);
    this.selectedProduct = null;
    this.variantOptions = [];
    this.productOptions = [];
    this.form.get('variantId')?.reset('');
    this.cdr.markForCheck();
  }

  submit(): void {
    if (this.form.invalid || !this.selectedProduct) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const productId = this.resolveProductId(this.selectedProduct);
    if (!productId) {
      this.form.get('product')?.setErrors({ required: true });
      return;
    }

    const qty = Math.abs(Number(raw.quantity || 0));
    if (!qty) {
      this.form.get('quantity')?.setErrors({ min: true });
      return;
    }

    const qtyChange = raw.direction === 'decrease' ? -qty : qty;

    const result: InventoryAdjustmentDialogResult = {
      productId,
      variantId: raw.variantId ? String(raw.variantId) : undefined,
      qtyChange,
      reason: raw.reason ? String(raw.reason).trim() : undefined,
      note: raw.note ? String(raw.note).trim() : undefined,
      location: raw.location ? String(raw.location).trim() : undefined
    };

    this.dialogRef.close(result);
  }

  cancel(): void {
    this.dialogRef.close(null);
  }

  private performSearch(term: string) {
    const query = term.trim();
    if (!query) {
      this.productOptions = this.selectedProduct ? [this.buildOption(this.selectedProduct)] : [];
      this.cdr.markForCheck();
      return of(null);
    }

    if (query.length < 2) {
      this.productOptions = [];
      this.cdr.markForCheck();
      return of(null);
    }

    this.loadingProducts = true;
    this.cdr.markForCheck();
    return this.productService.list({ q: query, limit: 10 }).pipe(
      tap((res) => {
        this.productOptions = (res?.items || []).map((item) => this.buildOption(item));
      }),
      catchError(() => {
        this.productOptions = [];
        return of(null);
      }),
      finalize(() => {
        this.loadingProducts = false;
        this.cdr.markForCheck();
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
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
=======
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
>>>>>>> theirs
  }

  private searchProducts(term: string): Observable<ProductSummary[]> {
    const query = term.trim();
    return this.products.list({ q: query, limit: 10 }).pipe(
<<<<<<< ours
      map((response) => (response.items ?? []).map((product) => this.toProductOption(product))),
      catchError(() => of([] as ProductOption[])),
      finalize(() => {
        this.loadingProducts = false;
        this.cdr.markForCheck();
>>>>>>> theirs
=======
      map((res) => res.items || []),
      tap((items) => {
        if (!items.length && !query && this.data?.productId && this.data?.productName) {
          this.selectedProduct = {
            _id: this.data.productId,
            name: this.data.productName,
            sku: this.data.productSku || undefined,
            price: 0,
            currency: ''
          } as unknown as ProductSummary;
          this.cdr.markForCheck();
        }
>>>>>>> theirs
      })
    );
  }

<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
<<<<<<< ours
  private loadProductById(id: string, preselectVariant?: string): void {
=======
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
>>>>>>> theirs
=======
  private loadProductById(id: string, preselectVariant?: string): void {
>>>>>>> theirs
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
<<<<<<< ours
<<<<<<< ours
=======
>>>>>>> theirs
        this.loadingVariants = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadingVariants = false;
        this.toast.error(this.i18n.instant('inventory.errors.productLoadFailed'));
        this.cdr.markForCheck();
      }
    });
<<<<<<< ours
=======
=======
>>>>>>> theirs
  private loadInitialProduct(productId: string): void {
    this.loadingProducts = true;
    this.cdr.markForCheck();
    this.productService
      .get(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: { product: ProductDetail }) => {
          if (res?.product) {
            this.applySelectedProduct(res.product, true);
          }
          this.loadingProducts = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loadingProducts = false;
          this.cdr.markForCheck();
        }
      });
  }

  private applySelectedProduct(product: ProductSummary, updateControl: boolean): void {
    const option = this.buildOption(product);
    this.selectedProduct = product;
    this.variantOptions = Array.isArray(product.variants)
      ? product.variants.filter((variant): variant is ProductVariant => !!variant)
      : [];
    this.productOptions = this.mergeOptions(option, this.productOptions);
    if (updateControl) {
      this.productControl.setValue(option, { emitEvent: false });
    }
    const variantControl = this.form.get('variantId');
    if (!this.variantOptions.length) {
      variantControl?.setValue('', { emitEvent: false });
    } else {
      const currentValue = variantControl?.value ? String(variantControl.value) : '';
      const currentExists = this.variantOptions.some((variant) => this.resolveVariantId(variant) === currentValue);
      if (!currentExists) {
        const preferred = this.data?.variantId;
        const preferredExists = preferred
          ? this.variantOptions.some((variant) => this.resolveVariantId(variant) === preferred)
          : false;
        variantControl?.setValue(preferredExists && preferred ? preferred : '', { emitEvent: false });
      }
    }
    this.cdr.markForCheck();
  }

  private buildOption(product: ProductSummary): ProductOption {
    const id = this.resolveProductId(product);
    const sku = this.extractProductSku(product);
    const labelParts = [product.name];
    if (sku) {
      labelParts.push(sku);
    }
    return {
      id,
      label: labelParts.join(' · '),
      product,
      subtitle: sku || undefined
    };
  }

  private mergeOptions(option: ProductOption, existing: ProductOption[]): ProductOption[] {
    const filtered = existing.filter((item) => item.id !== option.id);
    return [option, ...filtered];
  }

  private resolveProductId(product: ProductSummary): string {
    return product?._id || (product as ProductSummary & { id?: string })?.id || '';
  }

  private resolveVariantId(variant: ProductVariant | null | undefined): string {
    if (!variant) {
      return '';
    }
    return variant._id || (variant as ProductVariant & { id?: string }).id || '';
  }

  private extractProductSku(product: ProductSummary): string | undefined {
    const summaryWithSku = product as ProductSummary & { sku?: string | null };
    if (summaryWithSku.sku) {
      return String(summaryWithSku.sku);
    }
    if (Array.isArray(product.variants)) {
      const variantWithSku = product.variants.find((variant) => !!variant?.sku);
      if (variantWithSku?.sku) {
        return String(variantWithSku.sku);
      }
    }
    return undefined;
<<<<<<< ours
>>>>>>> theirs
=======
>>>>>>> theirs
=======
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
>>>>>>> theirs
=======
>>>>>>> theirs
  }
}
