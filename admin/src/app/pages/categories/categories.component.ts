import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { Category, CategoryService } from '../../services/category.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { CategoryFormDialogComponent } from './category-form-dialog.component';
import { CategoryReorderDialogComponent } from './category-reorder-dialog.component';
import { PermissionsService } from '../../core/permissions.service';

interface CategoryOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-categories',
  templateUrl: './categories.component.html',
  styleUrls: ['./categories.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoriesComponent implements OnInit, OnDestroy {
  readonly filterForm: UntypedFormGroup = this.fb.group({
    q: [''],
    parent: ['']
  });

  displayedColumns: string[] = ['name', 'slug', 'parent', 'actions'];

  dataSource: Category[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 20;
  readonly pageSizeOptions = [10, 20, 50];

  parents: CategoryOption[] = [];

  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  private readonly destroy$ = new Subject<void>();

  readonly categoryPermissions$ = combineLatest({
    create: this.permissions.can$('category:create'),
    update: this.permissions.can$('category:edit'),
    delete: this.permissions.can$('category:delete'),
    reorder: this.permissions.can$('category:edit')
  });

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly categories: CategoryService,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.loadParents();
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    const { q, parent } = this.filterForm.value;
    const params = {
      q: q?.trim() || undefined,
      parent: parent === '' ? undefined : parent,
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    this.categories
      .list(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.dataSource = res.data || res.items || [];
          this.total = res.pagination?.total || res.total || 0;
          this.pageIndex = Math.max((res.pagination?.page || res.page || 1) - 1, 0);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'categories.errors.load';
          this.lastError = err;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onSubmit(): void {
    this.pageIndex = 0;
    this.load();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  openCreate(): void {
    if (!this.permissions.can('category:create')) {
      return;
    }
    this.dialog
      .open(CategoryFormDialogComponent, {
        width: '480px'
      })
      .afterClosed()
      .subscribe((res) => {
        if (res?.refresh) {
          this.loadParents();
          this.load();
        }
      });
  }

  openEdit(category: Category): void {
    if (!this.permissions.can('category:edit')) {
      return;
    }
    this.dialog
      .open(CategoryFormDialogComponent, {
        width: '480px',
        data: { category }
      })
      .afterClosed()
      .subscribe((res) => {
        if (res?.refresh) {
          this.loadParents();
          this.load();
        }
      });
  }

  openReorder(category: Category): void {
    if (!this.permissions.can('category:edit')) {
      return;
    }
    this.dialog
      .open(CategoryReorderDialogComponent, {
        width: '420px',
        data: { id: category._id, name: category.name }
      })
      .afterClosed()
      .subscribe((res) => {
        if (res?.refresh) {
          this.load();
        }
      });
  }

  confirmDelete(category: Category): void {
    if (!this.permissions.can('category:delete')) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'categories.delete.title',
        messageKey: 'categories.delete.message',
        messageParams: { name: category.name },
        confirmKey: 'categories.delete.confirm'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.delete(category);
      }
    });
  }

  delete(category: Category): void {
    if (!category?._id) {
      return;
    }

    if (!this.permissions.can('category:delete')) {
      return;
    }

    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.categories
      .delete(category._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success(this.translate.instant('categories.messages.deleteSuccess'));
          this.loadParents();
          this.load();
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'categories.errors.delete';
          this.lastError = err;
          this.loading = false;
          const messageKey = this.mapDeleteError(code);
          this.toast.error(this.translate.instant(messageKey));
          this.cdr.markForCheck();
        }
      });
  }

  parentLabel(category: Category): string {
    if (!category?.parent) {
      return this.translate.instant('categories.table.root');
    }
    if (typeof category.parent === 'object' && category.parent.name) {
      return category.parent.name;
    }
    const id = typeof category.parent === 'string' ? category.parent : category.parent?._id;
    if (!id) {
      return this.translate.instant('categories.table.root');
    }
    const match = this.parents.find((option) => option.id === id);
    return match ? match.name : this.translate.instant('categories.table.root');
  }

  trackById(_: number, category: Category): string {
    return category._id;
  }

  private loadParents(): void {
    this.categories
      .list({ limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.parents = (res.data || res.items || []).map((item) => ({ id: item._id, name: item.name }));
          this.cdr.markForCheck();
        },
        error: () => {
          // TODO: Provide bulk category import once backend endpoints are available.
        }
      });
  }

  private mapDeleteError(code: string | undefined): string {
    if (!code) {
      return 'categories.messages.deleteError';
    }
    switch (code) {
      case 'CATEGORY_IN_USE':
        return 'categories.messages.errors.inUse';
      default:
        return 'categories.messages.deleteError';
    }
  }
}
