import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { Category, CategoryService } from '../../services/category.service';
import { ToastService } from '../../core/toast.service';

interface CategoryReorderDialogData {
  id: string;
  name: string;
}

interface CategoryReorderDialogResult {
  refresh?: boolean;
}

@Component({
  selector: 'app-category-reorder-dialog',
  templateUrl: './category-reorder-dialog.component.html',
  styleUrls: ['./category-reorder-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryReorderDialogComponent implements OnInit, OnDestroy {
  children: Category[] = [];
  loading = false;
  saving = false;
  errorKey: string | null = null;
  lastError: unknown = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly categories: CategoryService,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialogRef: MatDialogRef<CategoryReorderDialogComponent, CategoryReorderDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CategoryReorderDialogData
  ) {}

  ngOnInit(): void {
    this.loadChildren();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  drop(event: CdkDragDrop<Category[]>): void {
    moveItemInArray(this.children, event.previousIndex, event.currentIndex);
    this.cdr.markForCheck();
  }

  save(): void {
    if (this.saving) {
      return;
    }

    const ids = this.children.map((child) => child._id).filter(Boolean);

    this.saving = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.categories
      .reorderChildren(this.data.id, ids)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success(this.translate.instant('categories.messages.reorderSuccess'));
          this.saving = false;
          this.cdr.markForCheck();
          this.dialogRef.close({ refresh: true });
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'categories.errors.reorder';
          this.toast.error(this.translate.instant('categories.messages.reorderError'));
          this.lastError = err;
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
  }

  cancel(): void {
    this.dialogRef.close({ refresh: false });
  }

  trackById(_: number, category: Category): string {
    return category._id;
  }

  private loadChildren(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.categories
      .list({ parent: this.data.id, limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.children = res.items || [];
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'categories.errors.children';
          this.lastError = err;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }
}
