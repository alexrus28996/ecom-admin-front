import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { SelectionModel } from '@angular/cdk/collections';
import { Subject, debounceTime, switchMap, takeUntil, tap } from 'rxjs';
import { CategoryService } from '../../../../services/category.service';
import { ToastService } from '../../../../core/toast.service';
import { PermissionsService } from '../../../../core/permissions.service';
import { AdminProductsService, ProductListResponse } from '../services/products.service';
import { Product } from '../models/product';
import { ProductsStore } from '../state/products.store';
import { ProductDeleteReferencesDialogComponent } from './product-delete-references-dialog.component';

interface CategoryOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-admin-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsListComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  private readonly fb = inject(FormBuilder);
  private readonly productsService = inject(AdminProductsService);
  private readonly store = inject(ProductsStore);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(PermissionsService);
  private readonly categoriesService = inject(CategoryService);

  readonly filtersForm = this.fb.group({
    q: [''],
    category: [''],
    status: [''],
    priceMin: [''],
    priceMax: ['']
  });

  readonly displayedColumns = ['select', 'image', 'name', 'sku', 'category', 'brand', 'price', 'status', 'updatedAt', 'actions'];
  readonly selection = new SelectionModel<Product>(true, [], true, (a, b) => a._id === b._id);

  products: Product[] = [];
  loading = false;
  total = 0;
  page = 1;
  limit = 20;
  categories: CategoryOption[] = [];
  permissionsState = {
    create: false,
    edit: false,
    delete: false
  };

  constructor() {
    this.selection.changed.pipe(takeUntil(this.destroy$)).subscribe(() => this.cdr.markForCheck());
  }

  ngOnInit(): void {
    this.permissions
      .can$('product:create')
      .pipe(takeUntil(this.destroy$))
      .subscribe(canCreate => {
        this.permissionsState.create = canCreate;
        this.cdr.markForCheck();
      });

    this.permissions
      .can$('product:edit')
      .pipe(takeUntil(this.destroy$))
      .subscribe(canEdit => {
        this.permissionsState.edit = canEdit;
        this.cdr.markForCheck();
      });

    this.permissions
      .can$('product:delete')
      .pipe(takeUntil(this.destroy$))
      .subscribe(canDelete => {
        this.permissionsState.delete = canDelete;
        this.cdr.markForCheck();
      });

    const initialFilters = this.store.snapshot();
    this.filtersForm.patchValue(
      {
        q: initialFilters.q ?? '',
        category: initialFilters.category ?? '',
        status: initialFilters.status ?? '',
        priceMin: initialFilters.priceMin?.toString() ?? '',
        priceMax: initialFilters.priceMax?.toString() ?? ''
      },
      { emitEvent: false }
    );

    this.filtersForm.valueChanges
      .pipe(
        debounceTime(300),
        tap(formValue => {
          const filters = {
            ...this.store.snapshot(),
            q: formValue.q ?? '',
            category: formValue.category ?? '',
            status: formValue.status ? (formValue.status as 'active' | 'inactive') : undefined,
            priceMin: this.parseNumber(formValue.priceMin),
            priceMax: this.parseNumber(formValue.priceMax),
            page: 1
          };
          this.store.updateFilters(filters);
        }),
        tap(() => {
          this.loading = true;
          this.cdr.markForCheck();
        }),
        switchMap(() => this.productsService.list(this.store.snapshot())),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: response => this.handleResponse(response),
        error: error => this.handleError(error)
      });

    this.refresh();

    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPageChange(pageIndex: number, pageSize: number): void {
    this.store.setPagination({ page: pageIndex + 1, limit: pageSize });
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.productsService
      .list(this.store.snapshot())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: response => this.handleResponse(response),
        error: error => this.handleError(error)
      });
  }

  createProduct(): void {
    if (!this.permissionsState.create) {
      this.toast.error('Missing permission: product:create');
      return;
    }
    this.router.navigate(['/admin/products/new']);
  }

  editProduct(product: Product): void {
    if (!this.permissionsState.edit) {
      this.toast.error('Missing permission: product:edit');
      return;
    }
    this.router.navigate(['/admin/products', product._id]);
  }

  viewProduct(product: Product): void {
    this.router.navigate(['/admin/products', product._id, 'view']);
  }

  deleteProduct(product: Product): void {
    if (!this.permissionsState.delete) {
      this.toast.error('Missing permission: product:delete');
      return;
    }

    const dialogRef = this.dialog.open(ProductDeleteReferencesDialogComponent, {
      width: '480px',
      data: { product }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result?.deleted) {
        this.toast.success('Product deleted');
        this.refresh();
      }
    });
  }

  toggleAll(checked: boolean): void {
    if (checked) {
      this.selection.select(...this.products);
    } else {
      this.selection.clear();
    }
  }

  toggle(product: Product): void {
    this.selection.toggle(product);
  }

  bulkCategoryAssign(categoryId: string): void {
    const ids = this.selection.selected.map(product => product._id);
    if (!ids.length || !categoryId) {
      return;
    }
    this.productsService.bulkCategoryAssign(categoryId, ids).subscribe({
      next: () => {
        this.toast.success('Category assigned');
        this.refresh();
      },
      error: () => this.toast.error('Failed to assign category')
    });
  }

  bulkPriceUpdate(percent: number): void {
    const ids = this.selection.selected.map(product => product._id);
    if (!ids.length || !percent) {
      return;
    }

    const filter = { productIds: ids } as any;
    this.productsService.bulkPriceUpdate(percent, filter).subscribe({
      next: () => {
        this.toast.success('Prices updated');
        this.refresh();
      },
      error: () => this.toast.error('Failed to update prices')
    });
  }

  exportCsv(): void {
    this.productsService.exportCsv(this.store.snapshot()).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'products.csv';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('Failed to export CSV')
    });
  }

  hasSelection(): boolean {
    return this.selection.selected.length > 0;
  }

  private handleResponse(response: ProductListResponse): void {
    this.products = response.items ?? [];
    this.total = response.total ?? this.products.length;
    this.page = response.page ?? 1;
    const snapshot = this.store.snapshot();
    this.limit = snapshot.limit ?? this.limit;
    this.loading = false;
    this.selection.clear();
    this.cdr.markForCheck();
  }

  private handleError(error: unknown): void {
    this.loading = false;
    this.toast.error('Failed to load products');
    this.cdr.markForCheck();
  }

  private loadCategories(): void {
    this.categoriesService
      .list({ limit: 100 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: result => {
          const items = (result?.items || result?.data || []) as any[];
          this.categories = items.map(item => ({ id: item._id || item.id, name: item.name }));
          this.cdr.markForCheck();
        },
        error: () => {
          this.categories = [];
          this.cdr.markForCheck();
        }
      });
  }

  private parseNumber(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
}

