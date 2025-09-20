import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';

import { ProductsService, ProductDetail, ProductVariant } from '../../services/products.service';
import { ToastService } from '../../core/toast.service';

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
export class ProductVariantsDialogComponent implements OnInit {
  readonly form: UntypedFormGroup = this.fb.group({
    variants: this.fb.array([])
  });

  loading = false;
  saving = false;
  errorKey: string | null = null;
  lastError: BackendError = null;
  productName = '';

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly dialogRef: MatDialogRef<ProductVariantsDialogComponent>,
    private readonly products: ProductsService,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) private readonly data: ProductVariantsDialogData
  ) {}

  ngOnInit(): void {
    this.load();
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

  addVariant(variant?: ProductVariant): void {
    this.variants.push(this.createVariantGroup(variant));
    this.cdr.markForCheck();
  }

  removeVariant(index: number): void {
    this.variants.removeAt(index);
    this.cdr.markForCheck();
  }

  variantAttributes(index: number): UntypedFormArray {
    return this.variants.at(index).get('attributes') as UntypedFormArray;
  }

  addVariantAttribute(index: number, attr?: { key?: string; value?: string }): void {
    this.variantAttributes(index).push(this.createAttributeGroup(attr?.key || '', attr?.value || ''));
    this.cdr.markForCheck();
  }

  removeVariantAttribute(variantIndex: number, attributeIndex: number): void {
    this.variantAttributes(variantIndex).removeAt(attributeIndex);
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.saving) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = (this.variants.controls || []).map((ctrl) => {
      const raw = ctrl.getRawValue();
      const attributes = this.mapKeyValueArray(raw.attributes);
      return {
        _id: raw._id || undefined,
        sku: raw.sku || undefined,
        stock: raw.stock !== null && raw.stock !== undefined ? Number(raw.stock) : undefined,
        price: raw.price !== null && raw.price !== undefined ? Number(raw.price) : undefined,
        priceDelta: raw.priceDelta !== null && raw.priceDelta !== undefined ? Number(raw.priceDelta) : undefined,
        isActive: raw.isActive ?? true,
        attributes
      } as ProductVariant;
    });

    this.saving = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.products.update(this.data.id, { variants: payload }).subscribe({
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
      this.addVariant();
      return;
    }
    variants.forEach((variant) => this.addVariant(variant));
  }

  private createVariantGroup(variant?: ProductVariant): UntypedFormGroup {
    const attrs = this.fb.array([]);
    if (variant?.attributes) {
      Object.entries(variant.attributes).forEach(([key, value]) => {
        attrs.push(this.createAttributeGroup(key, value));
      });
    }
    if (attrs.length === 0) {
      attrs.push(this.createAttributeGroup());
    }

    return this.fb.group({
      _id: [variant?._id || null],
      sku: [variant?.sku || ''],
      stock: [variant?.stock ?? 0, [Validators.min(0)]],
      price: [variant?.price ?? null, [Validators.min(0)]],
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

  private mapKeyValueArray(entries: Array<{ key?: string; value?: string }> | undefined) {
    if (!entries || !entries.length) {
      return undefined;
    }
    const result: Record<string, string> = {};
    entries
      .filter((entry) => entry && entry.key)
      .forEach((entry) => {
        if (entry?.key) {
          result[entry.key] = entry.value ?? '';
        }
      });
    return Object.keys(result).length ? result : undefined;
  }
}
