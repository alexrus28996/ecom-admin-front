import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ProductsService, ProductDetail, ProductImage, ProductInput, ProductVariant } from '../../services/products.service';
import { UploadService } from '../../services/upload.service';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';

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
export class ProductFormComponent implements OnInit {
  id: string | null = null;
  loading = false;
  errorKey: string | null = null;

  readonly form: UntypedFormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    price: [0, [Validators.required, Validators.min(0)]],
    currency: ['USD', Validators.required],
    stock: [0, [Validators.min(0)]],
    isActive: [true],
    category: [''],
    images: this.fb.array([]),
    attributes: this.fb.array([]),
    variants: this.fb.array([])
  });

  readonly currencyOptions = ['USD', 'EUR', 'GBP', 'INR'];
  categories: CategoryOption[] = [];

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
    this.uploads.upload(file).subscribe({
      next: (res) => {
        const group = this.images.at(index) as UntypedFormGroup;
        group.patchValue({ url: res?.url || '' });
        this.cdr.markForCheck();
      },
      error: () => {
        this.toast.error(this.translate.instant('products.form.sections.imagesUploadFailed'));
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
    this.products.get(id).subscribe({
      next: ({ product }: { product: ProductDetail }) => {
        this.form.patchValue({
          name: product.name,
          description: product.description || '',
          price: product.price,
          currency: product.currency || 'USD',
          stock: product.stock ?? 0,
          isActive: product.isActive ?? true,
          category: typeof product.category === 'object' ? product.category?._id || '' : product.category || ''
        });
        this.setImages(product.images || []);
        this.setAttributes(product.attributes || {});
        this.setVariants(product.variants || []);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.errorKey = err?.error?.error?.code ? `errors.backend.${err.error.error.code}` : 'products.form.errors.loadFailed';
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
      description: raw.description || '',
      price: raw.price ?? 0,
      currency: raw.currency || 'USD',
      stock: raw.stock ?? 0,
      isActive: raw.isActive ?? true,
      category: raw.category || null,
      images: (raw.images as Array<ProductImage>)
        .filter((img) => img?.url)
        .map((img) => ({ url: img.url, alt: img.alt || undefined })),
      attributes: this.mapKeyValueArray(raw.attributes as Array<{ key?: string; value?: string }>),
      variants: (raw.variants as Array<any>).map((variant) => this.buildVariantPayload(variant))
    };

    this.loading = true;
    this.errorKey = null;
    this.cdr.markForCheck();

    const request$ = this.id ? this.products.update(this.id, payload) : this.products.create(payload);
    request$.subscribe({
      next: () => {
        const messageKey = this.id ? 'products.form.toasts.updated' : 'products.form.toasts.created';
        this.toast.success(this.translate.instant(messageKey, { name: payload.name }));
        this.loading = false;
        this.cdr.markForCheck();
        this.router.navigate(['/products']);
      },
      error: (err) => {
        this.errorKey = err?.error?.error?.code ? `errors.backend.${err.error.error.code}` : 'products.form.errors.saveFailed';
        this.toast.error(this.translate.instant('products.form.errors.saveFailed'));
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private buildVariantPayload(value: any): ProductVariant {
    const attrs = this.mapKeyValueArray(value?.attributes);
    return {
      _id: value?._id || undefined,
      sku: value?.sku || undefined,
      price: value?.price !== null && value?.price !== undefined ? Number(value.price) : undefined,
      priceDelta: value?.priceDelta !== null && value?.priceDelta !== undefined ? Number(value.priceDelta) : undefined,
      stock: value?.stock !== null && value?.stock !== undefined ? Number(value.stock) : undefined,
      isActive: value?.isActive ?? true,
      attributes: attrs
    };
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
    this.adminService.listCategories({ limit: 1000 }).subscribe({
      next: (res) => {
        this.categories = res.items.map((category: any) => ({ id: category._id, name: category.name }));
        this.cdr.markForCheck();
      },
      error: () => {
        // ignore category load errors
      }
    });
  }
}

