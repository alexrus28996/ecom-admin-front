import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { Subject, combineLatest, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { tap } from 'rxjs/operators';
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

interface ProductPermissionState {
  create: boolean;
  update: boolean;
  delete: boolean;
  variants: boolean;
}

type ProductAction =
  | 'refresh'
  | 'import'
  | 'export'
  | 'create'
  | 'edit'
  | 'variants'
  | 'delete'
  | 'restore';

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
  bulkOperationInProgress = false;
  defaultProductImage = 'assets/images/product-placeholder.png';

  @ViewChild('importFileInput') importFileInput?: ElementRef<HTMLInputElement>;
  private currentPermissions: ProductPermissionState = { create: false, update: false, delete: false, variants: false };
  private permissionsLoaded = false;

  private readonly destroy$ = new Subject<void>();

  readonly productPermissions$ = combineLatest({
    create: this.permissions.can$('product:create'),
    update: this.permissions.can$('product:edit'),
    delete: this.permissions.can$('product:delete'),
    variants: this.permissions.can$('product:edit')
  }).pipe(
    tap((perms) => {
      this.currentPermissions = perms;
      this.permissionsLoaded = true;
    })
  );

  constructor(
    private readonly products: ProductsService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    public readonly translate: TranslateService,
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly permissions: PermissionsService,
    private readonly router: Router
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

  onAddProduct(): void {
    if (!this.ensurePermission(this.currentPermissions.create, 'products.permissions.createDenied')) {
      return;
    }
    this.router.navigate(['/admin/products/new']);
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
          const items = Array.isArray(res?.data)
            ? res.data
            : Array.isArray((res as any)?.items)
              ? (res as any).items
              : Array.isArray((res as any)?.data?.items)
                ? (res as any).data.items
                : [];

          this.dataSource = items;

          const pagination = (res as any)?.pagination ?? (res as any)?.data?.pagination ?? null;
          const resolvedTotal = pagination?.total ?? (res as any)?.total ?? (res as any)?.data?.total ?? items.length;
          const resolvedPage = pagination?.page ?? (res as any)?.page ?? (res as any)?.data?.page ?? 1;
          const resolvedLimit = pagination?.limit ?? (res as any)?.limit ?? (res as any)?.data?.limit;

          if (typeof resolvedLimit === 'number' && resolvedLimit > 0) {
            this.pageSize = resolvedLimit;
          }

          this.total = resolvedTotal;
          this.pageIndex = Math.max(resolvedPage - 1, 0);
          this.activeCount = items.filter((p: any) => p?.isActive).length;
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

    if (!this.ensurePermission(this.currentPermissions.delete, 'products.permissions.deleteDenied')) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titleKey: 'product:delete.title',
        messageKey: 'product:delete.message',
        messageParams: { name: product.name },
        confirmKey: 'product:delete.confirm'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.delete(product);
      }
    });
  }

  confirmRestore(product: ProductSummary): void {
    if (!product?._id) {
      return;
    }

    if (!this.ensurePermission(this.currentPermissions.delete, 'products.permissions.deleteDenied')) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titleKey: 'product:restore.title',
        messageKey: 'product:restore.message',
        messageParams: { name: product.name },
        confirmKey: 'product:restore.confirm'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.restore(product);
      }
    });
  }

  onEditProduct(product: ProductSummary): void {
    if (!product?._id) {
      return;
    }

    if (!this.ensurePermission(this.currentPermissions.update, 'products.permissions.editDenied')) {
      return;
    }

    this.router.navigate(['/admin/products', product._id, 'edit']);
  }

  manageVariants(product: ProductSummary): void {
    if (!product?._id) {
      return;
    }

    if (!this.ensurePermission(this.currentPermissions.variants, 'products.permissions.variantsDenied')) {
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
          this.toast.success(this.translate.instant('product:deleteSuccess'));
          this.load();
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'products.errors.delete';
          this.lastError = err;
          this.loading = false;
          const messageKey = this.mapProductError(code, 'products.messages.deleteError');
          this.toast.error(this.translate.instant(messageKey));
          if (err?.status === 403) {
            this.disablePermission('delete');
            this.toast.error(this.translate.instant('products.permissions.deleteDenied'));
          }
          this.cdr.markForCheck();
        }
      });
  }

  private restore(product: ProductSummary): void {
    if (!product?._id) {
      return;
    }

    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.products
      .restoreProduct(product._id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success(this.translate.instant('product:restoreSuccess'));
          this.load();
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'products.errors.restore';
          this.lastError = err;
          this.loading = false;
          const messageKey = this.mapProductError(code, 'products.messages.restoreError');
          this.toast.error(this.translate.instant(messageKey));
          if (err?.status === 403) {
            this.disablePermission('delete');
            this.toast.error(this.translate.instant('products.permissions.deleteDenied'));
          }
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
    const brand = (product as any)?.brand;
    if (brand && typeof brand === 'object' && (brand as any).name) {
      return (brand as any).name;
    }
    if (typeof brand === 'string' && brand.trim().length) {
      return brand.trim();
    }
    return this.translate.instant('common.empty');
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

  actionTooltipKey(
    action: ProductAction,
    perms: ProductPermissionState,
    product?: ProductSummary | null
  ): string | null {
    return this.resolveActionState(action, perms, product ?? undefined).reasonKey;
  }

  isActionDisabled(
    action: ProductAction,
    perms: ProductPermissionState,
    product?: ProductSummary | null
  ): boolean {
    return this.resolveActionState(action, perms, product ?? undefined).disabled;
  }

  onDisabledAction(
    event: Event,
    action: ProductAction,
    perms: ProductPermissionState,
    product?: ProductSummary | null
  ): void {
    const state = this.resolveActionState(action, perms, product ?? undefined);
    if (!state.disabled || !state.reasonKey) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    this.toast.show(this.translate.instant(state.reasonKey), 'info');
  }

  private resolveActionState(
    action: ProductAction,
    perms: ProductPermissionState,
    product?: ProductSummary
  ): { disabled: boolean; reasonKey: string | null } {
    if (action === 'refresh') {
      return this.loading
        ? { disabled: true, reasonKey: 'products.actions.disabled.loading' }
        : { disabled: false, reasonKey: null };
    }

    if (!this.permissionsLoaded) {
      return { disabled: true, reasonKey: 'products.permissions.loading' };
    }

    if (this.loading) {
      return { disabled: true, reasonKey: 'products.actions.disabled.loading' };
    }

    if (!product?._id && ['edit', 'variants', 'delete', 'restore'].includes(action)) {
      return { disabled: true, reasonKey: 'products.actions.disabled.missingProduct' };
    }

    switch (action) {
      case 'create':
        if (!perms.create) {
          return { disabled: true, reasonKey: 'products.permissions.createDenied' };
        }
        break;
      case 'import':
        if (!perms.create) {
          return { disabled: true, reasonKey: 'products.permissions.importDenied' };
        }
        break;
      case 'export':
        if (!perms.update) {
          return { disabled: true, reasonKey: 'products.permissions.exportDenied' };
        }
        break;
      case 'edit':
        if (!perms.update) {
          return { disabled: true, reasonKey: 'products.permissions.editDenied' };
        }
        break;
      case 'variants':
        if (!perms.variants) {
          return { disabled: true, reasonKey: 'products.permissions.variantsDenied' };
        }
        break;
      case 'delete':
        if (this.isProductDeleted(product)) {
          return { disabled: true, reasonKey: 'products.actions.disabled.alreadyDeleted' };
        }
        if (this.bulkOperationInProgress) {
          return { disabled: true, reasonKey: 'products.actions.disabled.bulkOperation' };
        }
        if (!perms.delete) {
          return { disabled: true, reasonKey: 'products.permissions.deleteDenied' };
        }
        break;
      case 'restore':
        if (!this.isProductDeleted(product)) {
          return { disabled: true, reasonKey: 'products.actions.disabled.notDeleted' };
        }
        if (!perms.delete) {
          return { disabled: true, reasonKey: 'products.permissions.deleteDenied' };
        }
        break;
    }

    return { disabled: false, reasonKey: null };
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
    if (!this.ensurePermission(this.currentPermissions.update, 'products.permissions.editDenied')) {
      return;
    }
    this.executeBulkStatusUpdate(true);
  }

  bulkDeactivate(): void {
    if (!this.ensurePermission(this.currentPermissions.update, 'products.permissions.editDenied')) {
      return;
    }
    this.executeBulkStatusUpdate(false);
  }

  private executeBulkStatusUpdate(isActive: boolean): void {
    const productIds = Array.from(this.selectedProducts);
    if (productIds.length === 0) return;

    if (!this.ensurePermission(this.currentPermissions.update, 'products.permissions.editDenied')) {
      return;
    }

    this.bulkOperationInProgress = true;
    this.cdr.markForCheck();

    this.products.bulkUpdateStatus(productIds, isActive)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          const statusKey = isActive ? 'products.bulk.activated' : 'products.bulk.deactivated';
          if (result.updated > 0) {
            this.toast.success(this.translate.instant(statusKey, { count: result.updated }));
          }
          if (result.failures.length > 0) {
            this.toast.error(this.translate.instant('products.bulk.partialFailure', { count: result.failures.length }));
          }
          this.selectedProducts.clear();
          this.updateBulkActionsVisibility();
          this.load();
        },
        error: (err) => {
          this.toast.error(this.translate.instant('products.bulk.error'));
          if (err?.status === 403) {
            this.disablePermission('update');
            this.toast.error(this.translate.instant('products.permissions.editDenied'));
          }
        },
        complete: () => {
          this.bulkOperationInProgress = false;
          this.cdr.markForCheck();
        }
      });
  }

  bulkDelete(): void {
    if (!this.ensurePermission(this.currentPermissions.delete, 'products.permissions.deleteDenied')) {
      return;
    }

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

    if (!this.ensurePermission(this.currentPermissions.delete, 'products.permissions.deleteDenied')) {
      return;
    }

    this.bulkOperationInProgress = true;
    this.cdr.markForCheck();

    this.products
      .bulkDelete(productIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.deleted > 0) {
            this.toast.success(this.translate.instant('products.bulk.deleted', { count: result.deleted }));
          }
          if (result.failures.length > 0) {
            this.toast.error(this.translate.instant('products.bulk.partialFailure', { count: result.failures.length }));
          }
          this.selectedProducts.clear();
          this.updateBulkActionsVisibility();
          this.load();
        },
        error: (err) => {
          this.toast.error(this.translate.instant('products.bulk.deleteError'));
          if (err?.status === 403) {
            this.disablePermission('delete');
            this.toast.error(this.translate.instant('products.permissions.deleteDenied'));
          }
        },
        complete: () => {
          this.bulkOperationInProgress = false;
          this.cdr.markForCheck();
        }
      });
  }

  // Import/Export Functions
  onImportClick(): void {
    if (!this.ensurePermission(this.currentPermissions.create, 'products.permissions.importDenied')) {
      return;
    }

    const input = this.importFileInput?.nativeElement;
    if (!input) {
      return;
    }

    input.value = '';
    input.click();
  }

  handleFileImport(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];

    if (!this.ensurePermission(this.currentPermissions.create, 'products.permissions.importDenied')) {
      if (input) {
        input.value = '';
      }
      return;
    }

    if (!file) {
      if (input) {
        input.value = '';
      }
      return;
    }

    const extension = file.name?.split('.').pop()?.toLowerCase();
    if (extension && !['json', 'csv'].includes(extension)) {
      this.toast.error(this.translate.instant('products.import.invalidFormat'));
      if (input) {
        input.value = '';
      }
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    this.products
      .importProductsFile(file)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (result) => {
          if (result.inserted > 0) {
            const message = this.translate.instant('products.import.success', {
              inserted: result.inserted,
              failed: result.failed
            });
            this.toast.success(message);
          }
          if (result.failed > 0) {
            this.toast.error(this.translate.instant('products.import.partialFailure', { count: result.failed }));
          }
          this.load();
        },
        error: (err) => {
          if (err?.status === 403) {
            this.disablePermission('create');
            this.toast.error(this.translate.instant('products.permissions.importDenied'));
          } else {
            this.toast.error(this.translate.instant('products.import.error'));
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        complete: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });

    if (input) {
      input.value = '';
    }
  }

  startExport(format: 'json' | 'csv'): void {
    if (!this.ensurePermission(this.currentPermissions.update, 'products.permissions.exportDenied')) {
      return;
    }
    this.exportProducts(format);
  }

  private exportProducts(format: 'json' | 'csv'): void {
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
        },
        error: (err) => {
          if (err?.status === 403) {
            this.disablePermission('update');
            this.toast.error(this.translate.instant('products.permissions.exportDenied'));
          } else {
            this.toast.error(this.translate.instant('products.export.error'));
          }
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
      case 'PRODUCT_NOT_DELETED':
      case 'PRODUCT_NOT_SOFT_DELETED':
        return 'products.messages.errors.notDeleted';
      default:
        return fallback;
    }
  }

  private ensurePermission(permission: boolean | undefined, translationKey: string): boolean {
    if (!this.permissionsLoaded) {
      this.toast.show(this.translate.instant('products.permissions.loading'), 'info');
      return false;
    }

    if (permission) {
      return true;
    }

    this.toast.show(this.translate.instant(translationKey), 'info');
    return false;
  }

  private disablePermission(key: keyof ProductPermissionState): void {
    this.currentPermissions = {
      ...this.currentPermissions,
      [key]: false
    };
    this.cdr.markForCheck();
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

  isProductDeleted(product: ProductSummary | null | undefined): boolean {
    if (!product) {
      return false;
    }
    const deletedAt = (product as any)?.deletedAt;
    if (deletedAt) {
      return true;
    }
    if ((product as any)?.isDeleted === true) {
      return true;
    }
    const status = (product as any)?.status;
    if (typeof status === 'string') {
      const normalized = status.toLowerCase();
      if (normalized === 'deleted' || normalized === 'archived') {
        return true;
      }
    }
    return false;
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

