import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ViewChild,
} from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort, Sort } from '@angular/material/sort';
import { merge } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ToastService } from '../../../core/toast.service';
import {
  PaginatedUsersResponse,
  PermissionUser,
  PermissionsService,
} from './permissions.service';
import { UserPermissionsDialogComponent } from './user-permissions-dialog.component';

@Component({
  selector: 'app-permissions-settings',
  templateUrl: './permissions-settings.component.html',
  styleUrls: ['./permissions-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PermissionsSettingsComponent implements AfterViewInit {
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  readonly searchControl = new FormControl('');
  readonly displayedColumns = ['user', 'email', 'roles', 'status', 'actions'];

  users: PermissionUser[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 10;
  sortActive = 'user';
  sortDirection: 'asc' | 'desc' = 'asc';

  loading = false;
  error: string | null = null;

  private searchTerm = '';

  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly destroyRef: DestroyRef
  ) {
    this.searchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe((term) => {
        this.searchTerm = (term || '').toString().trim();
        this.pageIndex = 0;
        if (this.paginator) {
          this.paginator.firstPage();
        }
        this.loadUsers();
      });
  }

  ngAfterViewInit(): void {
    merge(
      this.sort.sortChange,
      this.paginator.page
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((event) => {
        if (this.isSortEvent(event)) {
          this.sortActive = event.active || 'user';
          this.sortDirection = event.direction || 'asc';
          this.paginator.firstPage();
        } else {
          const pageEvent = event as PageEvent;
          this.pageIndex = pageEvent.pageIndex;
          this.pageSize = pageEvent.pageSize;
        }
        this.loadUsers();
      });

    Promise.resolve().then(() => this.loadUsers());
  }

  trackByUserId(_: number, user: PermissionUser): string {
    return user.id;
  }

  avatarFallback(user: PermissionUser): string {
    const source = user.name || user.email || '?';
    return source
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  openPermissions(user: PermissionUser): void {
    const ref = this.dialog.open(UserPermissionsDialogComponent, {
      width: '480px',
      maxWidth: '100vw',
      height: '100vh',
      position: { right: '0' },
      panelClass: 'permissions-drawer-panel',
      data: { user },
    });

    ref.afterClosed().subscribe((result) => {
      if (result?.updated) {
        this.loadUsers();
      }
    });
  }

  roleClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'role-chip role-admin';
      case 'customer':
        return 'role-chip role-customer';
      case 'staff':
        return 'role-chip role-staff';
      default:
        return 'role-chip';
    }
  }

  statusLabel(user: PermissionUser): string {
    if (user.status) {
      return user.status.toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
    }
    return user.isActive === false ? 'Inactive' : 'Active';
  }

  statusClass(user: PermissionUser): string {
    return this.statusLabel(user) === 'Active' ? 'status active' : 'status inactive';
  }

  private loadUsers(): void {
    this.loading = true;
    this.error = null;
    this.cdr.markForCheck();
    this.permissionsService
      .listUsers({
        page: this.pageIndex + 1,
        limit: this.pageSize,
        q: this.searchTerm || undefined,
        sort: this.sortField(),
        direction: this.sortDirection,
      })
      .subscribe({
        next: (response) => this.handleUsersResponse(response),
        error: (error) => this.handleUsersError(error),
      });
  }

  private handleUsersResponse(response: PaginatedUsersResponse): void {
    this.users = response.items;
    this.total = response.total;
    this.pageSize = response.limit || this.pageSize;
    this.loading = false;
    this.cdr.markForCheck();
  }

  private handleUsersError(error: any): void {
    this.loading = false;
    this.users = [];
    if (error?.status === 401 || error?.status === 403) {
      this.toast.error("You don’t have permission.");
      this.error = "You don’t have permission.";
    } else {
      this.toast.error('Failed to load users');
      this.error = 'Unable to load users.';
    }
    this.cdr.markForCheck();
  }

  private isSortEvent(event: Sort | PageEvent): event is Sort {
    return (event as Sort).direction !== undefined && (event as Sort).active !== undefined;
  }

  private sortField(): string {
    switch (this.sortActive) {
      case 'user':
        return 'name';
      default:
        return this.sortActive;
    }
  }
}
