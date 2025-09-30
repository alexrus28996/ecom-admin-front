import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormArray, FormBuilder, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from '../../../../core/toast.service';
import { PermissionsService } from '../../../../core/permissions.service';
import { AdminProductsService } from '../services/products.service';
import { Product, ProductImage } from '../models/product';

interface ProductFormValue {
  name: string;
  slug: string;
  description?: string;
  longDescription?: string;
  isActive: boolean;
  category?: string;
  brand?: string;
  vendor?: string;
  taxClass?: string;
  tags: string[];
  price: number;
  compareAtPrice?: number;
  costPrice?: number;
  currency: string;
  images: ProductImage[];
  metaTitle?: string;
  metaDescription?: string;
  metaKeywords: string[];
}

@Component({
  selector: 'app-product-form',
  templateUrl: './product-form.component.html',
  styleUrls: ['./product-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();
  private readonly fb = inject(FormBuilder);
  private readonly productsService = inject(AdminProductsService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionsService);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly form = this.fb.group({
    name: ['', Validators.required],
    slug: ['', Validators.required],
    description: [''],
    longDescription: [''],
    isActive: [true],
    category: ['', Validators.required],
    brand: [''],
    vendor: [''],
    taxClass: [''],
    tags: this.fb.array<string>([]),
    price: [0, [Validators.required, Validators.min(0)]],
    compareAtPrice: [null, [Validators.min(0)]],
    costPrice: [null, [Validators.min(0)]],
    currency: ['USD', Validators.required],
    metaTitle: [''],
    metaDescription: [''],
    metaKeywords: this.fb.array<string>([])
  });

  images: ProductImage[] = [];
  productId?: string;
  saving = false;
  canEdit = false;

  get tagsArray(): FormArray<FormControl<string>> {
    return this.form.get('tags') as FormArray<FormControl<string>>;
  }

  get keywordsArray(): FormArray<FormControl<string>> {
    return this.form.get('metaKeywords') as FormArray<FormControl<string>>;
  }

  ngOnInit(): void {
    this.permissions
      .can$('product:edit')
      .pipe(takeUntil(this.destroy$))
      .subscribe(canEdit => {
        this.canEdit = canEdit;
        this.toggleForm(canEdit);
      });

    this.form.controls.name.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(name => {
      if (!name) return;
      const slugControl = this.form.controls.slug;
      if (!slugControl.value) {
        slugControl.setValue(this.slugify(name), { emitEvent: false });
      }
    });

    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadProduct(id);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  addTag(value: string): void {
    if (!value) return;
    this.tagsArray.push(new FormControl(value));
  }

  removeTag(index: number): void {
    this.tagsArray.removeAt(index);
  }

  addKeyword(value: string): void {
    if (!value) return;
    this.keywordsArray.push(new FormControl(value));
  }

  removeKeyword(index: number): void {
    this.keywordsArray.removeAt(index);
  }

  onImagesChange(images: ProductImage[]): void {
    this.images = images;
  }

  save(closeAfter = false): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Please resolve validation errors before saving.');
      return;
    }

    if (!this.canEdit) {
      this.toast.error('Missing permission: product:edit');
      return;
    }

    const payload = this.toPayload();
    this.saving = true;
    const request$ = this.productId
      ? this.productsService.update(this.productId, payload)
      : this.productsService.create(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: product => {
        this.toast.success('Product saved');
        this.saving = false;
        this.cdr.markForCheck();
        if (!this.productId) {
          this.router.navigate(['/admin/products', product._id]);
        } else if (closeAfter) {
          this.router.navigate(['/admin/products']);
        }
      },
      error: error => {
        this.saving = false;
        this.toast.error(error?.error?.message || 'Unable to save product');
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/products']);
  }

  private loadProduct(id: string): void {
    this.productId = id;
    this.productsService.get(id).subscribe({
      next: product => this.populateForm(product),
      error: () => this.toast.error('Failed to load product')
    });
  }

  private populateForm(product: Product): void {
    this.form.patchValue({
      name: product.name,
      slug: product.slug,
      description: product.description,
      longDescription: product.longDescription,
      isActive: product.isActive !== false,
      category: product.category,
      brand: product.brand,
      vendor: product.vendor,
      taxClass: product.taxClass,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? null,
      costPrice: product.costPrice ?? null,
      currency: product.currency,
      metaTitle: product.seo?.metaTitle,
      metaDescription: product.seo?.metaDescription
    });

    this.tagsArray.clear();
    (product.tags || []).forEach(tag => this.tagsArray.push(new FormControl(tag)));

    this.keywordsArray.clear();
    (product.seo?.metaKeywords || []).forEach(keyword => this.keywordsArray.push(new FormControl(keyword)));

    this.images = product.images || [];
    this.cdr.markForCheck();
  }

  private toPayload(): ProductFormValue {
    return {
      ...(this.form.getRawValue() as ProductFormValue),
      tags: this.tagsArray.value,
      metaKeywords: this.keywordsArray.value,
      images: this.images
    };
  }

  private toggleForm(enabled: boolean): void {
    if (enabled) {
      this.form.enable({ emitEvent: false });
    } else {
      this.form.disable({ emitEvent: false });
    }
    this.cdr.markForCheck();
  }

  private slugify(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
