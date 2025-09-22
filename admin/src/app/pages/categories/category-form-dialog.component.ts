import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';

import { Category, CategoryService } from '../../services/category.service';
import { ToastService } from '../../core/toast.service';

interface CategoryDialogData {
  category?: Category | null;
}

interface CategoryDialogResult {
  refresh?: boolean;
}

interface CategoryOption {
  id: string;
  label: string;
}

@Component({
  selector: 'app-category-form-dialog',
  templateUrl: './category-form-dialog.component.html',
  styleUrls: ['./category-form-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFormDialogComponent implements OnInit, OnDestroy {
  readonly form: UntypedFormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    slug: [
      '',
      [
        Validators.required,
        Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      ]
    ],
    parent: [''],
    description: ['']
  });

  parentOptions: CategoryOption[] = [];

  loading = false;
  saving = false;
  errorKey: string | null = null;
  lastError: unknown = null;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: UntypedFormBuilder,
    private readonly dialogRef: MatDialogRef<CategoryFormDialogComponent, CategoryDialogResult>,
    private readonly categories: CategoryService,
    private readonly toast: ToastService,
    private readonly translate: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    @Inject(MAT_DIALOG_DATA) public readonly data: CategoryDialogData
  ) {}

  ngOnInit(): void {
    const category = this.data?.category;
    if (category) {
      this.form.patchValue({
        name: category.name,
        slug: category.slug || '',
        parent: typeof category.parent === 'object' ? category.parent?._id || '' : category.parent || '',
        description: category.description || ''
      });
    }
    this.loadParents(category?._id || null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  submit(): void {
    if (this.saving) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      name: raw.name.trim(),
      slug: raw.slug.trim(),
      description: raw.description?.trim() || undefined,
      parent: raw.parent || null
    };

    this.saving = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    const request$ = this.data?.category?._id
      ? this.categories.update(this.data.category._id, payload)
      : this.categories.create(payload);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          const key = this.data?.category?._id ? 'categories.messages.updateSuccess' : 'categories.messages.saveSuccess';
          this.toast.success(this.translate.instant(key));
          this.saving = false;
          this.cdr.markForCheck();
          this.dialogRef.close({ refresh: true });
        },
        error: (err) => {
          const code = err?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'categories.errors.save';
          const messageKey = this.mapError(code);
          this.toast.error(this.translate.instant(messageKey));
          this.lastError = err;
          this.saving = false;
          this.cdr.markForCheck();
        }
      });
  }

  cancel(): void {
    this.dialogRef.close({ refresh: false });
  }

  trackById(_: number, option: CategoryOption): string {
    return option.id;
  }

  private loadParents(excludeId: string | null): void {
    this.loading = true;
    this.cdr.markForCheck();
    this.categories
      .list({ limit: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.parentOptions = (res.items || [])
            .filter((category) => !excludeId || category._id !== excludeId)
            .map((category) => ({ id: category._id, label: category.name }));
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.lastError = err;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private mapError(code: string | undefined): string {
    if (!code) {
      return 'categories.messages.saveError';
    }
    switch (code) {
      case 'CATEGORY_SLUG_EXISTS':
        return 'categories.messages.errors.duplicateSlug';
      case 'CATEGORY_VALIDATION_FAILED':
        return 'categories.messages.errors.validationFailed';
      default:
        return 'categories.messages.saveError';
    }
  }
}
