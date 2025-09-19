import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { TranslateService } from '@ngx-translate/core';
import { ProductsService, Product } from '../../services/products.service';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../core/auth.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { AdminService } from '../../services/admin.service';

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
export class ProductsListComponent implements OnInit {
  readonly filterForm = this.fb.group({
    q: [''],
    category: ['']
  });

  displayedColumns: string[] = ['name', 'price', 'stock', 'status', 'actions'];
  dataSource: Product[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  readonly pageSizeOptions = [10, 25, 50, 100];

  categories: CategoryOption[] = [];

  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  constructor(
    private readonly products: ProductsService,
    private readonly cart: CartService,
    public readonly auth: AuthService,
    private readonly fb: FormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly adminService: AdminService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    const { q, category } = this.filterForm.value;
    const params = {
      q: q?.trim() || undefined,
      category: category || undefined,
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    this.products.list(params).subscribe({
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
        this.errorKey = code ? `errors.backend.${code}` : 'products.list.errors.loadFailed';
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
    if (this.pageSize !== event.pageSize) {
      this.pageSize = event.pageSize;
      this.pageIndex = event.pageIndex;
    } else {
      this.pageIndex = event.pageIndex;
    }
    this.load();
  }

  addToCart(product: Product): void {
    if (!product?._id) {
      return;
    }
    this.cart.addItem(product._id, 1).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('products.list.toasts.addedToCart', { name: product.name }));
      },
      error: () => {
        this.toast.error(this.translate.instant('products.list.errors.addToCart'));
      }
    });
  }

  confirmDelete(product: Product): void {
    if (!product?._id) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titleKey: 'products.list.delete.title',
        messageKey: 'products.list.delete.message',
        messageParams: { name: product.name },
        confirmKey: 'products.list.delete.confirm'
      }
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (confirmed) {
        this.delete(product);
      }
    });
  }

  private delete(product: Product): void {
    if (!product?._id) {
      return;
    }

    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.products.delete(product._id).subscribe({
      next: () => {
        this.toast.success(this.translate.instant('products.list.toasts.deleted', { name: product.name }));
        this.load();
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'products.list.errors.deleteFailed';
        this.lastError = err;
        this.loading = false;
        this.toast.error(this.translate.instant('products.list.errors.deleteFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  trackById(_: number, item: Product): string | undefined {
    return item._id;
  }

  private loadCategories(): void {
    this.adminService.listCategories({ limit: 1000 }).subscribe({
      next: (res) => {
        this.categories = res.items.map((category: any) => ({ id: category._id, name: category.name }));
        this.cdr.markForCheck();
      },
      error: () => {
        // ignore category load errors for now
      }
    });
  }

  categoryName(category: string | { _id?: string } | null | undefined): string | null {
    if (!category) return null;
    const id = typeof category === 'object' ? category._id : category;
    if (!id) return null;
    const match = this.categories.find((c) => c.id === id);
    return match ? match.name : null;
  }

  variantSummary(product: Product) {
    const variants = product.variants || [];
    let variantStock = 0;
    let active = 0;
    variants.forEach((variant) => {
      const stock = Number(variant?.stock);
      if (!Number.isNaN(stock)) {
        variantStock += stock;
      }
      if (variant?.isActive) {
        active += 1;
      }
    });
    const baseStock = Number(product.stock);
    return {
      totalVariants: variants.length,
      activeVariants: active,
      totalStock: (Number.isNaN(baseStock) ? 0 : baseStock) + variantStock
    };
  }
}
