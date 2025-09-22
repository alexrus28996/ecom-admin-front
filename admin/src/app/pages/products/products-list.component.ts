import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Subject, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ProductsService, ProductSummary } from '../../services/products.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { AdminService } from '../../services/admin.service';
import { ProductVariantsDialogComponent } from './product-variants-dialog.component';

interface CategoryOption {
  id: string;
  name: string;
}

@Component({
  selector: 'app-products-list',
  templateUrl: './products-list.component.html',
  styleUrls: ['./products-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductsListComponent implements OnInit, OnDestroy {
  readonly filterForm = this.fb.group({
    q: [''],
    category: [''],
    priceMin: [''],
    priceMax: ['']
  });

  displayedColumns: string[] = ['name', 'sku', 'price', 'brand', 'categories', 'createdAt', 'actions'];
  dataSource: ProductSummary[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50, 100];

  readonly skeletonRows = Array.from({ length: 6 });

  categories: CategoryOption[] = [];

  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly products: ProductsService,
    public readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    public readonly translate: TranslateService,
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
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

    const { q, category, priceMin, priceMax } = this.filterForm.value;
    const params = {
      q: q?.trim() || undefined,
      category: category || undefined,
      priceMin: this.parsePrice(priceMin),
      priceMax: this.parsePrice(priceMax),
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    this.products
      .list(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.dataSource = res.items;
          this.total = res.total;
          this.pageIndex = res.page - 1;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.lastError = err;
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'products.errorLoad';
          this.loading = false;
          this.toast.error(this.translate.instant('products.errorLoad'));
          this.cdr.markForCheck();
        }
      });
  }

  onSubmit(): void {
    this.pageIndex = 0;
    this.load();
  }

  onPageChange(event: PageEvent): void {
    if (this.pageSize !== event.pageSize) {
      this.pageSize = event.pageSize;
      this.pageIndex = event.pageIndex;
    } else {
      this.pageIndex = event.pageIndex;
    }
    this.load();
  }

  confirmDelete(product: ProductSummary): void {
    if (!product?._id) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titleKey: 'products.delete.title',
        messageKey: 'products.delete.message',
        messageParams: { name: product.name },
        confirmKey: 'products.delete.confirm'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.delete(product);
      }
    });
  }

  manageVariants(product: ProductSummary): void {
    if (!product?._id) {
      return;
    }

    this.dialog
      .open(ProductVariantsDialogComponent, {
        width: '800px',
        maxHeight: '90vh',
        data: { id: product._id }
      })
      .afterClosed()
      .subscribe((changed) => {
        if (changed) {
          this.load();
        }
      });
  }

  private delete(product: ProductSummary): void {
    if (!product?._id) {
      return;
    }

    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.products
      .remove(product._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success(this.translate.instant('products.deleteSuccess'));
          this.load();
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'products.errors.delete';
          this.lastError = err;
          this.loading = false;
          const messageKey = this.mapProductError(code, 'products.messages.deleteError');
          this.toast.error(this.translate.instant(messageKey));
          this.cdr.markForCheck();
        }
      });
  }

  trackById(_: number, item: ProductSummary): string | undefined {
    return item._id;
  }

  private parsePrice(value: string | number | null | undefined): number | undefined {
    if (value === null || value === undefined || value === '') {
      return undefined;
    }
    const parsed = Number(value);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  brandName(product: ProductSummary): string {
    return product?.brand?.name || this.translate.instant('common.empty');
  }

  categoryNames(product: ProductSummary): string {
    const ids = new Set<string>();
    const labels: string[] = [];
    const fromSummary = Array.isArray(product.categories) ? product.categories : [];
    fromSummary.forEach((category) => {
      if (category?._id && !ids.has(category._id)) {
        ids.add(category._id);
        labels.push(category.name);
      }
    });

    const fallback = this.mapCategoryIdToName(product.category);
    if (fallback) {
      labels.push(fallback);
    }

    return labels.length ? labels.join(', ') : this.translate.instant('common.empty');
  }

  private mapCategoryIdToName(category: string | { _id?: string; name?: string } | null | undefined): string | null {
    if (!category) return null;
    if (typeof category === 'object' && category.name) {
      return category.name;
    }
    const id = typeof category === 'object' ? category._id : category;
    if (!id) return null;
    const match = this.categories.find((c) => c.id === id);
    return match ? match.name : null;
  }

  private mapProductError(code: string | null | undefined, fallback: string): string {
    if (!code) {
      return fallback;
    }
    switch (code) {
      case 'PRODUCT_SKU_EXISTS':
        return 'products.messages.errors.duplicateSku';
      case 'PRODUCT_VALIDATION_FAILED':
        return 'products.messages.errors.validationFailed';
      default:
        return fallback;
    }
  }

  private loadCategories(): void {
    this.adminService
      .listCategories({ limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.categories = res.items.map((category: any) => ({ id: category._id, name: category.name }));
          this.cdr.markForCheck();
        },
        error: () => {
          // TODO: Surface category load issues once bulk import flows are in place.
        }
      });
  }
}
