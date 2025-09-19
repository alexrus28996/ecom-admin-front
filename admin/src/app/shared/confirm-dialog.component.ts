import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

export interface ConfirmDialogData {
  titleKey?: string;
  messageKey?: string;
  messageParams?: Record<string, any>;
  confirmKey?: string;
  cancelKey?: string;
}

@Component({
  selector: 'app-confirm-dialog',
  template: `
    <h2 mat-dialog-title>{{ (data.titleKey || 'common.confirm.title') | translate }}</h2>
    <mat-dialog-content>
      {{ (data.messageKey || 'common.confirm.message') | translate:(data.messageParams || {}) }}
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close="false">
        {{ (data.cancelKey || 'common.actions.cancel') | translate }}
      </button>
      <button mat-raised-button color="warn" [mat-dialog-close]="true">
        {{ (data.confirmKey || 'common.actions.confirm') | translate }}
      </button>
    </mat-dialog-actions>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
