import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';

import { ToastService } from '../../core/toast.service';
import {
  AdminUser,
  PermissionCatalogEntry,
  UserManagementService,
  UserPermissionsResponse,
} from '../../services/user-management.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';

interface UserPermissionsDialogData {
  user: AdminUser;
  isLastAdmin: boolean;
}

interface PermissionItemView {
  id: string;
  label: string;
  description?: string;
  groupKey: string;
}

interface PermissionGroupView {
  key: string;
  label: string;
  items: PermissionItemView[];
}

@Component({
  selector: 'app-user-permissions-dialog',
  templateUrl: './user-permissions-dialog.component.html',
  styleUrls: ['./user-permissions-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPermissionsDialogComponent implements OnInit, OnDestroy {
  readonly searchControl = new UntypedFormControl('');

  permissions = new Set<string>();
  original = new Set<string>();
  groups: PermissionGroupView[] = [];

  loading = false;
  loadErrorKey: string | null = null;
  saveLoading = false;
  promoteLoading = false;
  demoteLoading = false;
  toggling = new Set<string>();

  private filterTerm = '';
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly users: UserManagementService,
    private readonly cdr: ChangeDetectorRef,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
    private readonly dialog: MatDialog,
    private readonly dialogRef: MatDialogRef<UserPermissionsDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: UserPermissionsDialogData
  ) {}

  ngOnInit(): void {
    this.searchControl.valueChanges
      .pipe(debounceTime(150), takeUntil(this.destroy$))
      .subscribe((term) => {
        this.filterTerm = (term || '').toString().toLowerCase();
        this.cdr.markForCheck();
      });

    this.loadPermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  filteredGroups(): PermissionGroupView[] {
    if (!this.filterTerm) {
      return this.groups;
    }
    return this.groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.id.toLowerCase().includes(this.filterTerm) ||
          item.label.toLowerCase().includes(this.filterTerm) ||
          (item.description || '').toLowerCase().includes(this.filterTerm)
        ),
      }))
      .filter((group) => group.items.length > 0);
  }

  isGranted(permission: string): boolean {
    return this.permissions.has(permission);
  }

  isToggling(permission: string): boolean {
    return this.toggling.has(permission);
  }

  grantedCount(group: PermissionGroupView): number {
    if (!group?.items?.length) {
      return 0;
    }
    return group.items.reduce((count, item) => (this.isGranted(item.id) ? count + 1 : count), 0);
  }

  togglePermission(permission: PermissionItemView, checked: boolean): void {
    if (!permission || this.isToggling(permission.id)) {
      return;
    }
    this.toggling.add(permission.id);
    this.cdr.markForCheck();
    const action$ = checked
      ? this.users.addUserPermissions(this.data.user.id, [permission.id])
      : this.users.removeUserPermissions(this.data.user.id, [permission.id]);
    action$.subscribe({
      next: (updated) => {
        if (checked) {
          this.permissions.add(permission.id);
          this.original.add(permission.id);
        } else {
          this.permissions.delete(permission.id);
          this.original.delete(permission.id);
        }
        this.toast.success(
          this.i18n.instant(
            checked ? 'adminUsers.permissions.toasts.added' : 'adminUsers.permissions.toasts.removed'
          )
        );
        this.syncWithResponse(updated);
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
        this.toast.error(this.i18n.instant(key));
        this.permissions = new Set(this.original);
        this.toggling.delete(permission.id);
        this.cdr.markForCheck();
      },
      complete: () => {
        this.toggling.delete(permission.id);
        this.cdr.markForCheck();
      },
    });
  }

  toggleGroup(group: PermissionGroupView, checked: boolean): void {
    if (!group) {
      return;
    }
    const permissions = group.items.map((item) => item.id);
    this.toggling = new Set([...this.toggling, ...permissions]);
    this.cdr.markForCheck();
    const action$ = checked
      ? this.users.addUserPermissions(this.data.user.id, permissions)
      : this.users.removeUserPermissions(this.data.user.id, permissions);
    action$.subscribe({
      next: (updated) => {
        permissions.forEach((id) => {
          if (checked) {
            this.permissions.add(id);
            this.original.add(id);
          } else {
            this.permissions.delete(id);
            this.original.delete(id);
          }
        });
        this.toast.success(
          this.i18n.instant(
            checked ? 'adminUsers.permissions.toasts.added' : 'adminUsers.permissions.toasts.removed'
          )
        );
        this.syncWithResponse(updated);
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
        this.toast.error(this.i18n.instant(key));
        this.permissions = new Set(this.original);
        permissions.forEach((id) => this.toggling.delete(id));
        this.cdr.markForCheck();
      },
      complete: () => {
        permissions.forEach((id) => this.toggling.delete(id));
        this.cdr.markForCheck();
      },
    });
  }

  selectAll(): void {
    const all = new Set<string>();
    this.groups.forEach((group) => group.items.forEach((item) => all.add(item.id)));
    this.permissions = all;
    this.cdr.markForCheck();
  }

  clearAll(): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: {
        titleKey: 'adminUsers.permissions.confirm.clearAll.title',
        messageKey: 'adminUsers.permissions.confirm.clearAll.message',
        confirmKey: 'adminUsers.permissions.confirm.clearAll.confirm',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        this.permissions.clear();
        this.cdr.markForCheck();
      }
    });
  }

  hasChanges(): boolean {
    if (this.permissions.size !== this.original.size) {
      return true;
    }
    for (const permission of this.permissions) {
      if (!this.original.has(permission)) {
        return true;
      }
    }
    return false;
  }

  saveAll(): void {
    if (this.saveLoading) {
      return;
    }
    this.saveLoading = true;
    this.cdr.markForCheck();
    this.users.replaceUserPermissions(this.data.user.id, Array.from(this.permissions)).subscribe({
      next: (updated) => {
        this.syncWithResponse(updated);
        this.original = new Set(this.permissions);
        this.toast.success(this.i18n.instant('adminUsers.permissions.toasts.replaced'));
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
        this.toast.error(this.i18n.instant(key));
      },
      complete: () => {
        this.saveLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  promote(): void {
    if (this.promoteLoading || this.data.user.roles?.includes('admin')) {
      return;
    }
    this.promoteLoading = true;
    this.cdr.markForCheck();
    this.users.promoteUser(this.data.user.id).subscribe({
      next: (user) => {
        this.data.user.roles = user.roles || [];
        this.toast.success(this.i18n.instant('adminUsers.permissions.toasts.promoted'));
        this.dialogRef.close({ roles: this.data.user.roles });
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
        this.toast.error(this.i18n.instant(key));
      },
      complete: () => {
        this.promoteLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  demote(): void {
    if (this.demoteLoading || !this.data.user.roles?.includes('admin')) {
      return;
    }
    const dialogData = this.data.isLastAdmin
      ? {
          titleKey: 'adminUsers.permissions.confirm.demoteLastAdmin.title',
          messageKey: 'adminUsers.permissions.confirm.demoteLastAdmin.message',
          confirmKey: 'adminUsers.permissions.confirm.demoteLastAdmin.confirm',
        }
      : {
          titleKey: 'adminUsers.permissions.confirm.demote.title',
          messageKey: 'adminUsers.permissions.confirm.demote.message',
          confirmKey: 'adminUsers.permissions.actions.demote',
        };
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '360px',
      data: dialogData,
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.demoteLoading = true;
      this.cdr.markForCheck();
      this.users.demoteUser(this.data.user.id).subscribe({
        next: (user) => {
          this.data.user.roles = user.roles || [];
          this.toast.success(this.i18n.instant('adminUsers.permissions.toasts.demoted'));
          this.dialogRef.close({ roles: this.data.user.roles });
        },
        error: (error) => {
          const code = error?.error?.error?.code;
          const key = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.actionFailed';
          this.toast.error(this.i18n.instant(key));
        },
        complete: () => {
          this.demoteLoading = false;
          this.cdr.markForCheck();
        },
      });
    });
  }

  canPromote(): boolean {
    return !this.data.user?.roles?.includes('admin');
  }

  canDemote(): boolean {
    return this.data.user?.roles?.includes('admin');
  }

  trackByPermission(_: number, permission: PermissionItemView): string {
    return permission.id;
  }

  trackByGroup(_: number, group: PermissionGroupView): string {
    return group.key;
  }

  close(): void {
    this.dialogRef.close({ roles: this.data.user.roles });
  }

  private loadPermissions(): void {
    this.loading = true;
    this.loadErrorKey = null;
    this.cdr.markForCheck();
    this.users.getUserPermissions(this.data.user.id).subscribe({
      next: (response) => {
        this.applyPermissionsResponse(response);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        const code = error?.error?.error?.code;
        this.loadErrorKey = code ? `errors.backend.${code}` : 'adminUsers.permissions.errors.loadFailed';
        this.loading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private applyPermissionsResponse(response: UserPermissionsResponse): void {
    const available = [...(response.available || [])];
    const knownIds = new Set<string>(available.map((item) => item.id));
    response.permissions.forEach((id) => {
      if (!knownIds.has(id)) {
        available.push({ id });
      }
    });
    const items = available.map((entry) => this.toView(entry));
    const groupsMap = new Map<string, PermissionGroupView>();
    items.forEach((item) => {
      const key = item.groupKey || 'general';
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          label: this.groupLabel(key),
          items: [],
        });
      }
      groupsMap.get(key)!.items.push(item);
    });
    const groups = Array.from(groupsMap.values()).map((group) => ({
      ...group,
      items: group.items.sort((a, b) => a.label.localeCompare(b.label)),
    }));
    groups.sort((a, b) => a.label.localeCompare(b.label));
    this.groups = groups;
    this.permissions = new Set(response.permissions || []);
    this.original = new Set(this.permissions);
  }

  private toView(entry: PermissionCatalogEntry): PermissionItemView {
    const id = entry.id;
    const camelKey = this.toCamelKey(id);
    const labelKey = `adminUsers.permissions.items.${camelKey}`;
    const tooltipKey = `permissionsSettings.tooltips.${camelKey}`;
    const labelTranslation = this.i18n.instant(labelKey);
    const descriptionTranslation = this.i18n.instant(tooltipKey);
    const label = entry.label || (labelTranslation !== labelKey ? labelTranslation : this.prettyLabel(id));
    const description = entry.description || (descriptionTranslation !== tooltipKey ? descriptionTranslation : undefined);
    const groupKey = (entry.group || entry.category || 'general').toString();
    return {
      id,
      label,
      description,
      groupKey,
    };
  }

  private groupLabel(groupKey: string): string {
    const key = `adminUsers.permissions.groups.${groupKey}`;
    const translation = this.i18n.instant(key);
    if (translation !== key) {
      return translation;
    }
    return this.prettyLabel(groupKey);
  }

  private prettyLabel(value: string): string {
    if (!value) {
      return '';
    }
    return value
      .replace(/[:._-]/g, ' ')
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private toCamelKey(value: string): string {
    return value
      .split(/[:._-]/)
      .map((chunk, index) =>
        index === 0 ? chunk : chunk.charAt(0).toUpperCase() + chunk.slice(1)
      )
      .join('');
  }

  private syncWithResponse(updated: string[]): void {
    if (!Array.isArray(updated)) {
      return;
    }
    this.permissions = new Set(updated);
    this.original = new Set(updated);
    this.cdr.markForCheck();
  }
}
