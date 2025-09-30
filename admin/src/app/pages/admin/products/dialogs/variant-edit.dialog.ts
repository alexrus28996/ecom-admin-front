import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
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
  readonly form = this.fb.group({
    sku: [''],
    priceOverride: [null],
    priceDelta: [null],
    stock: [null],
    isActive: [true]
  });

  constructor(
    private readonly dialogRef: MatDialogRef<VariantEditDialog>,
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) data: VariantEditFormValue | null
  ) {
    if (data) {
      this.form.patchValue(data);
    }
  }

  save(): void {
    this.dialogRef.close(this.form.value as VariantEditFormValue);
  }

  close(): void {
    this.dialogRef.close();
  }
}
