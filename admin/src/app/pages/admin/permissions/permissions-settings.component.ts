import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

import { AdminService } from '../../../services/admin.service';
import { PERMISSION_GROUPS, PermissionGroupDefinition } from '../../../services/permissions.constants';
import { ToastService } from '../../../core/toast.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';

@Component({
  selector: 'app-permissions-settings',
  templateUrl: './permissions-settings.component.html',
  styleUrls: ['./permissions-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PermissionsSettingsComponent implements OnInit {
  readonly groups = PERMISSION_GROUPS;
  readonly searchControl = new FormControl('');

  users: any[] = [];
  usersLoading = false;
  usersErrorKey: string | null = null;

  selectedUser: any | null = null;

  permissions = new Set<string>();
  originalPermissions = new Set<string>();
  permissionsLoading = false;
  permissionsErrorKey: string | null = null;

  savingPermissions = false;
  roleActionLoading = false;

  constructor(
    private readonly admin: AdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly toast: ToastService,
    private readonly dialog: MatDialog,
    private readonly destroyRef: DestroyRef,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.loadUsers((term || '').toString().trim());
      });

    this.loadUsers('');
  }

  trackByUserId(_: number, user: any): string {
    return user.id;
  }

  isSelected(user: any): boolean {
    return !!this.selectedUser && user?.id === this.selectedUser.id;
  }

  selectUser(user: any): void {
    if (!user || (this.selectedUser && this.selectedUser.id === user.id && !this.permissionsErrorKey)) {
      this.selectedUser = user;
      return;
    }

    this.selectedUser = user;
    this.permissions = new Set<string>();
    this.originalPermissions = new Set<string>();
    this.permissionsErrorKey = null;

    this.loadPermissions();
    this.cdr.markForCheck();
  }

  isGranted(permission: string): boolean {
    return this.permissions.has(permission);
  }

  togglePermission(permission: string, checked: boolean): void {
    if (!this.selectedUser || this.permissionsLoading || this.savingPermissions) {
      return;
    }

    if (checked) {
      this.permissions.add(permission);
    } else {
      this.permissions.delete(permission);
    }

    this.cdr.markForCheck();
  }

  toggleGroup(group: PermissionGroupDefinition, checked: boolean): void {
    group.permissions.forEach((permission) => this.togglePermission(permission.id, checked));
  }

  groupGrantedCount(group: PermissionGroupDefinition): number {
    return group.permissions.reduce((count, permission) => count + (this.permissions.has(permission.id) ? 1 : 0), 0);
  }

  groupFullyGranted(group: PermissionGroupDefinition): boolean {
    return group.permissions.every((permission) => this.permissions.has(permission.id));
  }

  groupPartiallyGranted(group: PermissionGroupDefinition): boolean {
    const granted = this.groupGrantedCount(group);
    return granted > 0 && granted < group.permissions.length;
  }

  selectAll(): void {
    if (!this.selectedUser || this.permissionsLoading || this.savingPermissions) {
      return;
    }
    this.groups.forEach((group) => group.permissions.forEach((permission) => this.permissions.add(permission.id)));
    this.cdr.markForCheck();
  }

  clearAll(): void {
    if (!this.selectedUser || this.permissionsLoading || this.savingPermissions) {
      return;
    }

    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'adminUsers.permissions.confirm.clearAll.title',
        messageKey: 'adminUsers.permissions.confirm.clearAll.message',
        confirmKey: 'adminUsers.permissions.confirm.clearAll.confirm'
      }
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.permissions.clear();
      this.cdr.markForCheck();
    });
  }

  resetChanges(): void {
    if (!this.selectedUser) {
      return;
    }
    this.permissions = new Set(this.originalPermissions);
    this.cdr.markForCheck();
  }

  hasChanges(): boolean {
    if (this.permissions.size !== this.originalPermissions.size) {
      return true;
    }
    for (const permission of this.permissions) {
      if (!this.originalPermissions.has(permission)) {
        return true;
      }
    }
    return false;
  }

  saveChanges(): void {
    if (!this.selectedUser || this.savingPermissions || !this.hasChanges()) {
      return;
    }
    this.savingPermissions = true;
    this.cdr.markForCheck();
    this.admin.replaceUserPermissions(this.selectedUser.id, Array.from(this.permissions)).subscribe({
      next: () => {
        this.originalPermissions = new Set(this.permissions);
        this.savingPermissions = false;
        this.toast.success(this.translate.instant('adminUsers.permissions.toasts.replaced'));
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.savingPermissions = false;
        const code = error?.error?.error?.code;
        const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
        this.toast.error(this.translate.instant(key));
        this.cdr.markForCheck();
      }
    });
  }

  promote(): void {
    if (!this.selectedUser || this.roleActionLoading || this.selectedUser.roles?.includes('admin')) {
      return;
    }
    this.roleActionLoading = true;
    this.cdr.markForCheck();
    this.admin.promoteUser(this.selectedUser.id).subscribe({
      next: ({ user }) => {
        const roles = user?.roles || [...(this.selectedUser?.roles || []), 'admin'];
        this.updateUserRoles(roles);
        this.roleActionLoading = false;
        this.toast.success(this.translate.instant('adminUsers.permissions.toasts.promoted'));
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.roleActionLoading = false;
        const code = error?.error?.error?.code;
        const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
        this.toast.error(this.translate.instant(key));
        this.cdr.markForCheck();
      }
    });
  }

  demote(): void {
    if (!this.selectedUser || this.roleActionLoading || !this.selectedUser.roles?.includes('admin')) {
      return;
    }

    const dialogData = this.isLastAdmin()
      ? {
          titleKey: 'adminUsers.permissions.confirm.demoteLastAdmin.title',
          messageKey: 'adminUsers.permissions.confirm.demoteLastAdmin.message',
          confirmKey: 'adminUsers.permissions.confirm.demoteLastAdmin.confirm'
        }
      : {
          titleKey: 'adminUsers.permissions.confirm.demote.title',
          messageKey: 'adminUsers.permissions.confirm.demote.message',
          confirmKey: 'adminUsers.permissions.confirm.demote.confirm'
        };

    const ref = this.dialog.open(ConfirmDialogComponent, { width: '360px', data: dialogData });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.roleActionLoading = true;
      this.cdr.markForCheck();
      this.admin.demoteUser(this.selectedUser!.id).subscribe({
        next: ({ user }) => {
          const roles = Array.isArray(user?.roles)
            ? user.roles
            : (this.selectedUser?.roles || []).filter((role: string) => role !== 'admin');
          this.updateUserRoles(roles);
          this.roleActionLoading = false;
          this.toast.success(this.translate.instant('adminUsers.permissions.toasts.demoted'));
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.roleActionLoading = false;
          const code = error?.error?.error?.code;
          const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
          this.toast.error(this.translate.instant(key));
          this.cdr.markForCheck();
        }
      });
    });
  }

  isLastAdmin(): boolean {
    if (!this.selectedUser?.roles?.includes('admin')) {
      return false;
    }
    const totalAdmins = this.users.filter((user) => Array.isArray(user.roles) && user.roles.includes('admin')).length;
    return totalAdmins <= 1;
  }

  private loadUsers(search: string): void {
    this.usersLoading = true;
    this.usersErrorKey = null;
    this.cdr.markForCheck();

    this.admin.listUsers({ q: search || undefined, limit: 200 }).subscribe({
      next: (response) => {
        this.users = response.items || [];
        this.usersLoading = false;
        const currentId = this.selectedUser?.id;
        if (currentId) {
          const existing = this.users.find((user) => user.id === currentId) || null;
          this.selectedUser = existing;
          if (existing) {
            this.cdr.markForCheck();
            return;
          }
        }
        if (this.users.length) {
          this.selectUser(this.users[0]);
        } else {
          this.selectedUser = null;
          this.permissions = new Set<string>();
          this.originalPermissions = new Set<string>();
          this.cdr.markForCheck();
        }
      },
      error: (error) => {
        this.usersLoading = false;
        const code = error?.error?.error?.code;
        this.usersErrorKey = code ? `errors.backend.${code}` : 'adminUsers.list.errors.loadFailed';
        this.cdr.markForCheck();
      }
    });
  }

  private loadPermissions(): void {
    if (!this.selectedUser) {
      return;
    }
    this.permissionsLoading = true;
    this.permissionsErrorKey = null;
    this.cdr.markForCheck();

    this.admin.getUserPermissions(this.selectedUser.id).subscribe({
      next: (permissions) => {
        this.permissions = new Set(permissions || []);
        this.originalPermissions = new Set(this.permissions);
        this.permissionsLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.permissionsLoading = false;
        const code = error?.error?.error?.code;
        this.permissionsErrorKey = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.loadFailed';
        this.cdr.markForCheck();
      }
    });
  }

  private updateUserRoles(roles: string[]): void {
    if (!this.selectedUser) {
      return;
    }
    this.selectedUser.roles = roles;
    const listUser = this.users.find((user) => user.id === this.selectedUser!.id);
    if (listUser) {
      listUser.roles = roles;
    }
    this.cdr.markForCheck();
  }
}
