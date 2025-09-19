import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { UntypedFormControl, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { AdminService } from '../../services/admin.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { ToastService } from '../../core/toast.service';

@Component({ selector: 'app-admin-users', templateUrl: './admin-users.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class AdminUsersComponent {
  userId = new UntypedFormControl('', { nonNullable: true, validators: [Validators.required] });
  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  constructor(
    private readonly admin: AdminService,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  promote(): void {
    this.exec('adminUsers.roles.toasts.promoted', () => this.admin.promoteUser(this.userId.value));
  }

  demote(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'adminUsers.roles.confirm.title',
        messageKey: 'adminUsers.roles.confirm.message',
        confirmKey: 'adminUsers.roles.actions.demote'
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.exec('adminUsers.roles.toasts.demoted', () => this.admin.demoteUser(this.userId.value));
      }
    });
  }

  private exec(toastKey: string, fn: () => any): void {
    if (this.userId.invalid) {
      return;
    }

    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    fn().subscribe({
      next: (res: any) => {
        this.loading = false;
        this.toast.success(this.i18n.instant(toastKey, { email: res?.user?.email || res?.user?.id || '' }));
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.loading = false;
        this.lastError = err;
        this.errorKey = err?.error?.error?.code ? `errors.backend.${err.error.error.code}` : 'adminUsers.roles.errors.operationFailed';
        this.toast.error(this.i18n.instant('adminUsers.roles.errors.operationFailed'));
        this.cdr.markForCheck();
      }
    });
  }
}
