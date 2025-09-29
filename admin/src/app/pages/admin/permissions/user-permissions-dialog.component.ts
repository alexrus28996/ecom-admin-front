import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, Inject, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { isDevMode } from '@angular/core';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ToastService } from '../../../core/toast.service';
import { PermissionsService, PermissionDefinition, UserPermissionPayload } from './permissions.service';
import { PERMISSION_DOMAINS, PERMISSION_TOOLTIPS } from './permissions.constants';
import { PermissionUser } from './permissions.service';

interface PermissionItemView {
  code: string;
  label: string;
  description?: string;
}

interface PermissionGroupView {
  key: string;
  title: string;
  icon: string;
  permissions: PermissionItemView[];
}

interface DialogData {
  user: PermissionUser;
  isLastAdmin?: boolean;
}

@Component({
  selector: 'app-user-permissions-dialog',
  templateUrl: './user-permissions-dialog.component.html',
  styleUrls: ['./user-permissions-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserPermissionsDialogComponent implements OnInit {
  readonly searchControl = new FormControl('');

  loading = true;
  saving = false;
  error: string | null = null;

  permissions = new Set<string>();
  original = new Set<string>();

  groups: PermissionGroupView[] = [];
  filterTerm = '';

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: DialogData,
    private readonly dialogRef: MatDialogRef<UserPermissionsDialogComponent>,
    private readonly permissionsService: PermissionsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly toast: ToastService,
    private readonly destroyRef: DestroyRef
  ) {}

  ngOnInit(): void {
    this.dialogRef.disableClose = true;
    this.searchControl.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.filterTerm = (term || '').toString().toLowerCase();
        this.cdr.markForCheck();
      });

    this.loadPermissions();
  }

  filteredGroups(): PermissionGroupView[] {
    if (!this.filterTerm) {
      return this.groups;
    }
    return this.groups
      .map((group) => ({
        ...group,
        permissions: group.permissions.filter((permission) =>
          permission.code.toLowerCase().includes(this.filterTerm) ||
          permission.label.toLowerCase().includes(this.filterTerm) ||
          (permission.description || '').toLowerCase().includes(this.filterTerm)
        ),
      }))
      .filter((group) => group.permissions.length > 0);
  }

  isGranted(permission: string): boolean {
    return this.permissions.has(permission);
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

  togglePermission(permission: string, checked: boolean): void {
    if (this.loading || this.saving) {
      return;
    }
    if (checked) {
      this.permissions.add(permission);
    } else {
      this.permissions.delete(permission);
    }
    if (isDevMode()) {
      // eslint-disable-next-line no-console
      console.log(`Toggled permission: ${permission} → ${checked}`);
    }
    this.cdr.markForCheck();
  }

  selectAll(): void {
    if (this.loading || this.saving) {
      return;
    }
    this.groups.forEach((group) => group.permissions.forEach((permission) => this.permissions.add(permission.code)));
    this.cdr.markForCheck();
  }

  clearAll(): void {
    if (this.loading || this.saving) {
      return;
    }
    this.permissions.clear();
    this.cdr.markForCheck();
  }

  reset(): void {
    if (this.loading || this.saving) {
      return;
    }
    this.permissions = new Set(this.original);
    this.cdr.markForCheck();
  }

  save(): void {
    if (!this.data?.user || !this.hasChanges()) {
      return;
    }
    const oldPermissions = Array.from(this.original.values());
    const nextPermissions = Array.from(this.permissions.values());
    this.saving = true;
    this.error = null;
    this.cdr.markForCheck();

    this.permissionsService.replaceUserPermissions(this.data.user.id, nextPermissions).subscribe({
      next: (updated) => {
        this.original = new Set(updated);
        this.permissions = new Set(updated);
        this.toast.success('Permissions updated');
        if (isDevMode()) {
          // eslint-disable-next-line no-console
          console.log('[Permissions] Save diff', { before: oldPermissions, after: updated });
        }
        this.saving = false;
        this.dialogRef.close({ updated: true, permissions: updated });
      },
      error: (error) => {
        this.permissions = new Set(this.original);
        this.saving = false;
        if (error?.status === 401 || error?.status === 403) {
          this.toast.error("You don’t have permission.");
        } else {
          this.toast.error('Failed to update permissions');
        }
        this.cdr.markForCheck();
      },
    });
  }

  cancel(): void {
    this.dialogRef.close();
  }

  grantedCount(group: PermissionGroupView): number {
    return group.permissions.reduce((count, permission) => (this.permissions.has(permission.code) ? count + 1 : count), 0);
  }

  trackByGroup(_: number, group: PermissionGroupView): string {
    return group.key;
  }

  tooltipFor(permission: string, fallback?: string): string {
    return PERMISSION_TOOLTIPS[permission] || fallback || permission;
  }

  private loadPermissions(): void {
    if (!this.data?.user) {
      return;
    }
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.permissionsService.getUserPermissions(this.data.user.id).subscribe({
      next: (payload) => {
        this.applyPermissions(payload);
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.loading = false;
        this.error = error?.message || 'Unable to load permissions';
        if (error?.status === 401 || error?.status === 403) {
          this.toast.error("You don’t have permission.");
        } else {
          this.toast.error('Failed to load permissions');
        }
        this.cdr.markForCheck();
      },
    });
  }

  private applyPermissions(payload: UserPermissionPayload): void {
    this.permissions = new Set(payload.permissions || []);
    this.original = new Set(this.permissions);
    this.groups = this.composeGroups(payload);
  }

  private composeGroups(payload: UserPermissionPayload): PermissionGroupView[] {
    const lookup = new Map<string, PermissionGroupView>();
    const domainOrder = new Map<string, number>();
    PERMISSION_DOMAINS.forEach((domain, index) => {
      lookup.set(domain.key, { key: domain.key, title: domain.title, icon: domain.icon, permissions: [] });
      domainOrder.set(domain.key, index);
    });

    const ensureGroup = (key: string, title?: string, icon?: string): PermissionGroupView => {
      if (!lookup.has(key)) {
        lookup.set(key, { key, title: title || this.prettyLabel(key), icon: icon || 'folder', permissions: [] });
      }
      return lookup.get(key)!;
    };

    const seen = new Set<string>();
    const addPermission = (code: string, definition?: PermissionDefinition) => {
      if (!code || seen.has(code)) {
        return;
      }
      seen.add(code);
      const constantDomain = this.findDomainByPermission(code);
      const constantPermission = constantDomain?.permissions.find((permission) => permission.code === code);
      const domainKey = this.findDomainKeyForPermission(code, definition?.domain);
      const group = ensureGroup(
        domainKey,
        constantDomain?.title || (definition?.domain ? this.prettyLabel(definition.domain) : undefined),
        this.findDomainIcon(domainKey)
      );
      const label = definition?.label || constantPermission?.label || this.prettyLabel(code);
      const description = definition?.description || constantPermission?.description;
      group.permissions.push({ code, label, description });
    };

    (payload.available || []).forEach((definition) => addPermission(definition.code, definition));
    (payload.permissions || []).forEach((code) => addPermission(code));

    const groups = Array.from(lookup.values())
      .map((group) => ({
        ...group,
        permissions: group.permissions
          .filter((permission, index, array) => array.findIndex((item) => item.code === permission.code) === index)
          .sort((a, b) => a.label.localeCompare(b.label)),
      }))
      .filter((group) => group.permissions.length > 0);

    return groups.sort((a, b) => {
      const orderA = domainOrder.get(a.key);
      const orderB = domainOrder.get(b.key);
      if (orderA !== undefined && orderB !== undefined) {
        return orderA - orderB;
      }
      if (orderA !== undefined) {
        return -1;
      }
      if (orderB !== undefined) {
        return 1;
      }
      return a.title.localeCompare(b.title);
    });
  }

  private findDomainByPermission(code: string) {
    return PERMISSION_DOMAINS.find((domain) => domain.permissions.some((permission) => permission.code === code));
  }

  private findDomainKeyForPermission(code: string, domain?: string): string {
    const constant = this.findDomainByPermission(code);
    if (constant) {
      return constant.key;
    }
    if (domain) {
      return domain.toString().toLowerCase();
    }
    return 'custom';
  }

  private findDomainIcon(key: string): string {
    const constant = PERMISSION_DOMAINS.find((domain) => domain.key === key);
    return constant?.icon || 'folder';
  }

  private prettyLabel(value: string): string {
    return value
      .replace(/[:._-]/g, ' ')
      .split(' ')
      .filter((part) => part.length)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}
