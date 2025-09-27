import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { PageEvent } from '@angular/material/paginator';
import { AdminService } from '../../services/admin.service';
import { MatDialog } from '@angular/material/dialog';
import { UserPermissionsDialogComponent } from './user-permissions-dialog.component';

@Component({ selector: 'app-admin-users-list', templateUrl: './users-list.component.html', changeDetection: ChangeDetectionStrategy.OnPush })
export class AdminUsersListComponent implements OnInit {
  q = new UntypedFormControl('');
  displayed = ['name','email','roles','active','actions'];
  rows: any[] = [];
  total = 0; pageIndex = 0; pageSize = 10; pageSizeOptions = [10,25,50,100];
  loading = false; errorKey: string | null = null;
  documentation = { toggle: false };

  constructor(private admin: AdminService, private cdr: ChangeDetectorRef, private dialog: MatDialog) {}
  ngOnInit() { this.load(); }

  load() {
    this.loading = true; this.errorKey = null; this.cdr.markForCheck();
    this.admin.listUsers({ q: (this.q.value || undefined), page: this.pageIndex + 1, limit: this.pageSize }).subscribe({
      next: (res) => { this.rows = res.items || []; this.total = res.total || 0; this.pageIndex = (res.page || 1) - 1; this.loading = false; this.cdr.markForCheck(); },
      error: (e) => { const code = e?.error?.error?.code; this.errorKey = code ? `errors.backend.${code}` : 'adminUsers.list.errors.loadFailed'; this.loading = false; this.cdr.markForCheck(); }
    });
  }

  onSearch() { this.pageIndex = 0; this.load(); }
  onPage(ev: PageEvent) { this.pageSize = ev.pageSize; this.pageIndex = ev.pageIndex; this.load(); }

  toggle(u: any) {
    this.admin.updateUserActive(u.id, !u.isActive).subscribe({
      next: ({ user }) => { const it = this.rows.find(x => x.id === user.id); if (it) { it.isActive = user.isActive; this.cdr.markForCheck(); } },
      error: () => {}
    });
  }

  managePermissions(user: any): void {
    if (!user) {
      return;
    }

    const ref = this.dialog.open(UserPermissionsDialogComponent, {
      width: '880px',
      maxWidth: '95vw',
      data: {
        user: { ...user },
        isLastAdmin: this.isLastAdmin(user)
      }
    });

    ref.afterClosed().subscribe((result) => {
      if (!result) {
        return;
      }
      const existing = this.rows.find((row) => row.id === user.id);
      if (existing && Array.isArray(result.roles)) {
        existing.roles = result.roles;
        this.cdr.markForCheck();
      }
    });
  }

  private isLastAdmin(user: any): boolean {
    if (!user?.roles?.includes?.('admin')) {
      return false;
    }
    const totalAdmins = this.rows.filter((row) => Array.isArray(row.roles) && row.roles.includes('admin')).length;
    return totalAdmins <= 1;
  }
}
