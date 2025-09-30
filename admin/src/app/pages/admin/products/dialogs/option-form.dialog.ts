import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface OptionFormValue {
  name: string;
  slug?: string;
  sortOrder?: number;
  metadata?: Record<string, string>;
}

@Component({
  selector: 'app-option-form-dialog',
  templateUrl: './option-form.dialog.html',
  styleUrls: ['./option-form.dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OptionFormDialog {
  readonly form = this.fb.group({
    name: ['', Validators.required],
    slug: [''],
    sortOrder: [0],
    metadata: ['']
  });

  constructor(
    private readonly dialogRef: MatDialogRef<OptionFormDialog>,
    private readonly fb: FormBuilder,
    @Inject(MAT_DIALOG_DATA) data: OptionFormValue | null
  ) {
    if (data) {
      this.form.patchValue({
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : ''
      });
    }
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { metadata, ...rest } = this.form.value;
    let parsed: Record<string, string> | undefined;
    if (metadata) {
      try {
        parsed = JSON.parse(metadata as string);
      } catch {
        parsed = undefined;
      }
    }
    this.dialogRef.close({ ...rest, metadata: parsed } as OptionFormValue);
  }

  close(): void {
    this.dialogRef.close();
  }
}
