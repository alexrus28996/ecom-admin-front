import { ChangeDetectionStrategy, Component, Inject, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface VariantEditFormValue {
  sku?: string;
  priceOverride?: number;
  priceDelta?: number;
  stock?: number;
  isActive?: boolean;
}

@Component({
  selector: 'app-variant-edit-dialog',
  templateUrl: './variant-edit.dialog.html',
  styleUrls: ['./variant-edit.dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VariantEditDialog {
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    sku: this.fb.control('', { nonNullable: true }),
    priceOverride: this.fb.control<number | null>(null),
    priceDelta: this.fb.control<number | null>(null),
    stock: this.fb.control<number | null>(null),
    isActive: this.fb.control(true, { nonNullable: true })
  });

  constructor(
    private readonly dialogRef: MatDialogRef<VariantEditDialog>,
    @Inject(MAT_DIALOG_DATA) data: VariantEditFormValue | null
  ) {
    if (data) {
      this.form.patchValue({
        sku: data.sku ?? '',
        priceOverride: data.priceOverride ?? null,
        priceDelta: data.priceDelta ?? null,
        stock: data.stock ?? null,
        isActive: data.isActive ?? true
      });
    }
  }

  save(): void {
    const raw = this.form.getRawValue();
    const payload: VariantEditFormValue = {
      sku: raw.sku.trim() || undefined,
      priceOverride: raw.priceOverride ?? undefined,
      priceDelta: raw.priceDelta ?? undefined,
      stock: raw.stock ?? undefined,
      isActive: raw.isActive
    };

    this.dialogRef.close(payload);
  }

  close(): void {
    this.dialogRef.close();
  }
}
