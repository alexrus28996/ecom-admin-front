<<<<<<< ours
<<<<<<< ours
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
=======
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ViewChild,
} from '@angular/core';
>>>>>>> theirs
=======
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit } from '@angular/core';
>>>>>>> theirs
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

import {
  PermissionCatalogEntry,
  UserManagementService,
  UserPermissionsResponse,
} from '../../../services/user-management.service';
import { ToastService } from '../../../core/toast.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';

interface PermissionItemView {
  id: string;
  label: string;
  description?: string;
  groupKey: string;
}

interface PermissionGroupView {
  key: string;
  label: string;
  icon: string;
  permissions: PermissionItemView[];
}

@Component({
  selector: 'app-permissions-settings',
  templateUrl: './permissions-settings.component.html',
  styleUrls: ['./permissions-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsSettingsComponent implements OnInit {
  readonly searchControl = new FormControl('');

  users: any[] = [];
  usersLoading = false;
  usersErrorKey: string | null = null;

  selectedUser: any | null = null;

  permissions = new Set<string>();
  originalPermissions = new Set<string>();
  permissionsLoading = false;
  permissionsErrorKey: string | null = null;
  groups: PermissionGroupView[] = [];

  savingPermissions = false;
  roleActionLoading = false;

  constructor(
    private readonly usersService: UserManagementService,
    private readonly cdr: ChangeDetectorRef,
<<<<<<< ours
    private readonly dialog: MatDialog,
<<<<<<< ours
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed())
=======
=======
>>>>>>> theirs
    private readonly toast: ToastService,
    private readonly dialog: MatDialog,
    private readonly destroyRef: DestroyRef,
    private readonly translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.searchControl.valueChanges
<<<<<<< ours
      .pipe(debounceTime(250), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
>>>>>>> theirs
=======
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
>>>>>>> theirs
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
    if (!user) {
      return;
    }
    if (this.selectedUser && this.selectedUser.id === user.id && !this.permissionsErrorKey) {
      return;
    }
    this.selectedUser = user;
    this.permissions = new Set<string>();
    this.originalPermissions = new Set<string>();
    this.permissionsErrorKey = null;
    this.groups = [];

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

  toggleGroup(group: PermissionGroupView, checked: boolean): void {
    group.permissions.forEach((permission) => this.togglePermission(permission.id, checked));
  }

  groupGrantedCount(group: PermissionGroupView): number {
    return group.permissions.reduce((count, permission) => count + (this.permissions.has(permission.id) ? 1 : 0), 0);
  }

  groupFullyGranted(group: PermissionGroupView): boolean {
    return group.permissions.every((permission) => this.permissions.has(permission.id));
  }

  groupPartiallyGranted(group: PermissionGroupView): boolean {
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
        confirmKey: 'adminUsers.permissions.confirm.clearAll.confirm',
      },
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
    this.usersService.replaceUserPermissions(this.selectedUser.id, Array.from(this.permissions)).subscribe({
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
      },
    });
  }

  promote(): void {
    if (!this.selectedUser || this.roleActionLoading || this.selectedUser.roles?.includes('admin')) {
      return;
    }
    this.roleActionLoading = true;
    this.cdr.markForCheck();
    this.usersService.promoteUser(this.selectedUser.id).subscribe({
      next: (user) => {
        const roles = user?.roles || [...(this.selectedUser?.roles || []), 'admin'];
        this.updateUserRoles(roles);
        this.roleActionLoading = false;
        this.toast.success(this.translate.instant('adminUsers.permissions.toasts.promoted'));
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.roleActionLoading = false;
        this.handleError(error);
        this.cdr.markForCheck();
      },
    });
  }

  demote(): void {
    if (!this.selectedUser || this.roleActionLoading || !this.selectedUser.roles?.includes('admin')) {
      return;
    }
    const ref = this.dialog.open(ConfirmDialogComponent, {
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

    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.roleActionLoading = true;
      this.cdr.markForCheck();
      this.usersService.demoteUser(this.selectedUser!.id).subscribe({
        next: (user) => {
          const roles = user?.roles || this.selectedUser?.roles?.filter((role: string) => role !== 'admin') || [];
          this.updateUserRoles(roles);
          this.roleActionLoading = false;
          this.toast.success(this.translate.instant('adminUsers.permissions.toasts.demoted'));
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.roleActionLoading = false;
          this.handleError(error);
          this.cdr.markForCheck();
        },
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

  private loadUsers(term: string): void {
    this.usersLoading = true;
    this.usersErrorKey = null;
    this.cdr.markForCheck();
    this.usersService.listUsers({ q: term || undefined }).subscribe({
      next: (response) => {
        this.users = response.items || [];
        this.usersLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        this.usersErrorKey = code ? `errors.backend.${code}` : 'adminUsers.list.errors.loadFailed';
        this.usersLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadPermissions(): void {
    if (!this.selectedUser) {
      return;
    }
    this.permissionsLoading = true;
    this.permissionsErrorKey = null;
    this.cdr.markForCheck();
    this.usersService.getUserPermissions(this.selectedUser.id).subscribe({
      next: (response) => {
        this.applyPermissions(response);
        this.permissionsLoading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        this.permissionsErrorKey = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.loadFailed';
        this.permissionsLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private updateUserRoles(roles: string[]): void {
    if (!this.selectedUser) {
      return;
    }
    const idx = this.users.findIndex((user) => user.id === this.selectedUser!.id);
    if (idx >= 0) {
      this.users[idx] = { ...this.users[idx], roles };
    }
    this.selectedUser = { ...this.selectedUser, roles };
  }

  private handleError(error: any): void {
    const code = error?.error?.error?.code;
    const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
    this.toast.error(this.translate.instant(key));
  }

  private applyPermissions(response: UserPermissionsResponse): void {
    this.permissions = new Set(response.permissions || []);
    this.originalPermissions = new Set(this.permissions);
    this.groups = this.buildGroups(response);
  }

  private buildGroups(response: UserPermissionsResponse): PermissionGroupView[] {
    const catalog: PermissionCatalogEntry[] = [...(response.available || [])];
    const known = new Set<string>(catalog.map((entry) => entry.id));
    (response.permissions || []).forEach((id) => {
      if (!known.has(id)) {
        catalog.push({ id });
      }
    });
    const items = catalog.map((entry) => this.toView(entry));
    const groups = new Map<string, PermissionGroupView>();
    items.forEach((item) => {
      const key = item.groupKey || 'general';
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label: this.groupLabel(key),
          icon: this.groupIcon(key),
          permissions: [],
        });
      }
      groups.get(key)!.permissions.push(item);
    });
    return Array.from(groups.values()).map((group) => ({
      ...group,
      permissions: group.permissions.sort((a, b) => a.label.localeCompare(b.label)),
    }));
  }

  private toView(entry: PermissionCatalogEntry): PermissionItemView {
    const id = entry.id;
    const camelKey = this.toCamelKey(id);
    const labelKey = `adminUsers.permissions.items.${camelKey}`;
    const tooltipKey = `permissionsSettings.tooltips.${camelKey}`;
    const labelTranslation = this.translate.instant(labelKey);
    const tooltipTranslation = this.translate.instant(tooltipKey);
    const label = entry.label || (labelTranslation !== labelKey ? labelTranslation : this.prettyLabel(id));
    const description = entry.description || (tooltipTranslation !== tooltipKey ? tooltipTranslation : undefined);
    const groupKey = (entry.group || entry.category || 'general').toString();
    return {
      id,
      label,
      description,
      groupKey,
    };
  }

  private groupLabel(key: string): string {
    const translationKey = `adminUsers.permissions.groups.${key}`;
    const translated = this.translate.instant(translationKey);
    return translated !== translationKey ? translated : this.prettyLabel(key);
  }

  private groupIcon(key: string): string {
    switch (key) {
      case 'catalog':
        return 'storefront';
      case 'orders':
        return 'shopping_cart_checkout';
      case 'inventory':
        return 'inventory_2';
      case 'reports':
        return 'insights';
      case 'system':
        return 'admin_panel_settings';
      default:
        return 'folder';
    }
  }

  private prettyLabel(value: string): string {
    return value
      .replace(/[:._-]/g, ' ')
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private toCamelKey(value: string): string {
    return value
      .split(/[:._-]/)
      .map((chunk, index) => (index === 0 ? chunk : chunk.charAt(0).toUpperCase() + chunk.slice(1)))
      .join('');
  }
}
