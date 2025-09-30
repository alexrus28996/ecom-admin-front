import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface AttributeFormValue {
  name: string;
  slug?: string;
  description?: string;
  isRequired?: boolean;
  sortOrder?: number;
}

@Component({
  selector: 'app-attribute-form-dialog',
  templateUrl: './attribute-form.dialog.html',
  styleUrls: ['./attribute-form.dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AttributeFormDialog {
  readonly form = this.fb.group({
    name: ['', Validators.required],
    slug: [''],
    description: [''],
    isRequired: [false],
    sortOrder: [0]
  });

  constructor(
    private readonly dialogRef: MatDialogRef<AttributeFormDialog>,
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) data: AttributeFormValue | null
  ) {
    if (data) {
      this.form.patchValue(data);
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.value as AttributeFormValue);
  }

  close(): void {
    this.dialogRef.close();
  }
}
