import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../../../services/admin.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';
import { ToastService } from '../../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';

interface ReviewMedia {
  readonly url: string;
  readonly type?: string;
  readonly thumbnailUrl?: string;
}

export interface AdminReview {
  readonly id: string;
  readonly _id?: string;
  readonly product?: {
    id?: string;
    _id?: string;
    name?: string;
    slug?: string;
    thumbnailUrl?: string;
  };
  readonly user?: {
    id?: string;
    name?: string;
    email?: string;
  };
  readonly rating?: number;
  readonly title?: string;
  readonly comment?: string;
  readonly status?: 'pending' | 'approved' | 'rejected';
  readonly createdAt?: string;
  readonly updatedAt?: string;
  readonly media?: ReviewMedia[];
  readonly flagged?: boolean;
  readonly reported?: boolean;
  readonly reportsCount?: number;
  readonly flagsCount?: number;
  readonly reportNotes?: string;
}

interface ReviewListResponse {
  readonly items: AdminReview[];
  readonly total: number;
  readonly page: number;
  readonly pages: number;
}

@Component({
  selector: 'app-reviews-list',
  templateUrl: './reviews-list.component.html',
  styleUrls: ['./reviews-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReviewsListComponent implements OnInit {
  readonly filterForm = this.fb.group({
    status: [''],
    rating: [''],
    product: [''],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  readonly displayedColumns = [
    'reviewId',
    'product',
    'user',
    'rating',
    'comment',
    'status',
    'createdAt',
    'media',
    'actions'
  ];

  reviews: AdminReview[] = [];
  loading = false;
  total = 0;
  page = 0;
  pageSize = 10;
  readonly pageSizes = [10, 25, 50, 100];
  error: string | null = null;
  expanded = new Set<string>();

  constructor(
    private readonly admin: AdminService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef,
    private readonly i18n: TranslateService
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();

    const payload: {
      status?: string;
      rating?: number;
      product?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
    } = {
      page: this.page + 1,
      limit: this.pageSize
    };

    const raw = this.filterForm.value;
    if (raw.status) {
      payload.status = raw.status;
    }
    if (raw.rating) {
      payload.rating = Number(raw.rating);
    }
    const product = (raw.product || '').toString().trim();
    if (product) {
      payload.product = product;
    }

    const start = raw.range?.start ? new Date(raw.range.start) : null;
    const end = raw.range?.end ? new Date(raw.range.end) : null;
    if (start) {
      payload.from = start.toISOString();
    }
    if (end) {
      payload.to = end.toISOString();
    }

    this.admin.listReviews(payload).subscribe({
      next: (res: ReviewListResponse) => {
        this.reviews = res.items || [];
        this.total = res.total || 0;
        this.page = (res.page || 1) - 1;
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        this.error = code ? this.i18n.instant(`errors.backend.${code}`) : this.i18n.instant('reviews.errors.loadFailed');
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  applyFilters(): void {
    this.page = 0;
    this.load();
  }

  resetFilters(): void {
    this.filterForm.reset({
      status: '',
      rating: '',
      product: '',
      range: { start: null, end: null }
    });
    this.applyFilters();
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.page = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  reviewId(review: AdminReview): string {
    return review.id || review._id || '';
  }

  ratingArray(rating?: number): number[] {
    const value = Math.max(0, Math.min(5, Math.round(rating || 0)));
    return Array.from({ length: 5 }).map((_, index) => (index < value ? 1 : 0));
  }

  isFlagged(review: AdminReview): boolean {
    return !!(
      review.flagged ||
      review.reported ||
      (typeof review.flagsCount === 'number' && review.flagsCount > 0) ||
      (typeof review.reportsCount === 'number' && review.reportsCount > 0)
    );
  }

  toggleComment(review: AdminReview): void {
    const id = this.reviewId(review);
    if (!id) {
      return;
    }
    if (this.expanded.has(id)) {
      this.expanded.delete(id);
    } else {
      this.expanded.add(id);
    }
  }

  isExpanded(review: AdminReview): boolean {
    const id = this.reviewId(review);
    return id ? this.expanded.has(id) : false;
  }

  approve(review: AdminReview): void {
    const id = this.reviewId(review);
    if (!id) {
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.admin.approveReview(id).subscribe({
      next: () => {
        this.toast.success(this.i18n.instant('reviews.toasts.approved'));
        this.load();
      },
      error: () => {
        this.toast.error(this.i18n.instant('reviews.errors.approveFailed'));
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  reject(review: AdminReview): void {
    const id = this.reviewId(review);
    if (!id) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'reviews.confirm.rejectTitle',
        messageKey: 'reviews.confirm.reject',
        confirmKey: 'reviews.actions.reject'
      }
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.loading = true;
      this.cdr.markForCheck();
      this.admin.rejectReview(id).subscribe({
        next: () => {
          this.toast.success(this.i18n.instant('reviews.toasts.rejected'));
          this.load();
        },
        error: () => {
          this.toast.error(this.i18n.instant('reviews.errors.rejectFailed'));
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    });
  }

  remove(review: AdminReview): void {
    const id = this.reviewId(review);
    if (!id) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'reviews.confirm.deleteTitle',
        messageKey: 'reviews.confirm.delete',
        confirmKey: 'reviews.actions.delete'
      }
    });
    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.loading = true;
      this.cdr.markForCheck();
      this.admin.deleteReview(id).subscribe({
        next: () => {
          this.toast.success(this.i18n.instant('reviews.toasts.deleted'));
          this.load();
        },
        error: () => {
          this.toast.error(this.i18n.instant('reviews.errors.deleteFailed'));
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    });
  }
}
