import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { Coupon } from './coupons-list.component';
import { ProductsService } from '../../../services/products.service';

export interface CouponFormData {
  mode: 'create' | 'edit';
  coupon?: Coupon;
}

interface SelectOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-coupon-form',
  templateUrl: './coupon-form.component.html',
  styleUrls: ['./coupon-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CouponFormComponent implements OnInit, OnDestroy {
  readonly form = this.fb.group({
    code: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    discountType: ['percent', Validators.required],
    discountValue: [0, [Validators.required, Validators.min(0)]],
    usageLimitPerUser: [null as number | null],
    usageLimitGlobal: [null as number | null],
    isActive: [true],
    startDate: [null as Date | null],
    endDate: [null as Date | null],
    includeCategories: [[] as string[]],
    includeProducts: [[] as string[]]
  });

  readonly discountTypes = [
    { value: 'percent', label: 'Percentage (%)' },
    { value: 'fixed', label: 'Fixed Amount' }
  ];

  categoryOptions: SelectOption[] = [];
  productOptions: SelectOption[] = [];
  loading = false;
  loadingCategories = false;
  loadingProducts = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly dialogRef: MatDialogRef<CouponFormComponent, boolean>,
    private readonly fb: FormBuilder,
    private readonly admin: AdminService,
    private readonly products: ProductsService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public readonly data: CouponFormData
  ) {}

  get isEdit(): boolean {
    return this.data.mode === 'edit';
  }

  ngOnInit(): void {
    if (this.data.coupon) {
      const coupon = this.data.coupon;
      this.form.patchValue({
        code: coupon.code || '',
        description: coupon.description || '',
        discountType: coupon.type === 'percent' ? 'percent' : 'fixed',
        discountValue: coupon.value ?? 0,
        usageLimitPerUser: coupon.maxRedemptionsPerUser ?? null,
        usageLimitGlobal: coupon.maxRedemptions ?? null,
        isActive: coupon.isActive !== false,
        startDate: coupon.startsAt ? new Date(coupon.startsAt) : null,
        endDate: coupon.expiresAt ? new Date(coupon.expiresAt) : null,
        includeCategories: coupon.includeCategories || [],
        includeProducts: coupon.includeProducts || []
      });
    }

    this.loadCategories();
    this.loadProducts();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: any = {
      code: String(raw.code || '').trim(),
      description: raw.description ? String(raw.description).trim() : undefined,
      type: raw.discountType,
      value: Number(raw.discountValue),
      isActive: !!raw.isActive,
      maxRedemptionsPerUser: raw.usageLimitPerUser ?? undefined,
      maxRedemptions: raw.usageLimitGlobal ?? undefined,
      startsAt: raw.startDate ? new Date(raw.startDate).toISOString() : undefined,
      expiresAt: raw.endDate ? new Date(raw.endDate).toISOString() : undefined,
      includeCategories: raw.includeCategories && raw.includeCategories.length ? raw.includeCategories : undefined,
      includeProducts: raw.includeProducts && raw.includeProducts.length ? raw.includeProducts : undefined
    };

    if (!payload.description) {
      delete payload.description;
    }

    if (!payload.includeCategories) {
      delete payload.includeCategories;
    }

    if (!payload.includeProducts) {
      delete payload.includeProducts;
    }

    if (payload.maxRedemptionsPerUser == null) {
      delete payload.maxRedemptionsPerUser;
    }

    if (payload.maxRedemptions == null) {
      delete payload.maxRedemptions;
    }

    this.loading = true;
    this.cdr.markForCheck();

    const request$ = this.isEdit && this.data.coupon
      ? this.admin.updateCoupon(this.data.coupon.id, payload)
      : this.admin.createCoupon(payload);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loading = false;
        this.dialogRef.close(true);
      },
      error: () => {
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    this.dialogRef.close(false);
  }

  trackByValue(_: number, option: SelectOption): string {
    return option.value;
  }

  private loadCategories(): void {
    this.loadingCategories = true;
    this.cdr.markForCheck();
    this.admin
      .listCategories({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.categoryOptions = (res?.items || []).map((category: any) => ({
            value: category._id || category.id,
            label: category.name || category.slug || 'Untitled category'
          }));
          this.loadingCategories = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.categoryOptions = [];
          this.loadingCategories = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadProducts(): void {
    this.loadingProducts = true;
    this.cdr.markForCheck();
    this.products
      .list({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.productOptions = (res?.items || []).map((product: any) => ({
            value: product._id || product.id,
            label: product.name || product.slug || 'Untitled product'
          }));
          this.loadingProducts = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.productOptions = [];
          this.loadingProducts = false;
          this.cdr.markForCheck();
        }
      });
  }
}
