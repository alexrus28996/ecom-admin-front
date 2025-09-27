import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ProductsService, ProductDetail, ProductImage, ProductInput, ProductVariant, ProductAttribute } from '../../services/products.service';
import { UploadService } from '../../services/upload.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { map, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PermissionsService } from '../../core/permissions.service';

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
    slug: [''],
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

  readonly currencyOptions = [
    { code: 'USD', symbol: '$', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', name: 'Euro' },
    { code: 'GBP', symbol: '£', name: 'British Pound' },
    { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
    { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }
  ];
  defaultProductImage = 'assets/images/product-placeholder.png';
  categories: CategoryOption[] = [];

  readonly productFormPermissions$ = combineLatest({
    create: this.permissions.can$('products.create'),
    update: this.permissions.can$('products.update')
  });
  canEditProduct = true;

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
    private readonly uploads: UploadService,
    private readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id');
    this.permissions
      .load()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cdr.markForCheck(),
        error: () => this.cdr.markForCheck()
      });
    this.watchPermissions();
    this.loadCategories();
    if (this.id) {
      this.fetchProduct(this.id);
    } else {
      // Initialize with default image for new products
      this.addImage(undefined, true);
      this.cdr.markForCheck();
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
    const variants = this.variants?.controls || [];
    let variantStock = 0;
    let active = 0;
    variants.forEach((ctrl) => {
      const stock = Number(ctrl.get('stock')?.value) || 0;
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

  canModify(perms: { create: boolean; update: boolean }): boolean {
    return this.id ? !!perms.update : !!perms.create;
  }

  private watchPermissions(): void {
    this.productFormPermissions$
      .pipe(
        map((perms) => (this.id ? perms.update : perms.create)),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe((canEdit) => {
        this.canEditProduct = !!canEdit;
        if (this.canEditProduct) {
          this.form.enable({ emitEvent: false });
        } else {
          this.form.disable({ emitEvent: false });
        }
        this.cdr.markForCheck();
      });
  }

  addImage(image?: ProductImage, bypass = false): void {
    if (!bypass && !this.canEditProduct) {
      return;
    }
    this.images.push(
      this.fb.group({
        url: [image?.url || '', Validators.required],
        alt: [image?.alt || '']
      })
    );
    this.cdr.markForCheck();
  }

  onImageSelected(evt: Event, index: number): void {
    if (!this.canEditProduct) {
      return;
    }
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
    if (!this.canEditProduct) {
      return;
    }
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
    if (!this.canEditProduct) {
      return;
    }
    this.images.removeAt(index);
    this.cdr.markForCheck();
  }

  addAttribute(entry?: { key?: string; value?: string }, bypass = false): void {
    if (!bypass && !this.canEditProduct) {
      return;
    }
    this.attributes.push(this.createAttributeGroup(entry?.key || '', entry?.value || ''));
    this.cdr.markForCheck();
  }

  removeAttribute(index: number): void {
    if (!this.canEditProduct) {
      return;
    }
    this.attributes.removeAt(index);
    this.cdr.markForCheck();
  }

  addVariant(variant?: ProductVariant, bypass = false): void {
    if (!bypass && !this.canEditProduct) {
      return;
    }
    // TODO: Support variant matrix builder when backend exposes option metadata.
    this.variants.push(this.createVariantGroup(variant));
    this.cdr.markForCheck();
  }

  removeVariant(index: number): void {
    if (!this.canEditProduct) {
      return;
    }
    this.variants.removeAt(index);
    this.cdr.markForCheck();
  }

  variantAttributes(index: number): UntypedFormArray {
    return this.variants.at(index).get('attributes') as UntypedFormArray;
  }

  addVariantAttribute(variantIndex: number, entry?: { key?: string; value?: string }, bypass = false): void {
    if (!bypass && !this.canEditProduct) {
      return;
    }
    this.variantAttributes(variantIndex).push(this.createAttributeGroup(entry?.key || '', entry?.value || ''));
    this.cdr.markForCheck();
  }

  removeVariantAttribute(variantIndex: number, attributeIndex: number): void {
    if (!this.canEditProduct) {
      return;
    }
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
    const normalizedAttributes = this.normalizeAttributesInput(variant?.attributes);

    if (normalizedAttributes.length) {
      normalizedAttributes.forEach((attr) => {
        attributesArray.push(this.createAttributeGroup(attr.key, attr.value));
      });
    } else {
      attributesArray.push(this.createAttributeGroup());
    }

    return this.fb.group({
      _id: [variant?._id || null],
      sku: [variant?.sku || ''],
      price: [this.extractPriceValue(variant?.price) ?? null, [Validators.min(0)]],
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
          const productCurrency = (product as any).currency;
          const fallbackCurrency =
            typeof productCurrency === 'string' && productCurrency ? productCurrency : 'USD';
          const { amount: priceAmountRaw, currency: priceCurrency } = this.normalizePrice(
            product.price,
            fallbackCurrency
          );
          const priceAmount = priceAmountRaw ?? 0;

          this.form.patchValue({
            name: product.name,
            slug: product.slug || this.generateSlugFromName(product.name),
            description: product.description || '',
            longDescription: product.longDescription || '',
            price: priceAmount,
            currency: priceCurrency,
            stock: product.stock ?? 0,
            isActive: product.isActive ?? true,
            category: typeof product.category === 'object' ? product.category?._id || '' : product.category || '',
            sku: product.sku || '',
            metaTitle: product.metaTitle || '',
            metaDescription: product.metaDescription || ''
          });
          this.setImages(product.images || []);
          this.setAttributes(product.attributes);
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
      this.addImage(undefined, true);
      return;
    }
    images.forEach((image) => this.addImage(image, true));
  }

  private setAttributes(attrs: ProductAttribute[] | Record<string, any> | undefined): void {
    this.attributes.clear();
    const normalized = this.normalizeAttributesInput(attrs);
    if (!normalized.length) {
      return;
    }
    normalized.forEach((entry) => this.addAttribute(entry, true));
  }

  private setVariants(variants: ProductVariant[]): void {
    this.variants.clear();
    variants.forEach((variant: ProductVariant) => this.addVariant(variant, true));
  }

  hasError(control: string, error: string): boolean {
    const ctrl = this.form.get(control);
    return !!ctrl && ctrl.touched && ctrl.hasError(error);
  }

  save(): void {
    if (this.loading || !this.canEditProduct) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const currency = raw.currency || 'USD';
    const priceAmount = this.parseNumber(raw.price) ?? 0;
    const stockAmount = this.parseNumber(raw.stock) ?? 0;

    const images = (raw.images as Array<ProductImage>)
      .filter((img) => img?.url)
      .map((img) => ({ url: img.url, alt: img.alt || undefined }));

    const attributes = this.mapKeyValueArray(raw.attributes as Array<{ key?: string; value?: string }>);
    const variantInputs = (raw.variants as Array<any>).map((variant) => this.buildVariantPayload(variant));
    const cleanedVariants = variantInputs
      .map((variant) => this.cleanVariantForSave(variant))
      .filter((variant) => this.variantHasContent(variant));

    const payload: Partial<ProductInput> = {
      name: (raw.name || '').trim(),
      slug: (raw.slug || '').trim() || this.generateSlugFromName(raw.name),
      price: priceAmount,
      currency,
      stock: stockAmount,
      isActive: raw.isActive ?? true
    };

    const sku = (raw.sku || '').trim();
    if (sku) {
      payload.sku = sku;
    }
    if (raw.description) {
      payload.description = raw.description;
    }
    if (raw.longDescription) {
      payload.longDescription = raw.longDescription;
    }
    if (raw.category) {
      payload.category = raw.category as any;
    }
    if (images.length) {
      payload.images = images;
    }
    if (attributes.length) {
      payload.attributes = attributes;
    }
    if (cleanedVariants.length) {
      payload.variants = cleanedVariants;
    }
    if (raw.metaTitle) {
      payload.metaTitle = raw.metaTitle;
    }
    if (raw.metaDescription) {
      payload.metaDescription = raw.metaDescription;
    }

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

  private buildVariantPayload(value: any): Partial<ProductVariant> {
    const variant: Partial<ProductVariant> = {};

    if (value?._id) {
      variant._id = value._id;
    }

    const sku = value?.sku ? String(value.sku).trim() : '';
    if (sku) {
      variant.sku = sku;
    }

    const stock = this.parseNumber(value?.stock);
    if (stock !== undefined) {
      variant.stock = stock;
    }

    if (value?.isActive !== null && value?.isActive !== undefined) {
      variant.isActive = !!value.isActive;
    }

    const attrs = this.mapKeyValueArray(value?.attributes);
    if (attrs.length) {
      variant.attributes = attrs;
    }

    const priceAmount = this.parseNumber(value?.price);
    if (priceAmount !== undefined) {
      variant.price = priceAmount;
    }

    const priceDelta = this.parseNumber(value?.priceDelta);
    if (priceDelta !== undefined) {
      variant.priceDelta = priceDelta;
    }

    return variant;
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

  private extractPriceValue(input: unknown): number | undefined {
    if (input === null || input === undefined) {
      return undefined;
    }
    if (typeof input === 'object') {
      const candidate = (input as any).amount ?? (input as any).price ?? (input as any).value;
      const amount = this.parseNumber(candidate);
      if (amount !== undefined) {
        return amount;
      }
    }
    return this.parseNumber(input);
  }

  private resolveCurrency(input: unknown, fallback: string): string {
    if (input && typeof input === 'object') {
      const currency = (input as any).currency;
      if (typeof currency === 'string' && currency.trim().length) {
        return currency;
      }
    }
    return fallback;
  }

  private normalizePrice(input: unknown, fallbackCurrency: string): { amount?: number; currency: string } {
    const amount = this.extractPriceValue(input);
    const currency = this.resolveCurrency(input, fallbackCurrency);
    return { amount, currency };
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

    const priceAmount = this.extractPriceValue(input.price);
    if (priceAmount !== undefined) {
      variant.price = priceAmount;
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
    if (this.extractPriceValue(variant.price) !== undefined) {
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

  private mapKeyValueArray(entries?: Array<{ key?: string; value?: string }>): ProductAttribute[] {
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

  private loadCategories(): void {
    this.adminService
      .listCategories({ limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = Array.isArray(res?.items)
            ? res.items
            : Array.isArray((res as any)?.data)
              ? (res as any).data
              : [];
          this.categories = items.map((category: any) => ({ id: category._id, name: category.name }));
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

  private cleanProductPayload(payload: Partial<ProductInput>): Partial<ProductInput> {
    const result: Partial<ProductInput> = { ...payload };
    delete (result as any)._id;
    delete (result as any).createdAt;
    delete (result as any).updatedAt;

    const priceValue = this.extractPriceValue(result.price);
    if (priceValue !== undefined) {
      result.price = priceValue;
    }

    if (typeof result.currency === 'string') {
      const trimmedCurrency = result.currency.trim();
      result.currency = trimmedCurrency || 'USD';
    }

    if (Array.isArray(result.images)) {
      result.images = result.images
        .filter((image) => !!image?.url)
        .map((image) => ({ url: image.url, alt: image.alt || undefined }));
      if (!result.images.length) {
        delete result.images;
      }
    }

    if (Array.isArray(result.attributes)) {
      result.attributes = result.attributes
        .map((attr) => ({
          key: (attr?.key ?? '').toString().trim(),
          value: (attr?.value ?? '').toString()
        }))
        .filter((attr) => !!attr.key);
      if (!result.attributes.length) {
        delete result.attributes;
      }
    }

    if (Array.isArray(result.variants)) {
      result.variants = result.variants
        .map((variant) => this.cleanVariantForSave(variant))
        .filter((variant) => this.variantHasContent(variant));
      if (!result.variants.length) {
        delete result.variants;
      }
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

    if (!result.description) {
      delete result.description;
    }

    if (!result.tags || !result.tags.length) {
      delete result.tags;
    }

    return result;
  }

  onNameChange(event: any): void {
    const name = event.target.value;
    if (name && !this.id) {
      // Auto-generate slug only for new products
      const slug = this.generateSlugFromName(name);
      this.form.patchValue({ slug }, { emitEvent: false });
    }
  }

  generateSlug(): void {
    const name = this.form.get('name')?.value;
    if (name) {
      const slug = this.generateSlugFromName(name);
      this.form.patchValue({ slug });
    }
  }

  generateSku(): void {
    const name = this.form.get('name')?.value;
    if (name) {
      const sku = this.generateSkuFromName(name);
      this.form.patchValue({ sku });
    }
  }

  getCurrencySymbol(): string {
    const currency = this.form.get('currency')?.value || 'USD';
    const option = this.currencyOptions.find(opt => opt.code === currency);
    return option?.symbol || '$';
  }

  getImagePreview(url: string): string {
    return url || this.defaultProductImage;
  }

  onImageError(event: any): void {
    event.target.src = this.defaultProductImage;
  }

  onImageUrlChange(index: number): void {
    // Trigger change detection for image preview
    this.cdr.markForCheck();
  }

  private generateSlugFromName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
  }

  private generateSkuFromName(name: string): string {
    const prefix = name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .slice(0, 3);
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}-${timestamp}`;
  }

  private mapSaveError(code: string | undefined): string {
    if (!code) {
      return 'products.errorSave';
    }
    switch (code) {
      case 'PRODUCT_SKU_EXISTS':
        return 'products.errors.duplicateSku';
      case 'PRODUCT_SLUG_EXISTS':
        return 'products.errors.duplicateSlug';
      case 'PRODUCT_VALIDATION_FAILED':
        return 'products.errors.validationFailed';
      default:
        return 'products.errorSave';
    }
  }
}
