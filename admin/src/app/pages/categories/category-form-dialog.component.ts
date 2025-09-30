import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatChipInputEvent } from '@angular/material/chips';
import { Subject } from 'rxjs';
import { finalize, takeUntil } from 'rxjs/operators';

import { ToastService } from '../../core/toast.service';
import { UploadService } from '../../services/upload.service';
import { AdminCategory, CategoryPayload, CategoryService } from '../../services/category.service';
import { CategoryFormDialogData } from './category.models';

interface CategoryFormDialogResult {
  refresh?: boolean;
}

@Component({
  selector: 'app-category-form-dialog',
  templateUrl: './category-form-dialog.component.html',
  styleUrls: ['./category-form-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CategoryFormDialogComponent implements OnDestroy {
  readonly separatorKeysCodes = [ENTER, COMMA];
  readonly keywordInput = new FormControl('');

  readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    parent: [null],
    description: [''],
    isActive: [true],
    imageUrl: [''],
    bannerUrl: [''],
    iconUrl: [''],
    metaTitle: ['', [Validators.maxLength(180)]],
    metaDescription: ['', [Validators.maxLength(320)]],
    metaKeywords: this.fb.control<string[]>([])
  });

  isSaving = false;
  uploadState: Record<'imageUrl' | 'bannerUrl' | 'iconUrl', boolean> = {
    imageUrl: false,
    bannerUrl: false,
    iconUrl: false
  };

  private slugManuallyEdited = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<CategoryFormDialogComponent, CategoryFormDialogResult>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CategoryFormDialogData,
    private readonly categories: CategoryService,
    private readonly uploadService: UploadService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.initializeForm();
    this.observeNameChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get metaKeywords(): string[] {
    return this.form.get('metaKeywords')?.value || [];
  }

  get parents() {
    return this.data.parents;
  }

  get isEdit(): boolean {
    return this.data.mode === 'edit' && !!this.data.category;
  }

  save(): void {
    if (this.form.invalid || this.isSaving) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    const request$ = this.isEdit && this.data.category
      ? this.categories.update(this.data.category._id, payload)
      : this.categories.create(payload);

    this.isSaving = true;
    request$
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isSaving = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: () => {
          this.toast.success(this.isEdit ? 'Category updated' : 'Category created');
          this.dialogRef.close({ refresh: true });
        },
        error: (error) => {
          console.error(error);
          this.toast.error('Unable to save category');
        }
      });
  }

  cancel(): void {
    this.dialogRef.close({ refresh: false });
  }

  onSlugInput(): void {
    this.slugManuallyEdited = true;
  }

  addKeyword(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();
    if (!value) {
      event.chipInput?.clear();
      this.keywordInput.setValue('');
      return;
    }
    const normalized = value.toLowerCase();
    const keywords = new Set(this.metaKeywords.map((keyword) => keyword.toLowerCase()));
    if (!keywords.has(normalized)) {
      const updated = [...this.metaKeywords, value];
      this.form.get('metaKeywords')?.setValue(updated);
    }
    event.chipInput?.clear();
    this.keywordInput.setValue('');
  }

  removeKeyword(keyword: string): void {
    const updated = this.metaKeywords.filter((existing) => existing !== keyword);
    this.form.get('metaKeywords')?.setValue(updated);
  }

  uploadImage(field: 'imageUrl' | 'bannerUrl' | 'iconUrl', event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }
    this.uploadState[field] = true;
    this.uploadService
      .upload(file)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.uploadState[field] = false;
          this.cdr.markForCheck();
        })
      )
      .subscribe({
        next: (result) => {
          this.form.get(field)?.setValue(result.url);
          this.toast.success('File uploaded');
          this.cdr.markForCheck();
        },
        error: () => {
          this.toast.error('Upload failed');
          this.cdr.markForCheck();
        }
      });
  }

  clearMedia(field: 'imageUrl' | 'bannerUrl' | 'iconUrl'): void {
    this.form.get(field)?.setValue('');
  }

  private initializeForm(): void {
    if (this.isEdit && this.data.category) {
      const category = this.data.category as AdminCategory;
      this.form.patchValue({
        name: category.name,
        slug: category.slug,
        parent: typeof category.parent === 'string' ? category.parent : category.parent?._id ?? null,
        description: category.description ?? '',
        isActive: category.isActive !== false,
        imageUrl: (category as any).imageUrl ?? (category as any).image ?? '',
        bannerUrl: (category as any).bannerUrl ?? '',
        iconUrl: (category as any).iconUrl ?? '',
        metaTitle: category.metaTitle ?? '',
        metaDescription: category.metaDescription ?? '',
        metaKeywords: Array.isArray(category.metaKeywords) ? category.metaKeywords : []
      });
      this.slugManuallyEdited = true;
    }
  }

  private observeNameChanges(): void {
    this.form
      .get('name')
      ?.valueChanges.pipe(takeUntil(this.destroy$))
      .subscribe((value) => {
        if (!this.slugManuallyEdited) {
          const slug = this.generateSlug(value ?? '');
          this.form.get('slug')?.setValue(slug, { emitEvent: false });
        }
      });
  }

  private generateSlug(value: string): string {
    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 120);
  }

  private buildPayload(): CategoryPayload & { name: string } {
    const raw = this.form.value;
    const payload: CategoryPayload & { name: string } = {
      name: (raw.name || '').trim(),
      slug: raw.slug ? raw.slug.trim() : undefined,
      parent: raw.parent || null,
      description: raw.description?.trim() || null,
      isActive: raw.isActive,
      imageUrl: raw.imageUrl || null,
      bannerUrl: raw.bannerUrl || null,
      iconUrl: raw.iconUrl || null,
      metaTitle: raw.metaTitle?.trim() || null,
      metaDescription: raw.metaDescription?.trim() || null,
      metaKeywords: Array.isArray(raw.metaKeywords)
        ? raw.metaKeywords
            .map((keyword: string) => keyword.trim())
            .filter((keyword: string) => !!keyword)
        : undefined
    };

    if (!payload.slug) {
      delete payload.slug;
    }
    if (!payload.description) {
      delete payload.description;
    }
    if (!payload.metaTitle) {
      delete payload.metaTitle;
    }
    if (!payload.metaDescription) {
      delete payload.metaDescription;
    }
    if (!payload.metaKeywords || payload.metaKeywords.length === 0) {
      delete payload.metaKeywords;
    }
    if (!payload.imageUrl) {
      delete payload.imageUrl;
    }
    if (!payload.bannerUrl) {
      delete payload.bannerUrl;
    }
    if (!payload.iconUrl) {
      delete payload.iconUrl;
    }

    return payload;
  }
}
