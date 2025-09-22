import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ProductsService, ProductDetail, ProductImage, ProductInput, ProductVariant } from '../../services/products.service';
import { UploadService } from '../../services/upload.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../environments/environment';

interface CategoryOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormComponent implements OnInit, OnDestroy {
  id: string | null = null;
  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  readonly form: UntypedFormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    sku: [''],
    description: [''],
    longDescription: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    currency: ['USD', Validators.required],
    stock: [0, [Validators.min(0)]],
    isActive: [true],
    category: [''],
    metaTitle: [''],
    metaDescription: [''],
    images: this.fb.array([]),
    attributes: this.fb.array([]),
    variants: this.fb.array([])
  });

  readonly currencyOptions = ['USD', 'EUR', 'GBP', 'INR'];
  categories: CategoryOption[] = [];

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly products: ProductsService,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly uploads: UploadService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.loadCategories();
    if (this.id) {
      this.fetchProduct(this.id);
    } else {
      this.addImage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get images(): UntypedFormArray {
    return this.form.get('images') as UntypedFormArray;
  }

  get attributes(): UntypedFormArray {
    return this.form.get('attributes') as UntypedFormArray;
  }

  get variants(): UntypedFormArray {
    return this.form.get('variants') as UntypedFormArray;
  }

  get variantSummary() {
    const baseStock = Number(this.form.get('stock')?.value) || 0;
    const variants = this.variants.controls;
    let variantStock = 0;
    let active = 0;
    variants.forEach((ctrl) => {
      const stock = Number(ctrl.get('stock')?.value);
      if (!Number.isNaN(stock)) {
        variantStock += stock;
      }
      if (ctrl.get('isActive')?.value) {
        active += 1;
      }
    });
    return {
      totalVariants: variants.length,
      activeVariants: active,
      totalStock: baseStock + variantStock
    };
  }

  addImage(image?: ProductImage): void {
    this.images.push(
      this.fb.group({
        url: [image?.url || '', Validators.required],
        alt: [image?.alt || '']
      })
    );
    this.cdr.markForCheck();
  }

  onImageSelected(evt: Event, index: number): void {
    const input = evt.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const file = input.files[0];
    this.uploads
      .upload(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const group = this.images.at(index) as UntypedFormGroup;
          group.patchValue({ url: res?.url || '' });
          this.cdr.markForCheck();
        },
        error: () => {
          this.toast.error(this.translate.instant('products.messages.errors.imageUpload'));
        }
      });
  }

  imagesDrop(ev: CdkDragDrop<any[]>): void {
    const arr = this.images;
    const prev = ev.previousIndex;
    const curr = ev.currentIndex;
    if (prev === curr) return;
    const ctrl = arr.at(prev);
    arr.removeAt(prev);
    arr.insert(curr, ctrl);
    this.cdr.markForCheck();
  }

  removeImage(index: number): void {
    this.images.removeAt(index);
    this.cdr.markForCheck();
  }

  addAttribute(entry?: { key?: string; value?: string }): void {
    this.attributes.push(this.createAttributeGroup(entry?.key || '', entry?.value || ''));
    this.cdr.markForCheck();
  }

  removeAttribute(index: number): void {
    this.attributes.removeAt(index);
    this.cdr.markForCheck();
  }

  addVariant(variant?: ProductVariant): void {
    // TODO: Support variant matrix builder when backend exposes option metadata.
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

  addVariantAttribute(variantIndex: number, entry?: { key?: string; value?: string }): void {
    this.variantAttributes(variantIndex).push(this.createAttributeGroup(entry?.key || '', entry?.value || ''));
    this.cdr.markForCheck();
  }

  removeVariantAttribute(variantIndex: number, attributeIndex: number): void {
    this.variantAttributes(variantIndex).removeAt(attributeIndex);
    this.cdr.markForCheck();
  }

  private createAttributeGroup(key: string = '', value: string = ''): UntypedFormGroup {
    return this.fb.group({
      key: [key, Validators.required],
      value: [value, Validators.required]
    });
  }

  private createVariantGroup(variant?: ProductVariant): UntypedFormGroup {
    const attributesArray = this.fb.array([]);
    if (variant?.attributes) {
      Object.entries(variant.attributes).forEach(([attrKey, attrValue]) => {
        attributesArray.push(this.createAttributeGroup(attrKey, attrValue));
      });
    }
    if (attributesArray.length === 0) {
      attributesArray.push(this.createAttributeGroup());
    }

    return this.fb.group({
      _id: [variant?._id || null],
      sku: [variant?.sku || ''],
      price: [variant?.price ?? null, [Validators.min(0)]],
      priceDelta: [variant?.priceDelta ?? null],
      stock: [variant?.stock ?? 0, [Validators.min(0)]],
      isActive: [variant?.isActive ?? true],
      attributes: attributesArray
    });
  }

  private fetchProduct(id: string): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.products
      .getById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ product }: { product: ProductDetail }) => {
          this.form.patchValue({
            name: product.name,
            description: product.description || '',
            longDescription: product.longDescription || '',
            price: product.price,
            currency: product.currency || 'USD',
            stock: product.stock ?? 0,
            isActive: product.isActive ?? true,
            category: typeof product.category === 'object' ? product.category?._id || '' : product.category || '',
            sku: product.sku || '',
            metaTitle: product.metaTitle || '',
            metaDescription: product.metaDescription || ''
          });
          this.setImages(product.images || []);
          this.setAttributes(product.attributes || {});
          this.setVariants(product.variants || []);
          this.loading = false;
          this.lastError = null;
          this.cdr.markForCheck();
        },
        error: (err) => {
          const fallbackKey = 'products.errors.loadOne';
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : fallbackKey;
          this.lastError = err;
          const translated = this.translate.instant(this.errorKey);
          const message = translated === this.errorKey ? this.translate.instant(fallbackKey) : translated;
          this.toast.error(message);
          if (!environment.production) {
            // eslint-disable-next-line no-console
            console.error('Failed to load product details', err);
          }
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private setImages(images: ProductImage[]): void {
    this.images.clear();
    if (!images.length) {
      this.addImage();
      return;
    }
    images.forEach((image) => this.addImage(image));
  }

  private setAttributes(attrs: Record<string, string>): void {
    this.attributes.clear();
    const entries = Object.entries(attrs);
    if (!entries.length) {
      return;
    }
    entries.forEach(([key, value]) => this.addAttribute({ key, value }));
  }

  private setVariants(variants: ProductVariant[]): void {
    this.variants.clear();
    variants.forEach((variant: ProductVariant) => this.addVariant(variant));
  }

  hasError(control: string, error: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }

  save(): void {
    if (this.loading) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: ProductInput = {
      name: (raw.name || '').trim(),
      sku: (raw.sku || '').trim() || undefined,
      description: raw.description || '',
      longDescription: raw.longDescription || undefined,
      price: raw.price ?? 0,
      currency: raw.currency || 'USD',
      stock: raw.stock ?? 0,
      isActive: raw.isActive ?? true,
      category: raw.category || null,
      images: (raw.images as Array<ProductImage>)
        .filter((img) => img?.url)
        .map((img) => ({ url: img.url, alt: img.alt || undefined })),
      attributes: this.mapKeyValueArray(raw.attributes as Array<{ key?: string; value?: string }>),
      variants: (raw.variants as Array<any>).map((variant) => this.buildVariantPayload(variant)),
      metaTitle: raw.metaTitle || undefined,
      metaDescription: raw.metaDescription || undefined
    };

    const cleanedPayload = this.cleanProductPayload(payload);

    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    const request$ = this.id ? this.products.update(this.id, cleanedPayload) : this.products.create(cleanedPayload);
    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success(this.translate.instant('products.saveSuccess'));
          this.loading = false;
          this.cdr.markForCheck();
          this.router.navigate(['/admin/products']);
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'products.errorSave';
          const messageKey = this.mapSaveError(code);
          this.toast.error(this.translate.instant(messageKey));
          this.lastError = err;
          this.loading = false;
          if (!environment.production) {
            // eslint-disable-next-line no-console
            console.error('Failed to save product', err);
          }
          this.cdr.markForCheck();
        }
      });
  }

  private buildVariantPayload(value: any): ProductVariant {
    const attrs = this.mapKeyValueArray(value?.attributes);
    const variant: ProductVariant = {
      sku: value?.sku || undefined,
      price: value?.price !== null && value?.price !== undefined ? Number(value.price) : undefined,
      priceDelta: value?.priceDelta !== null && value?.priceDelta !== undefined ? Number(value.priceDelta) : undefined,
      stock: value?.stock !== null && value?.stock !== undefined ? Number(value.stock) : undefined,
      isActive: value?.isActive ?? true,
      attributes: attrs
    };
    return variant;
  }

  private mapKeyValueArray(entries?: Array<{ key?: string; value?: string }>): Record<string, string> | undefined {
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

  private loadCategories(): void {
    this.adminService
      .listCategories({ limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.categories = res.items.map((category: any) => ({ id: category._id, name: category.name }));
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toast.error(this.translate.instant('categories.errors.load'));
          if (!environment.production) {
            // eslint-disable-next-line no-console
            console.error('Failed to load categories', err);
          }
        }
      });
  }

  private cleanProductPayload(payload: ProductInput): ProductInput {
    const result: ProductInput = { ...payload };
    delete (result as any)._id;
    delete (result as any).createdAt;
    delete (result as any).updatedAt;

    if (!result.images || !result.images.length) {
      delete result.images;
    }
    if (result.images) {
      result.images = result.images.filter((image) => !!image.url);
      if (!result.images.length) {
        delete result.images;
      }
    }

    if (!result.variants || !result.variants.length) {
      delete result.variants;
    } else {
      result.variants = result.variants
        .map((variant) => {
          const cleanedIsActive = variant.isActive === null ? undefined : variant.isActive;
          const next: ProductVariant = { ...variant, isActive: cleanedIsActive };
          if (next.isActive === undefined) {
            delete next.isActive;
          }
          if (next.attributes && !Object.keys(next.attributes).length) {
            delete next.attributes;
          }
          delete (next as any)._id;
          delete (next as any).createdAt;
          delete (next as any).updatedAt;
          return next;
        })
        .filter((variant) => Object.keys(variant).length > 0);
      if (!result.variants.length) {
        delete result.variants;
      }
    }

    if (!result.attributes || !Object.keys(result.attributes).length) {
      delete result.attributes;
    }

    if (!result.tags || !result.tags?.length) {
      delete result.tags;
    }

    if (!result.metaTitle) {
      delete result.metaTitle;
    }

    if (!result.metaDescription) {
      delete result.metaDescription;
    }

    if (!result.longDescription) {
      delete result.longDescription;
    }

    return result;
  }

  private mapSaveError(code: string | undefined): string {
    if (!code) {
      return 'products.errorSave';
    }
    switch (code) {
      case 'PRODUCT_SKU_EXISTS':
        return 'products.errors.duplicateSku';
      case 'PRODUCT_VALIDATION_FAILED':
        return 'products.errors.validationFailed';
      default:
        return 'products.errorSave';
    }
  }
}

