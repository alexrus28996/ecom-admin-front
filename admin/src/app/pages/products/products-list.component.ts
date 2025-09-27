import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { ProductsService, ProductSummary } from '../../services/products.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { AdminService } from '../../services/admin.service';
import { ProductVariantsDialogComponent } from './product-variants-dialog.component';
import { PermissionsService } from '../../core/permissions.service';
import { environment } from '../../../environments/environment';

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
    priceMax: [''],
    status: ['']
  });

  displayedColumns: string[] = ['select', 'name', 'price', 'brand', 'categories', 'stock', 'actions'];
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
  showAdvancedFilters = false;
  activeCount = 0;

  // Bulk operations
  selectedProducts = new Set<string>();
  bulkActionsVisible = false;
  showImportDialog = false;
  showExportDialog = false;
  bulkOperationInProgress = false;
  defaultProductImage = 'assets/images/product-placeholder.png';

  private readonly destroy$ = new Subject<void>();

  readonly productPermissions$ = combineLatest({
    create: this.permissions.can$('products.create'),
    update: this.permissions.can$('products.update'),
    delete: this.permissions.can$('products.delete'),
    variants: this.permissions.can$('products.manageVariants')
  });

  constructor(
    private readonly products: ProductsService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    public readonly translate: TranslateService,
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly permissions: PermissionsService
  ) {}

  ngOnInit(): void {
    this.permissions
      .load()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cdr.markForCheck(),
        error: () => this.cdr.markForCheck()
      });
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

    const { q, category, priceMin, priceMax, status } = this.filterForm.value;
    const params = {
      q: q?.trim() || undefined,
      category: category || undefined,
      priceMin: this.parsePrice(priceMin),
      priceMax: this.parsePrice(priceMax),
      isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    this.products
      .list(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.dataSource = res.data || res.items || [];
          this.total = res.pagination?.total || res.total || 0;
          this.pageIndex = (res.pagination?.page || res.page || 1) - 1;
          this.activeCount = this.dataSource.filter(p => p.isActive).length;
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
    const fromSummary = Array.isArray((product as any).categories) ? (product as any).categories : [];
    fromSummary.forEach((category: any) => {
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

  // Bulk Selection Methods
  toggleAllSelection(): void {
    if (this.isAllSelected()) {
      this.selectedProducts.clear();
    } else {
      this.dataSource.forEach(product => {
        if (product._id) {
          this.selectedProducts.add(product._id);
        }
      });
    }
    this.updateBulkActionsVisibility();
  }

  toggleProductSelection(product: ProductSummary): void {
    if (!product._id) return;

    if (this.selectedProducts.has(product._id)) {
      this.selectedProducts.delete(product._id);
    } else {
      this.selectedProducts.add(product._id);
    }
    this.updateBulkActionsVisibility();
  }

  isAllSelected(): boolean {
    return this.dataSource.length > 0 &&
           this.dataSource.every(product => product._id && this.selectedProducts.has(product._id));
  }

  isProductSelected(product: ProductSummary): boolean {
    return product._id ? this.selectedProducts.has(product._id) : false;
  }

  private updateBulkActionsVisibility(): void {
    this.bulkActionsVisible = this.selectedProducts.size > 0;
    this.cdr.markForCheck();
  }

  // Bulk Operations
  bulkActivate(): void {
    this.executeBulkStatusUpdate(true);
  }

  bulkDeactivate(): void {
    this.executeBulkStatusUpdate(false);
  }

  private executeBulkStatusUpdate(isActive: boolean): void {
    const productIds = Array.from(this.selectedProducts);
    if (productIds.length === 0) return;

    this.bulkOperationInProgress = true;
    this.cdr.markForCheck();

    this.products.bulkUpdateStatus(productIds, isActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const statusKey = isActive ? 'products.bulk.activated' : 'products.bulk.deactivated';
          this.toast.success(this.translate.instant(statusKey, { count: result.modified }));
          this.selectedProducts.clear();
          this.updateBulkActionsVisibility();
          this.load();
        },
        error: (err) => {
          this.toast.error(this.translate.instant('products.bulk.error'));
          console.error('Bulk status update failed:', err);
        },
        complete: () => {
          this.bulkOperationInProgress = false;
          this.cdr.markForCheck();
        }
      });
  }

  bulkDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titleKey: 'products.bulk.delete.title',
        messageKey: 'products.bulk.delete.message',
        messageParams: { count: this.selectedProducts.size },
        confirmKey: 'products.bulk.delete.confirm'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.executeBulkDelete();
      }
    });
  }

  private executeBulkDelete(): void {
    const productIds = Array.from(this.selectedProducts);
    if (productIds.length === 0) return;

    this.bulkOperationInProgress = true;
    this.cdr.markForCheck();

    const deleteRequests = productIds.map(id => this.products.deleteProduct(id));

    combineLatest(deleteRequests)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success(this.translate.instant('products.bulk.deleted', { count: productIds.length }));
          this.selectedProducts.clear();
          this.updateBulkActionsVisibility();
          this.load();
        },
        error: (err) => {
          this.toast.error(this.translate.instant('products.bulk.deleteError'));
          console.error('Bulk delete failed:', err);
        },
        complete: () => {
          this.bulkOperationInProgress = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Import/Export Functions
  openImportDialog(): void {
    this.showImportDialog = true;
  }

  openExportDialog(): void {
    this.showExportDialog = true;
  }

  closeImportDialog(): void {
    this.showImportDialog = false;
  }

  closeExportDialog(): void {
    this.showExportDialog = false;
  }

  handleFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) return;

    if (file.type === 'application/json') {
      this.importFromJSON(file);
    } else if (file.type === 'text/csv') {
      this.importFromCSV(file);
    } else {
      this.toast.error(this.translate.instant('products.import.invalidFormat'));
    }
  }

  private importFromJSON(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const products = JSON.parse(e.target?.result as string);
        this.executeImport(products);
      } catch (error) {
        this.toast.error(this.translate.instant('products.import.invalidJSON'));
      }
    };
    reader.readAsText(file);
  }

  private importFromCSV(file: File): void {
    // CSV parsing would be implemented here
    // For now, show a message that CSV is not yet supported
    this.toast.info(this.translate.instant('products.import.csvNotSupported'));
  }

  private executeImport(products: Partial<Product>[]): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.products.importProducts(products)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const message = this.translate.instant('products.import.success', {
            inserted: result.inserted,
            failed: result.failed
          });
          this.toast.success(message);
          this.closeImportDialog();
          this.load();
        },
        error: (err) => {
          this.toast.error(this.translate.instant('products.import.error'));
          console.error('Import failed:', err);
        },
        complete: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  exportProducts(format: 'json' | 'csv'): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.products.exportProducts(format)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `products.${format}`;
          link.click();
          window.URL.revokeObjectURL(url);

          this.toast.success(this.translate.instant('products.export.success'));
          this.closeExportDialog();
        },
        error: (err) => {
          this.toast.error(this.translate.instant('products.export.error'));
          console.error('Export failed:', err);
        },
        complete: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  priceAmount(product: ProductSummary): number {
    const price = (product as any)?.price;
    if (typeof price === 'number') {
      return price;
    }
    if (price && typeof price === 'object') {
      const candidate = (price as any).amount ?? (price as any).price;
      const parsed = this.parsePrice(candidate as any);
      return parsed ?? 0;
    }
    const fallback = this.parsePrice(price as any);
    return fallback ?? 0;
  }

  priceCurrency(product: ProductSummary): string {
    const price = (product as any)?.price;
    if (price && typeof price === 'object' && typeof (price as any).currency === 'string' && (price as any).currency) {
      return (price as any).currency;
    }
    const currency = (product as any)?.currency;
    return typeof currency === 'string' && currency ? currency : 'USD';
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

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
    this.cdr.markForCheck();
  }

  clearFilters(): void {
    this.filterForm.patchValue({
      q: '',
      category: '',
      priceMin: '',
      priceMax: '',
      status: ''
    });
    this.onSubmit();
  }

  clearSearch(): void {
    this.filterForm.patchValue({ q: '' });
    this.onSubmit();
  }

  getProductImage(product: any): string {
    if (product.images && Array.isArray(product.images) && product.images.length > 0) {
      return product.images[0].url || this.defaultProductImage;
    }
    return this.defaultProductImage;
  }

  onImageError(event: any): void {
    event.target.src = this.defaultProductImage;
  }

  isLowStock(product: any): boolean {
    const stock = product.stock || 0;
    return stock > 0 && stock <= 10;
  }

  isOutOfStock(product: any): boolean {
    const stock = product.stock || 0;
    return stock <= 0;
  }

  getStockStatus(product: any): string {
    if (this.isOutOfStock(product)) {
      return 'products.stock.outOfStock';
    }
    if (this.isLowStock(product)) {
      return 'products.stock.lowStock';
    }
    return 'products.stock.inStock';
  }

  duplicateProduct(product: any): void {
    if (!product?._id) {
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    this.products
      .getById(product._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: ({ product: fullProduct }) => {
          const duplicateData: any = {
            ...fullProduct,
            name: `${fullProduct.name} (Copy)`,
            sku: fullProduct.sku ? `${fullProduct.sku}-copy` : '',
            isActive: false
          };
          delete duplicateData._id;
          delete duplicateData.createdAt;
          delete duplicateData.updatedAt;

          this.products
            .create(duplicateData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: () => {
                this.toast.success(this.translate.instant('products.duplicate.success'));
                this.load();
              },
              error: (err) => {
                this.loading = false;
                this.toast.error(this.translate.instant('products.duplicate.error'));
                this.cdr.markForCheck();
              }
            });
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(this.translate.instant('products.duplicate.error'));
          this.cdr.markForCheck();
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
}
