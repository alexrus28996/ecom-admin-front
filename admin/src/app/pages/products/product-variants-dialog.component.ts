import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { ProductsService, ProductDetail, ProductVariant, ProductAttribute } from '../../services/products.service';
import { ToastService } from '../../core/toast.service';
import { PermissionsService } from '../../core/permissions.service';

type BackendError = unknown;

interface ProductVariantsDialogData {
  id: string;
}

@Component({
  selector: 'app-product-variants-dialog',
  templateUrl: './product-variants-dialog.component.html',
  styleUrls: ['./product-variants-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductVariantsDialogComponent implements OnInit, OnDestroy {
  readonly form: UntypedFormGroup = this.fb.group({
    variants: this.fb.array([])
  });

  loading = false;
  saving = false;
  errorKey: string | null = null;
  lastError: BackendError = null;
  productName = '';
  canEditVariants = true;
  private productCurrency = 'USD';

  readonly canManageVariants$ = this.permissions.can$('products.manageVariants');
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly dialogRef: MatDialogRef<ProductVariantsDialogComponent>,
    private readonly products: ProductsService,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) private readonly data: ProductVariantsDialogData,
    private readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.observePermissions();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private observePermissions(): void {
    this.canManageVariants$
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((canManage) => {
        this.canEditVariants = !!canManage;
        if (this.canEditVariants) {
          this.form.enable({ emitEvent: false });
        } else {
          this.form.disable({ emitEvent: false });
        }
        this.cdr.markForCheck();
      });
  }

  get variants(): UntypedFormArray {
    return this.form.get('variants') as UntypedFormArray;
  }

  get summary() {
    const variants = this.variants.controls;
    let totalStock = 0;
    let active = 0;
    variants.forEach((ctrl) => {
      const stock = Number(ctrl.get('stock')?.value);
      if (!Number.isNaN(stock)) {
        totalStock += stock;
      }
      if (ctrl.get('isActive')?.value) {
        active += 1;
      }
    });
    return {
      total: variants.length,
      active,
      stock: totalStock
    };
  }

  addVariant(variant?: ProductVariant, bypass = false): void {
    if (!bypass && !this.canEditVariants) {
      return;
    }
    this.variants.push(this.createVariantGroup(variant));
    this.cdr.markForCheck();
  }

  removeVariant(index: number): void {
    if (!this.canEditVariants) {
      return;
    }
    this.variants.removeAt(index);
    this.cdr.markForCheck();
  }

  variantAttributes(index: number): UntypedFormArray {
    return this.variants.at(index).get('attributes') as UntypedFormArray;
  }

  addVariantAttribute(index: number, attr?: { key?: string; value?: string }, bypass = false): void {
    if (!bypass && !this.canEditVariants) {
      return;
    }
    this.variantAttributes(index).push(this.createAttributeGroup(attr?.key || '', attr?.value || ''));
    this.cdr.markForCheck();
  }

  removeVariantAttribute(variantIndex: number, attributeIndex: number): void {
    if (!this.canEditVariants) {
      return;
    }
    this.variantAttributes(variantIndex).removeAt(attributeIndex);
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.saving || !this.canEditVariants) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const variantPayloads = (this.variants.controls || []).map((ctrl) => {
      const raw = ctrl.getRawValue();
      return this.buildVariantPayload(raw);
    });

    const cleaned = variantPayloads
      .map((variant) => this.cleanVariantForSave(variant))
      .filter((variant) => this.variantHasContent(variant));

    this.saving = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.products.update(this.data.id, { variants: cleaned }).subscribe({
      next: () => {
        this.saving = false;
        this.toast.success(this.translate.instant('products.variants.toasts.saved'));
        this.cdr.markForCheck();
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.saving = false;
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'products.variants.errors.saveFailed';
        this.toast.error(this.translate.instant('products.variants.errors.saveFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  trackByIndex(index: number): number {
    return index;
  }

  private load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.products.get(this.data.id).subscribe({
      next: ({ product }) => {
        this.productName = product.name;
        this.productCurrency = product.price?.currency || this.productCurrency;
        this.setVariants(product.variants || []);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'products.variants.errors.loadFailed';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private setVariants(variants: ProductVariant[]): void {
    this.variants.clear();
    if (!variants.length) {
      this.addVariant(undefined, true);
      return;
    }
    variants.forEach((variant) => this.addVariant(variant, true));
  }

  private createVariantGroup(variant?: ProductVariant): UntypedFormGroup {
    const attrs = this.fb.array([]);
    const normalizedAttributes = this.normalizeAttributesInput(variant?.attributes);

    if (normalizedAttributes.length) {
      normalizedAttributes.forEach((attr) => {
        attrs.push(this.createAttributeGroup(attr.key, attr.value));
      });
    } else {
      attrs.push(this.createAttributeGroup());
    }

    return this.fb.group({
      _id: [variant?._id || null],
      sku: [variant?.sku || ''],
      stock: [variant?.stock ?? 0, [Validators.min(0)]],
      price: [variant?.price?.amount ?? null, [Validators.min(0)]],
      priceDelta: [variant?.priceDelta ?? null],
      isActive: [variant?.isActive ?? true],
      attributes: attrs
    });
  }

  private createAttributeGroup(key: string = '', value: string = ''): UntypedFormGroup {
    return this.fb.group({
      key: [key, Validators.required],
      value: [value, Validators.required]
    });
  }

  private parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined) {
      return undefined;
    }
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : undefined;
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return undefined;
      }
      const parsed = Number(trimmed);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  }

  private normalizeAttributesInput(attrs: ProductAttribute[] | Record<string, any> | undefined | null): Array<{ key: string; value: string }> {
    if (!attrs) {
      return [];
    }
    if (Array.isArray(attrs)) {
      return attrs
        .map((attr) => ({
          key: (attr?.key ?? '').toString().trim(),
          value: (attr?.value ?? '').toString()
        }))
        .filter((attr) => !!attr.key);
    }
    return Object.entries(attrs)
      .map(([key, value]) => ({
        key: key.trim(),
        value: (value ?? '').toString()
      }))
      .filter((attr) => !!attr.key);
  }

  private mapKeyValueArray(entries: Array<{ key?: string; value?: string }> | undefined): ProductAttribute[] {
    if (!entries || !entries.length) {
      return [];
    }
    return entries
      .map((entry) => ({
        key: (entry?.key ?? '').toString().trim(),
        value: (entry?.value ?? '').toString()
      }))
      .filter((entry) => !!entry.key);
  }

  private buildVariantPayload(raw: any): Partial<ProductVariant> {
    const variant: Partial<ProductVariant> = {};

    if (raw?._id) {
      variant._id = raw._id;
    }

    const sku = raw?.sku ? String(raw.sku).trim() : '';
    if (sku) {
      variant.sku = sku;
    }

    const stock = this.parseNumber(raw?.stock);
    if (stock !== undefined) {
      variant.stock = stock;
    }

    if (raw?.isActive !== null && raw?.isActive !== undefined) {
      variant.isActive = !!raw.isActive;
    }

    const attributes = this.mapKeyValueArray(raw?.attributes);
    if (attributes.length) {
      variant.attributes = attributes;
    }

    const priceAmount = this.parseNumber(raw?.price);
    if (priceAmount !== undefined) {
      variant.price = { amount: priceAmount, currency: this.productCurrency };
    }

    const priceDelta = this.parseNumber(raw?.priceDelta);
    if (priceDelta !== undefined) {
      variant.priceDelta = priceDelta;
    }

    return variant;
  }

  private cleanVariantForSave(input: Partial<ProductVariant>): ProductVariant {
    const attributes = this.normalizeAttributesInput(input.attributes as any).map((attr) => ({
      key: attr.key,
      value: attr.value
    }));
    const stock = this.parseNumber(input.stock);

    const variant: ProductVariant = {
      stock: stock ?? 0,
      isActive: typeof input.isActive === 'boolean' ? input.isActive : true,
      attributes
    };

    if (input._id) {
      variant._id = input._id;
    }

    const sku = typeof input.sku === 'string' ? input.sku.trim() : '';
    if (sku) {
      variant.sku = sku;
    }

    if (input.price && typeof input.price === 'object') {
      const amount = this.parseNumber((input.price as any).amount);
      const currency = (input.price as any).currency || this.productCurrency;
      if (amount !== undefined) {
        variant.price = { amount, currency };
      }
    }

    const priceDelta = this.parseNumber(input.priceDelta);
    if (priceDelta !== undefined) {
      variant.priceDelta = priceDelta;
    }

    return variant;
  }

  private variantHasContent(variant: Partial<ProductVariant>): boolean {
    if (!variant) {
      return false;
    }
    if (variant._id) {
      return true;
    }
    if (typeof variant.sku === 'string' && variant.sku.trim().length > 0) {
      return true;
    }
    if (variant.price) {
      return true;
    }
    if (typeof variant.priceDelta === 'number' && !Number.isNaN(variant.priceDelta)) {
      return true;
    }
    if (typeof variant.stock === 'number' && variant.stock > 0) {
      return true;
    }
    if (Array.isArray(variant.attributes) && variant.attributes.some((attr) => attr.key && attr.key.trim().length > 0)) {
      return true;
    }
    if (variant.isActive === false) {
      return true;
    }
    return false;
  }
}

