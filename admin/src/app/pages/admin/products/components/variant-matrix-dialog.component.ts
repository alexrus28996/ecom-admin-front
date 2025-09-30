import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-variant-matrix-dialog',
  templateUrl: './variant-matrix-dialog.component.html',
  styleUrls: ['./variant-matrix-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VariantMatrixDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<VariantMatrixDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { productId: string }
  ) {}

  close(): void {
    this.dialogRef.close();
  }
}
