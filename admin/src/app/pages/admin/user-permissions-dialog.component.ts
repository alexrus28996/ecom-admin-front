import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Observable, Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';

import { AdminService } from '../../services/admin.service';
import { PERMISSION_GROUPS, PermissionGroupDefinition } from '../../services/permissions.constants';
import { ToastService } from '../../core/toast.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

interface UserPermissionsDialogData {
  user: any;
  isLastAdmin: boolean;
}

type PermissionAction = 'replace' | 'add' | 'remove' | 'promote' | 'demote';

@Component({
  selector: 'app-user-permissions-dialog',
  templateUrl: './user-permissions-dialog.component.html',
  styleUrls: ['./user-permissions-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UserPermissionsDialogComponent implements OnInit, OnDestroy {
  readonly groups = PERMISSION_GROUPS;
  readonly searchControl = new UntypedFormControl('');

  permissions = new Set<string>();
  original = new Set<string>();
  pendingAdd = new Set<string>();
  pendingRemove = new Set<string>();

  loading = false;
  loadErrorKey: string | null = null;

  actionLoading: Record<PermissionAction, boolean> = {
    replace: false,
    add: false,
    remove: false,
    promote: false,
    demote: false
  };

  private filterTerm = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly admin: AdminService,
    private readonly cdr: ChangeDetectorRef,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
    private readonly dialog: MatDialog,
    private readonly dialogRef: MatDialogRef<UserPermissionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: UserPermissionsDialogData
  ) {}

  ngOnInit(): void {
    this.searchControl.valueChanges.pipe(debounceTime(150), takeUntil(this.destroy$)).subscribe((term) => {
      this.filterTerm = (term || '').toLowerCase().trim();
      this.cdr.markForCheck();
    });
    this.loadPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  filteredGroups(): PermissionGroupDefinition[] {
    if (!this.filterTerm) {
      return this.groups;
    }
    return this.groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter((permission) =>
          permission.id.toLowerCase().includes(this.filterTerm) ||
          this.i18n.instant(permission.labelKey).toLowerCase().includes(this.filterTerm)
        )
      }))
      .filter((group) => group.permissions.length > 0);
  }

  isGranted(permission: string): boolean {
    return this.permissions.has(permission);
  }

  isPendingAdd(permission: string): boolean {
    return this.pendingAdd.has(permission);
  }

  isPendingRemove(permission: string): boolean {
    return this.pendingRemove.has(permission);
  }

  badgeTone(permission: string): 'adding' | 'removing' | 'granted' | 'available' {
    if (this.isPendingAdd(permission)) {
      return 'adding';
    }
    if (this.isPendingRemove(permission)) {
      return 'removing';
    }
    if (this.isGranted(permission)) {
      return 'granted';
    }
    return 'available';
  }

  groupGrantedCount(group: PermissionGroupDefinition): number {
    return group.permissions.filter((permission) => this.permissions.has(permission.id)).length;
  }

  togglePermission(permission: string, checked: boolean): void {
    if (checked) {
      this.permissions.add(permission);
      if (!this.original.has(permission)) {
        this.pendingAdd.add(permission);
      } else {
        this.pendingAdd.delete(permission);
      }
      this.pendingRemove.delete(permission);
    } else {
      this.permissions.delete(permission);
      if (this.original.has(permission)) {
        this.pendingRemove.add(permission);
      } else {
        this.pendingRemove.delete(permission);
      }
      this.pendingAdd.delete(permission);
    }
    this.cdr.markForCheck();
  }

  toggleGroup(group: PermissionGroupDefinition, checked: boolean): void {
    group.permissions.forEach((permission) => this.togglePermission(permission.id, checked));
  }

  selectAll(): void {
    this.groups.forEach((group) => group.permissions.forEach((permission) => this.togglePermission(permission.id, true)));
  }

  clearAll(): void {
    if (this.permissions.size === 0 && this.pendingRemove.size === 0) {
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
      if (ok) {
        this.groups.forEach((group) => group.permissions.forEach((permission) => this.togglePermission(permission.id, false)));
        this.cdr.markForCheck();
      }
    });
  }

  hasChanges(): boolean {
    return this.pendingAdd.size > 0 || this.pendingRemove.size > 0;
  }

  addCount(): number {
    return this.pendingAdd.size;
  }

  removeCount(): number {
    return this.pendingRemove.size;
  }

  promote(): void {
    this.perform('promote', () => this.admin.promoteUser(this.data.user.id), 'adminUsers.permissions.toasts.promoted', (res) => {
      if (res?.user?.roles) {
        this.data.user.roles = res.user.roles;
      } else if (!this.data.user.roles?.includes('admin')) {
        this.data.user.roles = [...(this.data.user.roles || []), 'admin'];
      }
      this.dialogRef.close({ roles: this.data.user.roles, permissions: Array.from(this.permissions) });
    });
  }

  demote(): void {
    const dialogData = this.data.isLastAdmin
      ? {
          titleKey: 'adminUsers.permissions.confirm.demoteLastAdmin.title',
          messageKey: 'adminUsers.permissions.confirm.demoteLastAdmin.message',
          confirmKey: 'adminUsers.permissions.confirm.demoteLastAdmin.confirm'
        }
      : {
          titleKey: 'adminUsers.permissions.confirm.demote.title',
          messageKey: 'adminUsers.permissions.confirm.demote.message',
          confirmKey: 'adminUsers.permissions.actions.demote'
        };
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: dialogData
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.perform('demote', () => this.admin.demoteUser(this.data.user.id), 'adminUsers.permissions.toasts.demoted', (res) => {
          if (Array.isArray(res?.user?.roles)) {
            this.data.user.roles = res.user.roles;
          } else {
            this.data.user.roles = (this.data.user.roles || []).filter((role: string) => role !== 'admin');
          }
          this.dialogRef.close({ roles: this.data.user.roles, permissions: Array.from(this.permissions) });
        });
      }
    });
  }

  saveAll(): void {
    this.perform('replace', () => this.admin.replaceUserPermissions(this.data.user.id, Array.from(this.permissions)), 'adminUsers.permissions.toasts.replaced', () => {
      this.original = new Set(this.permissions);
      this.pendingAdd.clear();
      this.pendingRemove.clear();
    });
  }

  applyAdds(): void {
    if (!this.pendingAdd.size) {
      return;
    }
    this.perform('add', () => this.admin.addUserPermissions(this.data.user.id, Array.from(this.pendingAdd)), 'adminUsers.permissions.toasts.added', () => {
      this.pendingAdd.forEach((permission) => this.original.add(permission));
      this.pendingAdd.clear();
    });
  }

  applyRemovals(): void {
    if (!this.pendingRemove.size) {
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'adminUsers.permissions.confirm.remove.title',
        messageKey: 'adminUsers.permissions.confirm.remove.message',
        confirmKey: 'adminUsers.permissions.confirm.remove.confirm'
      }
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.perform('remove', () => this.admin.removeUserPermissions(this.data.user.id, Array.from(this.pendingRemove)), 'adminUsers.permissions.toasts.removed', () => {
        this.pendingRemove.forEach((permission) => this.original.delete(permission));
        this.pendingRemove.clear();
      });
    });
  }

  canPromote(): boolean {
    return !this.data.user?.roles?.includes('admin');
  }

  canDemote(): boolean {
    return this.data.user?.roles?.includes('admin');
  }

  close(): void {
    this.dialogRef.close({ roles: this.data.user.roles, permissions: Array.from(this.permissions) });
  }

  trackByPermission(_: number, permission: { id: string }): string {
    return permission.id;
  }

  trackByGroup(_: number, group: PermissionGroupDefinition): string {
    return group.key;
  }

  private loadPermissions(): void {
    this.loading = true;
    this.loadErrorKey = null;
    this.cdr.markForCheck();
    this.admin.getUserPermissions(this.data.user.id).subscribe({
      next: (permissions) => {
        this.permissions = new Set(permissions || []);
        this.original = new Set(this.permissions);
        this.pendingAdd.clear();
        this.pendingRemove.clear();
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        this.loadErrorKey = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.loadFailed';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private perform<T>(
    action: PermissionAction,
    factory: () => Observable<T>,
    toastKey: string,
    onSuccess?: (response: T) => void
  ): void {
    if (this.actionLoading[action]) {
      return;
    }
    this.actionLoading[action] = true;
    this.cdr.markForCheck();
    factory().subscribe({
      next: (response: any) => {
        if (onSuccess) {
          onSuccess(response);
        }
        this.actionLoading[action] = false;
        this.toast.success(this.i18n.instant(toastKey, { name: this.data.user?.name || this.data.user?.email }));
        this.cdr.markForCheck();
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
        this.toast.error(this.i18n.instant(key));
        this.actionLoading[action] = false;
        this.cdr.markForCheck();
      }
    });
  }
}
