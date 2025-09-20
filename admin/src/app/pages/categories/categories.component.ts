import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormArray, UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';
import { CategoryService, Brand } from '../../services/category.service';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

interface Category { _id: string; name: string; slug?: string; description?: string; parent?: string | null; }
interface Paginated<T> { items: T[]; total: number; page: number; pages: number; }

@Component({ selector: 'app-categories', templateUrl: './categories.component.html', styleUrls: ['./categories.component.scss'], changeDetection: ChangeDetectionStrategy.OnPush })
export class CategoriesComponent implements OnInit {
  readonly filterForm: UntypedFormGroup = this.fb.group({ q: [''], parent: [''] });

  displayedColumns: string[] = ['name', 'slug', 'parent', 'actions'];
  dataSource: Category[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 20;
  readonly pageSizeOptions = [10, 20, 50];

  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  readonly form: UntypedFormGroup = this.fb.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: [''],
    description: [''],
    parent: ['']
  });
  selectedId: string | null = null;
  children: Category[] = [];

  parentsOptions: Category[] = [];

  readonly brandFilterForm: UntypedFormGroup = this.fb.group({ q: [''] });
  readonly brandForm: UntypedFormGroup = this.fb.group({
    id: [''],
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: ['']
  });

  brandColumns: string[] = ['name', 'slug', 'actions'];
  brands: Brand[] = [];
  brandTotal = 0;
  brandPageIndex = 0;
  brandPageSize = 20;
  readonly brandPageSizeOptions = [10, 20, 50];
  brandLoading = false;
  brandErrorKey: string | null = null;
  brandLastError: any = null;

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly admin: AdminService,
    private readonly categoryService: CategoryService,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly t: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadParents();
    this.loadList();
    this.loadBrands();
  }

  loadParents(): void {
    this.admin.listCategories({ page: 1, limit: 1000 }).subscribe({
      next: (res: Paginated<Category>) => {
        this.parentsOptions = res.items;
        this.cdr.markForCheck();
      },
      error: () => {}
    });
  }

  loadBrands(): void {
    this.brandLoading = true;
    this.brandErrorKey = null;
    this.brandLastError = null;
    this.cdr.markForCheck();

    const q = this.brandFilterForm.value.q?.trim();
    this.categoryService
      .listBrands({ q: q || undefined, page: this.brandPageIndex + 1, limit: this.brandPageSize })
      .subscribe({
        next: (res) => {
          this.brands = res.items || [];
          this.brandTotal = res.total || 0;
          this.brandPageIndex = (res.page || 1) - 1;
          this.brandLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.brandLastError = err;
          const code = err?.error?.error?.code;
          this.brandErrorKey = code ? `errors.backend.${code}` : 'categories.brands.errors.loadFailed';
          this.brandLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onBrandSearch(): void {
    this.brandPageIndex = 0;
    this.loadBrands();
  }

  onBrandPage(event: PageEvent): void {
    this.brandPageIndex = event.pageIndex;
    this.brandPageSize = event.pageSize;
    this.loadBrands();
  }

  startNewBrand(): void {
    this.brandForm.reset({ id: '', name: '', slug: '' });
    this.cdr.markForCheck();
  }

  startBrandEdit(brand: Brand): void {
    this.brandForm.patchValue({ id: brand._id, name: brand.name, slug: brand.slug || '' });
    this.cdr.markForCheck();
  }

  saveBrand(): void {
    if (this.brandForm.invalid) {
      this.brandForm.markAllAsTouched();
      return;
    }

    const raw = this.brandForm.getRawValue();
    const payload = {
      name: (raw.name || '').trim(),
      slug: raw.slug?.trim() || undefined
    };

    if (raw.id) {
      this.categoryService.updateBrand(raw.id, payload).subscribe({
        next: () => {
          this.toast.success(this.t.instant('categories.brands.toasts.updated'));
          this.loadBrands();
        },
        error: () => this.toast.error(this.t.instant('categories.brands.errors.saveFailed'))
      });
    } else {
      this.categoryService.createBrand(payload).subscribe({
        next: () => {
          this.toast.success(this.t.instant('categories.brands.toasts.created'));
          this.startNewBrand();
          this.loadBrands();
        },
        error: () => this.toast.error(this.t.instant('categories.brands.errors.createFailed'))
      });
    }
  }

  confirmDeleteBrand(brand: Brand): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'categories.brands.delete.title',
        messageKey: 'categories.brands.delete.message',
        messageParams: { name: brand.name },
        confirmKey: 'categories.brands.delete.confirm'
      }
    });

    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.deleteBrand(brand);
      }
    });
  }

  private deleteBrand(brand: Brand): void {
    if (!brand?._id) {
      return;
    }

    this.brandLoading = true;
    this.brandErrorKey = null;
    this.brandLastError = null;
    this.cdr.markForCheck();

    this.categoryService.deleteBrand(brand._id).subscribe({
      next: () => {
        this.toast.success(this.t.instant('categories.brands.toasts.deleted'));
        this.loadBrands();
      },
      error: (err) => {
        this.brandLastError = err;
        const code = err?.error?.error?.code;
        this.brandErrorKey = code ? `errors.backend.${code}` : 'categories.brands.errors.deleteFailed';
        this.brandLoading = false;
        this.toast.error(this.t.instant('categories.brands.errors.deleteFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  loadList(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    const q = this.filterForm.value.q?.trim();
    const parent = this.filterForm.value.parent;
    const parentParam = parent === '' ? '' : parent;

    this.admin
      .listCategories({ q: q || undefined, page: this.pageIndex + 1, limit: this.pageSize, parent: parentParam as any })
      .subscribe({
        next: (res: Paginated<Category>) => {
          this.dataSource = res.items;
          this.total = res.total;
          this.pageIndex = res.page - 1;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.lastError = err;
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'categories.errors.loadFailed';
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onSubmit(): void {
    this.pageIndex = 0;
    this.loadList();
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadList();
  }

  startNew(): void {
    this.form.reset({ id: '', name: '', slug: '', description: '', parent: '' });
    this.selectedId = null;
    this.children = [];
    this.cdr.markForCheck();
  }

  startEdit(cat: Category): void {
    this.form.patchValue({ id: cat._id, name: cat.name, slug: cat.slug || '', description: cat.description || '', parent: cat.parent || '' });
    this.selectedId = cat._id;
    this.cdr.markForCheck();
    this.loadChildren();
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload = {
      name: (v.name || '').trim(),
      slug: v.slug || undefined,
      description: v.description || undefined,
      parent: v.parent === '' ? null : v.parent
    };

    if (v.id) {
      this.admin.updateCategory(v.id, payload).subscribe({
        next: () => {
          this.toast.success(this.t.instant('categories.toasts.saved'));
          this.loadList();
          this.loadChildren();
        },
        error: () => this.toast.error(this.t.instant('categories.errors.saveFailed'))
      });
    } else {
      this.admin.createCategory(payload).subscribe({
        next: () => {
          this.toast.success(this.t.instant('categories.toasts.created'));
          this.startNew();
          this.loadList();
        },
        error: () => this.toast.error(this.t.instant('categories.errors.createFailed'))
      });
    }
  }

  confirmDelete(cat: Category): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '380px',
      data: {
        titleKey: 'categories.delete.title',
        messageKey: 'categories.delete.message',
        messageParams: { name: cat.name },
        confirmKey: 'categories.delete.confirm'
      }
    });

    dialogRef.afterClosed().subscribe((ok) => {
      if (ok) {
        this.remove(cat);
      }
    });
  }

  private remove(cat: Category): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    this.admin.deleteCategory(cat._id).subscribe({
      next: () => {
        this.toast.success(this.t.instant('categories.toasts.deleted'));
        this.loadList();
        if (this.selectedId === cat._id) {
          this.startNew();
        }
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'categories.errors.deleteFailed';
        this.lastError = err;
        this.loading = false;
        this.toast.error(this.t.instant('categories.errors.deleteFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  loadChildren(): void {
    if (!this.selectedId) {
      this.children = [];
      return;
    }

    this.admin.listChildren(this.selectedId, { page: 1, limit: 1000 }).subscribe({
      next: (res: Paginated<Category>) => {
        this.children = res.items || [];
        this.cdr.markForCheck();
      },
      error: () => {
        this.children = [];
        this.cdr.markForCheck();
      }
    });
  }

  dropChild(event: CdkDragDrop<Category[]>): void {
    moveItemInArray(this.children, event.previousIndex, event.currentIndex);
    this.cdr.markForCheck();
  }

  saveOrder(): void {
    if (!this.selectedId) {
      return;
    }

    const ids = this.children.map((c) => c._id);
    this.admin.reorderChildren(this.selectedId, ids).subscribe({
      next: (res: any) => {
        this.toast.success(this.t.instant('categories.toasts.orderSaved'));
        this.children = res.items;
        this.cdr.markForCheck();
      },
      error: () => this.toast.error(this.t.instant('categories.errors.reorderFailed'))
    });
  }
}
