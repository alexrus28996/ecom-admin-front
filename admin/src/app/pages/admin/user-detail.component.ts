import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { EMPTY, Subject } from 'rxjs';
import { switchMap, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { UserPermissionsDialogComponent } from './permissions/user-permissions-dialog.component';
import { AdminUser, UserManagementService } from '../../services/user-management.service';

interface AdminUserDetail extends AdminUser {
  lastLoginAt?: string;
  isVerified?: boolean;
  updatedAt?: string;
}

@Component({
  selector: 'app-admin-user-detail',
  templateUrl: './user-detail.component.html',
  styleUrls: ['./user-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUserDetailComponent implements OnInit, OnDestroy {
  user: AdminUserDetail | null = null;
  loading = false;
  errorKey: string | null = null;
  statusLoading = false;
  roleLoading = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly users: UserManagementService,
    private readonly cdr: ChangeDetectorRef,
    private readonly toast: ToastService,
    private readonly dialog: MatDialog,
    private readonly i18n: TranslateService
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.router.navigate(['/admin/users']);
            return EMPTY;
          }
          this.loading = true;
          this.errorKey = null;
          this.cdr.markForCheck();
          return this.users.getUser(id);
        })
      )
      .subscribe({
        next: (user) => {
          this.user = user as AdminUserDetail;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (error) => {
          const code = error?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'adminUsers.detail.errors.loadFailed';
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  navigateBack(): void {
    this.router.navigate(['/admin/users']);
  }

  toggleActive(): void {
    if (!this.user || this.statusLoading) {
      return;
    }
    const newStatus = !this.user.isActive;
    this.statusLoading = true;
    this.cdr.markForCheck();
    this.users.updateUserStatus(this.user.id, newStatus).subscribe({
      next: (updated) => {
        this.user = { ...this.user!, ...updated };
        this.toast.success(
          this.i18n.instant(
            newStatus ? 'adminUsers.list.toasts.activated' : 'adminUsers.list.toasts.deactivated'
          )
        );
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        const key = code ? `errors.backend.${code}` : 'adminUsers.list.errors.updateStatus';
        this.toast.error(this.i18n.instant(key));
      },
      complete: () => {
        this.statusLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  promote(): void {
    if (!this.user || this.roleLoading || this.user.roles?.includes('admin')) {
      return;
    }
    this.roleLoading = true;
    this.cdr.markForCheck();
    this.users.promoteUser(this.user.id).subscribe({
      next: (updated) => {
        this.user = { ...this.user!, ...updated };
        this.toast.success(this.i18n.instant('adminUsers.permissions.toasts.promoted'));
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        const key = code ? `errors.backend.${code}` : 'adminUsers.list.errors.promoteFailed';
        this.toast.error(this.i18n.instant(key));
      },
      complete: () => {
        this.roleLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  demote(): void {
    if (!this.user || this.roleLoading || !this.user.roles?.includes('admin')) {
      return;
    }
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: this.isLastAdmin()
        ? {
            titleKey: 'adminUsers.permissions.confirm.demoteLastAdmin.title',
            messageKey: 'adminUsers.permissions.confirm.demoteLastAdmin.message',
            confirmKey: 'adminUsers.permissions.confirm.demoteLastAdmin.confirm',
          }
        : {
            titleKey: 'adminUsers.permissions.confirm.demote.title',
            messageKey: 'adminUsers.permissions.confirm.demote.message',
            confirmKey: 'adminUsers.permissions.actions.demote',
          },
    });
    dialogRef.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.roleLoading = true;
      this.cdr.markForCheck();
      this.users.demoteUser(this.user!.id).subscribe({
        next: (updated) => {
          this.user = { ...this.user!, ...updated };
          this.toast.success(this.i18n.instant('adminUsers.permissions.toasts.demoted'));
        },
        error: (error) => {
          const code = error?.error?.error?.code;
          const key = code ? `errors.backend.${code}` : 'adminUsers.list.errors.demoteFailed';
          this.toast.error(this.i18n.instant(key));
        },
        complete: () => {
          this.roleLoading = false;
          this.cdr.markForCheck();
        },
      });
    });
  }

  openPermissions(): void {
    if (!this.user) {
      return;
    }
    const ref = this.dialog.open(UserPermissionsDialogComponent, {
      width: '480px',
      maxWidth: '100vw',
      height: '100vh',
      position: { right: '0' },
      panelClass: 'permissions-drawer-panel',
      data: {
        user: { ...this.user },
        isLastAdmin: this.isLastAdmin(),
      },
    });
    ref.afterClosed().subscribe((result) => {
      if (result?.updated) {
        this.reloadUser();
      }
    });
  }

  private reloadUser(): void {
    if (!this.user?.id) {
      return;
    }
    this.users.getUser(this.user.id).subscribe({
      next: (user) => {
        this.user = user as AdminUserDetail;
        this.cdr.markForCheck();
      },
      error: () => {
        // keep silent refresh
      },
    });
  }

  isLastAdmin(): boolean {
    if (!this.user?.roles?.includes('admin')) {
      return false;
    }
    // Detail page only knows about this user, so treat them as last admin if flagged in data.
    return this.user.roles.filter((role) => role === 'admin').length === (this.user.roles?.length || 0);
  }
}
