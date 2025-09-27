import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { ProductsService, ProductDetail, ProductImage, ProductVariant, ProductAttribute } from '../../services/products.service';
import { UploadService } from '../../services/upload.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';
import { BrandsService } from '../../services/brands.service';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { map, distinctUntilChanged, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { PermissionsService } from '../../core/permissions.service';

interface CategoryOption {
  id: string;
  name: string;
}

interface BrandOption {
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
    compareAtPrice: [null, [Validators.min(0)]],
    costPrice: [null, [Validators.min(0)]],
    currency: ['USD', Validators.required],
    stock: [0, [Validators.min(0)]],
    isActive: [true],
    category: [''],
    brand: [''],
    vendor: [''],
    barcode: [''],
    taxClass: [''],
    tags: [''],
    requiresShipping: [true],
    weight: [null, [Validators.min(0)]],
    weightUnit: ['kg'],
    dimensions: this.fb.group({
      length: [null, [Validators.min(0)]],
      width: [null, [Validators.min(0)]],
      height: [null, [Validators.min(0)]],
      unit: ['cm']
    }),
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
  readonly weightUnits = ['kg', 'g', 'lb', 'oz'];
  readonly dimensionUnits = ['cm', 'in'];
  defaultProductImage = 'assets/images/product-placeholder.png';
  categories: CategoryOption[] = [];
  brands: BrandOption[] = [];

  readonly productFormPermissions$ = combineLatest({
    create: this.permissions.can$('product:create'),
    update: this.permissions.can$('product:edit')
  }).pipe(
    tap((perms) => {
      this.currentPermissions = perms;
      this.permissionsLoaded = true;
    })
  );
  canEditProduct = true;
  private currentPermissions: { create: boolean; update: boolean } = { create: false, update: false };
  private permissionsLoaded = false;
  private permissionNoticeShown = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly products: ProductsService,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly adminService: AdminService,
    private readonly brandsService: BrandsService,
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
    this.loadBrands();
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

  get dimensions(): UntypedFormGroup {
    return this.form.get('dimensions') as UntypedFormGroup;
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
          this.permissionNoticeShown = false;
        } else {
          this.form.disable({ emitEvent: false });
          if (this.permissionsLoaded && !this.permissionNoticeShown) {
            this.toast.show(this.translate.instant('products.permissions.editDenied'), 'info');
            this.permissionNoticeShown = true;
          }
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
          const compareAtPrice = this.parseNumber((product as any).compareAtPrice ?? (product as any).comparePrice);
          const costPrice = this.parseNumber((product as any).costPrice);
          const vendor = (product as any).vendor || '';
          const barcode = (product as any).barcode || '';
          const taxClass = (product as any).taxClass || '';
          const requiresShipping = (product as any).requiresShipping;
          const weight = this.parseNumber((product as any).weight);
          const weightUnit = (product as any).weightUnit || 'kg';
          const dimensionsRaw = (product as any).dimensions || {};
          const dimensionLength = this.parseNumber((dimensionsRaw as any).length);
          const dimensionWidth = this.parseNumber((dimensionsRaw as any).width);
          const dimensionHeight = this.parseNumber((dimensionsRaw as any).height);
          const dimensionUnit = (dimensionsRaw as any).unit || 'cm';
          const tagsArray = Array.isArray((product as any).tags) ? (product as any).tags : [];
          const brandId = typeof (product as any).brand === 'object'
            ? (product as any).brand?._id || (product as any).brand?.id || ''
            : (product as any).brand || '';

          this.form.patchValue({
            name: product.name,
            slug: product.slug || this.generateSlugFromName(product.name),
            description: product.description || '',
            longDescription: product.longDescription || '',
            price: priceAmount,
            compareAtPrice,
            costPrice,
            currency: priceCurrency,
            stock: product.stock ?? 0,
            isActive: product.isActive ?? true,
            category: typeof product.category === 'object' ? product.category?._id || '' : product.category || '',
            brand: brandId,
            vendor,
            barcode,
            taxClass,
            tags: tagsArray.join(', '),
            requiresShipping: requiresShipping !== null && requiresShipping !== undefined ? !!requiresShipping : true,
            weight: weight ?? null,
            weightUnit,
            dimensions: {
              length: dimensionLength ?? null,
              width: dimensionWidth ?? null,
              height: dimensionHeight ?? null,
              unit: dimensionUnit
            },
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
    const compareAtPrice = this.parseNumber(raw.compareAtPrice);
    const costPrice = this.parseNumber(raw.costPrice);
    const tags = typeof raw.tags === 'string'
      ? raw.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => !!tag)
      : Array.isArray(raw.tags)
        ? raw.tags.filter((tag: string) => typeof tag === 'string' && tag.trim().length).map((tag: string) => tag.trim())
        : [];
    const requiresShipping = raw.requiresShipping !== null && raw.requiresShipping !== undefined ? !!raw.requiresShipping : true;
    const weight = this.parseNumber(raw.weight);
    const weightUnit = raw.weightUnit || 'kg';
    const dimensionsRaw = raw.dimensions || {};
    const dimensionLength = this.parseNumber(dimensionsRaw.length);
    const dimensionWidth = this.parseNumber(dimensionsRaw.width);
    const dimensionHeight = this.parseNumber(dimensionsRaw.height);
    const dimensionUnit = dimensionsRaw.unit || 'cm';

    const images = (raw.images as Array<ProductImage>)
      .filter((img) => img?.url)
      .map((img) => ({ url: img.url, alt: img.alt || undefined }));

    const attributes = this.mapKeyValueArray(raw.attributes as Array<{ key?: string; value?: string }>);
    const variantInputs = (raw.variants as Array<any>).map((variant) => this.buildVariantPayload(variant));
    const cleanedVariants = variantInputs
      .map((variant) => this.cleanVariantForSave(variant))
      .filter((variant) => this.variantHasContent(variant));

    const payload: Record<string, any> = {
      name: (raw.name || '').trim(),
      slug: (raw.slug || '').trim() || this.generateSlugFromName(raw.name),
      price: priceAmount,
      currency,
      stock: stockAmount,
      isActive: raw.isActive ?? true,
      requiresShipping
    };

    if (compareAtPrice !== undefined) {
      payload.compareAtPrice = compareAtPrice;
    }
    if (costPrice !== undefined) {
      payload.costPrice = costPrice;
    }

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

    const brandIdValue = (raw.brand || '').trim();
    if (brandIdValue) {
      payload.brand = brandIdValue;
    }

    const vendorValue = (raw.vendor || '').trim();
    if (vendorValue) {
      payload.vendor = vendorValue;
    }

    const barcodeValue = (raw.barcode || '').trim();
    if (barcodeValue) {
      payload.barcode = barcodeValue;
    }

    const taxClassValue = (raw.taxClass || '').trim();
    if (taxClassValue) {
      payload.taxClass = taxClassValue;
    }

    if (tags.length) {
      payload.tags = tags;
    }

    if (weight !== undefined) {
      payload.weight = weight;
    }
    if (weightUnit) {
      payload.weightUnit = weightUnit;
    }

    const dimensionPayload: Record<string, number | string> = {};
    if (dimensionLength !== undefined) {
      dimensionPayload.length = dimensionLength;
    }
    if (dimensionWidth !== undefined) {
      dimensionPayload.width = dimensionWidth;
    }
    if (dimensionHeight !== undefined) {
      dimensionPayload.height = dimensionHeight;
    }
    if (Object.keys(dimensionPayload).length) {
      dimensionPayload.unit = dimensionUnit;
      payload.dimensions = dimensionPayload;
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

  private buildVariantPayload(value: any): Record<string, any> {
    const variant: Record<string, any> = {};

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

    const attributeRecord = this.keyValueArrayToRecord(value?.attributes);
    if (Object.keys(attributeRecord).length) {
      variant.attributes = attributeRecord;
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

  private cleanVariantForSave(input: Partial<ProductVariant>): Record<string, any> {
    const stock = this.parseNumber(input.stock);
    const attributeRecord = this.keyValueArrayToRecord((input as any).attributes);

    const variant: Record<string, any> = {
      stock: stock ?? 0,
      isActive: typeof input.isActive === 'boolean' ? input.isActive : true
    };

    if (input._id) {
      variant._id = input._id;
    }

    const sku = typeof input.sku === 'string' ? input.sku.trim() : '';
    if (sku) {
      variant.sku = sku;
    }

    if (Object.keys(attributeRecord).length) {
      variant.attributes = attributeRecord;
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
    if (variant.attributes) {
      if (Array.isArray(variant.attributes)) {
        if (variant.attributes.some((attr: any) => attr?.key && attr.key.toString().trim().length > 0)) {
          return true;
        }
      } else if (typeof variant.attributes === 'object') {
        const hasAttribute = Object.entries(variant.attributes as Record<string, any>)
          .some(([key, value]) => key.trim().length > 0 && value !== undefined && value !== null && value.toString().trim().length > 0);
        if (hasAttribute) {
          return true;
        }
      }
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

  private keyValueArrayToRecord(entries?: Array<{ key?: string; value?: string }> | Record<string, any>): Record<string, string> {
    const record: Record<string, string> = {};
    if (Array.isArray(entries)) {
      this.mapKeyValueArray(entries).forEach((entry) => {
        record[entry.key] = entry.value;
      });
    } else if (entries && typeof entries === 'object') {
      Object.entries(entries).forEach(([key, value]) => {
        const trimmedKey = key.trim();
        if (trimmedKey) {
          record[trimmedKey] = value === undefined || value === null ? '' : value.toString();
        }
      });
    }
    return record;
  }

  private loadBrands(): void {
    this.brandsService
      .getBrands({ limit: 1000 } as any)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const rawItems = Array.isArray((res as any)?.items)
            ? (res as any).items
            : Array.isArray((res as any)?.data)
              ? (res as any).data
              : [];
          this.brands = rawItems
            .map((brand: any) => ({ id: brand?._id || brand?.id, name: brand?.name || '' }))
            .filter((brand: BrandOption) => !!brand.id && !!brand.name)
            .sort((a: BrandOption, b: BrandOption) => a.name.localeCompare(b.name));
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.toast.error(this.translate.instant('products.messages.errors.brandsLoad'));
          if (!environment.production) {
            console.error('Failed to load brands', err);
          }
        }
      });
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

  private cleanProductPayload(payload: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = { ...payload };
    delete result._id;
    delete result.createdAt;
    delete result.updatedAt;

    const priceValue = this.extractPriceValue(result.price);
    if (priceValue !== undefined) {
      result.price = priceValue;
    } else {
      delete result.price;
    }

    if (typeof result.currency === 'string') {
      const trimmedCurrency = result.currency.trim();
      result.currency = trimmedCurrency || 'USD';
    }

    if (Array.isArray(result.images)) {
      result.images = result.images
        .filter((image: ProductImage) => !!image?.url)
        .map((image: ProductImage) => ({ url: image.url, alt: image.alt || undefined }));
      if (!result.images.length) {
        delete result.images;
      }
    }

    if (Array.isArray(result.attributes)) {
      const attributeRecord = this.keyValueArrayToRecord(result.attributes as Array<{ key?: string; value?: string }>);
      if (Object.keys(attributeRecord).length) {
        result.attributes = attributeRecord;
      } else {
        delete result.attributes;
      }
    }

    if (Array.isArray(result.variants)) {
      result.variants = result.variants
        .map((variant: any) => this.cleanVariantForSave(variant))
        .filter((variant: any) => this.variantHasContent(variant));
      if (!result.variants.length) {
        delete result.variants;
      }
    }

    const compareAtNumber = this.parseNumber(result.compareAtPrice);
    if (compareAtNumber !== undefined) {
      result.compareAtPrice = compareAtNumber;
    } else {
      delete result.compareAtPrice;
    }

    const costPriceNumber = this.parseNumber(result.costPrice);
    if (costPriceNumber !== undefined) {
      result.costPrice = costPriceNumber;
    } else {
      delete result.costPrice;
    }

    const weightNumber = this.parseNumber(result.weight);
    if (weightNumber !== undefined) {
      result.weight = weightNumber;
    } else {
      delete result.weight;
    }

    if (typeof result.weightUnit === 'string') {
      const trimmedUnit = result.weightUnit.trim();
      if (trimmedUnit) {
        result.weightUnit = trimmedUnit;
      } else {
        delete result.weightUnit;
      }
    }

    if (result.dimensions && typeof result.dimensions === 'object') {
      const dims = result.dimensions as Record<string, any>;
      const cleaned: Record<string, number | string> = {};
      const lengthValue = this.parseNumber(dims.length);
      const widthValue = this.parseNumber(dims.width);
      const heightValue = this.parseNumber(dims.height);
      if (lengthValue !== undefined) cleaned.length = lengthValue;
      if (widthValue !== undefined) cleaned.width = widthValue;
      if (heightValue !== undefined) cleaned.height = heightValue;
      const unitValue = typeof dims.unit === 'string' && dims.unit.trim().length ? dims.unit.trim() : undefined;
      if (unitValue) {
        cleaned.unit = unitValue;
      }
      if (Object.keys(cleaned).length) {
        result.dimensions = cleaned;
      } else {
        delete result.dimensions;
      }
    }

    if (typeof result.brand === 'string') {
      result.brand = result.brand.trim();
      if (!result.brand) {
        delete result.brand;
      }
    }

    if (typeof result.vendor === 'string') {
      result.vendor = result.vendor.trim();
      if (!result.vendor) {
        delete result.vendor;
      }
    }

    if (typeof result.barcode === 'string') {
      result.barcode = result.barcode.trim();
      if (!result.barcode) {
        delete result.barcode;
      }
    }

    if (typeof result.taxClass === 'string') {
      result.taxClass = result.taxClass.trim();
      if (!result.taxClass) {
        delete result.taxClass;
      }
    }

    if (Array.isArray(result.tags)) {
      result.tags = result.tags
        .map((tag: string) => (tag || '').toString().trim())
        .filter((tag: string) => !!tag);
      if (!result.tags.length) {
        delete result.tags;
      }
    } else {
      delete result.tags;
    }

    if (result.metaTitle === '') {
      delete result.metaTitle;
    }

    if (result.metaDescription === '') {
      delete result.metaDescription;
    }

    if (!result.longDescription) {
      delete result.longDescription;
    }

    if (!result.description) {
      delete result.description;
    }

    if (typeof result.category === 'string') {
      result.category = result.category.trim();
      if (!result.category) {
        delete result.category;
      }
    }

    result.requiresShipping = result.requiresShipping === undefined ? true : !!result.requiresShipping;

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
