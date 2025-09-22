import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Subject, takeUntil } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';
import { ToastService } from '../../../core/toast.service';
import { CouponFormComponent, CouponFormData } from './coupon-form.component';

export interface Coupon {
  id: string;
  code: string;
  description?: string | null;
  type: 'percent' | 'fixed' | string;
  value: number;
  maxRedemptions?: number | null;
  maxRedemptionsPerUser?: number | null;
  usageCount?: number | null;
  isActive?: boolean;
  startsAt?: string | null;
  expiresAt?: string | null;
  includeProducts?: string[] | null;
  includeCategories?: string[] | null;
  [key: string]: any;
}

@Component({
  selector: 'app-coupons-list',
  templateUrl: './coupons-list.component.html',
  styleUrls: ['./coupons-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
// TODO: Add coupon import/export tooling for bulk management.
// TODO: Support advanced targeting (customer groups, cart total rules) for coupons.
// TODO: Implement auto-expiry cron job sync to deactivate coupons automatically.
export class CouponsListComponent implements OnInit, OnDestroy {
  readonly filterForm = this.fb.group({
    status: [''],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  readonly displayedColumns = [
    'code',
    'description',
    'type',
    'value',
    'usageLimits',
    'usageCount',
    'status',
    'startsAt',
    'expiresAt',
    'actions'
  ];

  readonly statusOptions = [
    { value: '', label: 'All statuses' },
    { value: 'active', label: 'Active' },
    { value: 'expired', label: 'Expired' }
  ];

  readonly pageSizeOptions = [10, 25, 50];

  coupons: Coupon[] = [];
  loading = false;
  errorKey: string | null = null;
  total = 0;
  pageIndex = 0;
  pageSize = 10;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly admin: AdminService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.cdr.markForCheck();

    const raw = this.filterForm.value;
    const params: Record<string, any> = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };
    if (raw.status) {
      params.status = raw.status;
    }
    const start = raw.range?.start;
    const end = raw.range?.end;
    if (start) {
      params.from = new Date(start).toISOString();
    }
    if (end) {
      params.to = new Date(end).toISOString();
    }

    this.admin
      .listCoupons(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const items = (res?.items || []) as any[];
          this.coupons = items.map((item) => this.normalizeCoupon(item));
          this.total = res?.total ?? this.coupons.length;
          this.pageIndex = Math.max(0, (res?.page || 1) - 1);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'coupons.list.errors.loadFailed';
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
  }

  resetFilters(): void {
    this.filterForm.reset({ status: '', range: { start: null, end: null } });
    this.applyFilters();
  }

  onPage(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  openCreate(): void {
    const ref = this.dialog.open<CouponFormComponent, CouponFormData, boolean>(CouponFormComponent, {
      width: '640px',
      data: { mode: 'create' }
    });

    ref.afterClosed().subscribe((changed) => {
      if (changed) {
        this.toast.success('Coupon created successfully.');
        this.load();
      }
    });
  }

  editCoupon(coupon: Coupon): void {
    const ref = this.dialog.open<CouponFormComponent, CouponFormData, boolean>(CouponFormComponent, {
      width: '640px',
      data: {
        mode: 'edit',
        coupon
      }
    });

    ref.afterClosed().subscribe((changed) => {
      if (changed) {
        this.toast.success('Coupon updated successfully.');
        this.load();
      }
    });
  }

  deleteCoupon(coupon: Coupon): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'Delete coupon',
        messageKey: `Are you sure you want to delete coupon "${coupon.code}"?`,
        confirmKey: 'Delete',
        cancelKey: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }

      this.loading = true;
      this.cdr.markForCheck();
      this.admin
        .deleteCoupon(coupon.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toast.success('Coupon deleted successfully.');
            this.load();
          },
          error: () => {
            this.loading = false;
            this.cdr.markForCheck();
          }
        });
    });
  }

  resolveStatus(coupon: Coupon): 'active' | 'expired' {
    if (coupon.isActive === false) {
      return 'expired';
    }
    if (coupon.expiresAt) {
      const expiresAt = new Date(coupon.expiresAt);
      if (!Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() < Date.now()) {
        return 'expired';
      }
    }
    return 'active';
  }

  statusClass(coupon: Coupon): string {
    return this.resolveStatus(coupon) === 'active' ? 'status-badge status-badge--active' : 'status-badge status-badge--expired';
  }

  trackById(index: number, coupon: Coupon): string {
    return coupon.id;
  }

  private normalizeCoupon(raw: any): Coupon {
    return {
      id: raw?.id || raw?._id || raw?.code,
      code: raw?.code || '',
      description: raw?.description || raw?.name || '',
      type: raw?.type || raw?.discountType || 'fixed',
      value: raw?.value ?? raw?.discountValue ?? 0,
      maxRedemptions: raw?.maxRedemptions ?? raw?.usageLimit ?? null,
      maxRedemptionsPerUser: raw?.maxRedemptionsPerUser ?? raw?.usageLimitPerUser ?? null,
      usageCount: raw?.usageCount ?? raw?.usedCount ?? 0,
      isActive: raw?.isActive ?? true,
      startsAt: raw?.startsAt || raw?.startDate || null,
      expiresAt: raw?.expiresAt || raw?.endDate || null,
      includeProducts: raw?.includeProducts || raw?.products || null,
      includeCategories: raw?.includeCategories || raw?.categories || null
    };
  }
}
