import { SelectionModel } from '@angular/cdk/collections';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, finalize, map, takeUntil } from 'rxjs/operators';

import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { AdminUser, UserManagementService } from '../../services/user-management.service';
import { UserPermissionsDialogComponent } from './permissions/user-permissions-dialog.component';
import { ContextSearchService } from '../../core/context-search.service';

@Component({ selector: 'app-admin-users-list', templateUrl: './users-list.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class AdminUsersListComponent implements OnInit, OnDestroy {
  q = new UntypedFormControl('');
  displayed = ['select','name','email','roles','status','createdAt','actions'];
  rows: AdminUser[] = [];
  total = 0; pageIndex = 0; pageSize = 10; pageSizeOptions = [10,25,50,100];
  loading = false; errorKey: string | null = null;
  documentation = { toggle: false };
  selection = new SelectionModel<string>(true, []);
  statusLoading = new Set<string>();
  roleLoading = new Set<string>();
  bulkLoading = false;
  private readonly destroy$ = new Subject<void>();
  private routeReady = false;

  constructor(
    private readonly users: UserManagementService,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly i18n: TranslateService,
    private readonly contextSearch: ContextSearchService
  ) {}

  ngOnInit() {
    this.configureContextualSearch();
    this.i18n.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.configureContextualSearch());

    this.route.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe((params) => this.applySearchFromRoute(params.get('q')));
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.contextSearch.reset();
  }

  load() {
    this.loading = true; this.errorKey = null; this.cdr.markForCheck();
    this.users
      .listUsers({ q: (this.q.value || undefined), page: this.pageIndex + 1, limit: this.pageSize })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.rows = res.items || [];
          this.total = res.total || 0;
          this.pageIndex = (res.page || 1) - 1;
          this.selection.clear();
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (e) => {
          const code = e?.error?.error?.code;
          this.errorKey = code ? `errors.backend.${code}` : 'adminUsers.list.errors.loadFailed';
          this.loading = false;
          this.cdr.markForCheck();
      }
    });
  }

  onSearch() {
    this.pageIndex = 0;
    const query = (this.q.value || '').toString().trim();
    const previous = (this.route.snapshot.queryParamMap.get('q') ?? '').trim();

    if (previous === query) {
      this.load();
      return;
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query || null },
      queryParamsHandling: 'merge'
    });
  }
  onPage(ev: PageEvent) { this.pageSize = ev.pageSize; this.pageIndex = ev.pageIndex; this.load(); }

  toggle(user: AdminUser) {
    if (!user || this.statusLoading.has(user.id)) {
      return;
    }
    this.statusLoading.add(user.id);
    this.cdr.markForCheck();
    this.users.updateUserStatus(user.id, !user.isActive).pipe(finalize(() => {
      this.statusLoading.delete(user.id);
      this.cdr.markForCheck();
    })).subscribe({
      next: (updated) => {
        user.isActive = updated.isActive;
        this.toast.success(
          this.i18n.instant(
            updated.isActive ? 'adminUsers.list.toasts.activated' : 'adminUsers.list.toasts.deactivated'
          )
        );
      },
      error: (error) => this.handleActionError(error, 'adminUsers.list.errors.updateStatus')
    });
  }

  toggleSelection(user: AdminUser, checked: boolean): void {
    if (!user) {
      return;
    }
    if (checked) {
      this.selection.select(user.id);
    } else {
      this.selection.deselect(user.id);
    }
    this.cdr.markForCheck();
  }

  managePermissions(user: AdminUser): void {
    if (!user) {
      return;
    }

    const ref = this.dialog.open(UserPermissionsDialogComponent, {
      width: '480px',
      maxWidth: '100vw',
      height: '100vh',
      position: { right: '0' },
      panelClass: 'permissions-drawer-panel',
      data: {
        user: { ...user },
        isLastAdmin: this.isLastAdmin(user)
      }
    });

    ref.afterClosed().subscribe((result: { updated?: boolean } | undefined) => {
      if (result?.updated) {
        this.load();
      }
    });
  }

  navigateTo(user: AdminUser): void {
    if (!user) {
      return;
    }
    this.router.navigate(['/admin/users', user.id]);
  }

  promote(user: AdminUser): void {
    this.updateRole(user, true);
  }

  demote(user: AdminUser): void {
    this.updateRole(user, false);
  }

  exportCsv(): void {
    if (!this.rows.length) {
      return;
    }
    const header = ['"Name"', '"Email"', '"Roles"', '"Status"', '"Created At"'];
    const lines = this.rows.map((row) => {
      const name = row.name ? `"${row.name.replace(/"/g, '""')}"` : '""';
      const email = row.email ? `"${row.email.replace(/"/g, '""')}"` : '""';
      const roles = `"${(row.roles || []).join('; ').replace(/"/g, '""')}"`;
      const status = `"${row.isActive ? 'active' : 'inactive'}"`;
      const created = row.createdAt ? `"${row.createdAt}"` : '""';
      return [name, email, roles, status, created].join(',');
    });
    const blob = new Blob([[header.join(',')].concat(lines).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `admin-users-${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  toggleAll(event: boolean): void {
    if (event) {
      this.rows.forEach((row) => this.selection.select(row.id));
    } else {
      this.selection.clear();
    }
    this.cdr.markForCheck();
  }

  isAllSelected(): boolean {
    return this.selection.selected.length > 0 && this.selection.selected.length === this.rows.length;
  }

  bulkActivate(): void {
    this.bulkUpdate(true);
  }

  bulkDeactivate(): void {
    this.bulkUpdate(false);
  }

  selectionCount(): number {
    return this.selection.selected.length;
  }

  private bulkUpdate(isActive: boolean): void {
    const ids = this.selection.selected;
    if (!ids.length || this.bulkLoading) {
      return;
    }
    this.bulkLoading = true;
    this.cdr.markForCheck();
    const requests = ids.map((id) =>
      this.users.updateUserStatus(id, isActive).pipe(
        map((user) => ({ success: true, user })),
        catchError((error) => {
          this.handleActionError(error, 'adminUsers.list.errors.updateStatus');
          return of({ success: false, user: null });
        })
      )
    );
    forkJoin(requests).pipe(finalize(() => {
      this.bulkLoading = false;
      this.selection.clear();
      this.cdr.markForCheck();
    })).subscribe((results) => {
      let successCount = 0;
      results.forEach((result) => {
        if (result.success && result.user) {
          const existing = this.rows.find((row) => row.id === result.user.id);
          if (existing) {
            existing.isActive = result.user.isActive;
          }
          successCount += 1;
        }
      });
      if (successCount) {
        this.toast.success(
          this.i18n.instant(
            isActive ? 'adminUsers.list.toasts.bulkActivated' : 'adminUsers.list.toasts.bulkDeactivated'
          )
        );
      }
    });
  }

  private updateRole(user: AdminUser, promote: boolean): void {
    if (!user || this.roleLoading.has(user.id)) {
      return;
    }
    this.roleLoading.add(user.id);
    this.cdr.markForCheck();
    const operation = promote ? this.users.promoteUser(user.id) : this.users.demoteUser(user.id);
    operation.pipe(finalize(() => {
      this.roleLoading.delete(user.id);
      this.cdr.markForCheck();
    })).subscribe({
      next: (updated) => {
        user.roles = updated.roles || [];
        this.toast.success(
          this.i18n.instant(
            promote ? 'adminUsers.list.toasts.promoted' : 'adminUsers.list.toasts.demoted'
          )
        );
      },
      error: (error) => this.handleActionError(error, promote ? 'adminUsers.list.errors.promoteFailed' : 'adminUsers.list.errors.demoteFailed')
    });
  }

  private handleActionError(error: any, fallbackKey: string): void {
    const code = error?.error?.error?.code;
    const key = code ? `errors.backend.${code}` : fallbackKey;
    this.toast.error(this.i18n.instant(key));
  }

  private isLastAdmin(user: AdminUser): boolean {
    if (!user?.roles?.includes?.('admin')) {
      return false;
    }
    const totalAdmins = this.rows.filter((row) => Array.isArray(row.roles) && row.roles.includes('admin')).length;
    return totalAdmins <= 1;
  }

  private configureContextualSearch(): void {
    const moduleLabel = this.translateOrFallback('adminUsers.list.title', 'Users');
    const placeholder = this.translateOrFallback(
      'adminUsers.list.filters.placeholder',
      'Search users by name or email…'
    );
    const hint = this.translateOrFallback(
      'adminUsers.list.filters.hint',
      'Filter by name, email address, or identifier.'
    );

    this.contextSearch.configure({
      moduleLabel,
      placeholder,
      hint,
      navigateTo: '/admin/users',
      queryParam: 'q',
      icon: 'group'
    });
  }

  private applySearchFromRoute(raw: string | null): void {
    const value = (raw ?? '').trim();
    const current = (this.q.value || '').toString().trim();

    if (value !== current) {
      this.q.setValue(value, { emitEvent: false });
    }

    this.contextSearch.configure({ presetValue: value });

    const firstEmission = !this.routeReady;
    this.routeReady = true;

    if (firstEmission || value !== current) {
      if (!firstEmission) {
        this.pageIndex = 0;
      }
      this.load();
    }
  }

  private translateOrFallback(key: string, fallback: string): string {
    const value = this.i18n.instant(key);
    return value && value !== key ? value : fallback;
  }
}
