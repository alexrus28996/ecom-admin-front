import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { AdminService } from '../../services/admin.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

type ReturnStatus = 'requested'|'approved'|'rejected'|'refunded';

@Component({
  selector: 'app-admin-returns-list',
  templateUrl: './returns-admin-list.component.html',
  styleUrls: ['./returns-admin-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminReturnsListComponent implements OnInit {
  readonly filterForm = this.fb.group({ status: [''] });
  readonly displayed = ['order', 'amount', 'status', 'requestedAt', 'actions'];

  data: any[] = [];
  selected: any | null = null;
  total = 0;
  page = 0;
  pageSize = 10;
  readonly pageSizes = [10, 25, 50, 100];

  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  constructor(
    private readonly admin: AdminService,
    private readonly fb: UntypedFormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    const s = (this.filterForm.value.status || '') as ReturnStatus | '';
    this.admin.listReturns({ status: (s || undefined) as any, page: this.page + 1, limit: this.pageSize }).subscribe({
      next: (res) => {
        this.data = res.items || [];
        this.total = res.total || 0;
        this.page = (res.page || 1) - 1;
        this.loading = false;

        if (this.selected) {
          const selectedId = this.selected._id || this.selected.id;
          this.selected = this.data.find((row) => (row._id || row.id) === selectedId) || null;
        }

        this.cdr.markForCheck();
      },
      error: (err) => {
        this.lastError = err;
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'returns.list.errors.loadFailed';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onStatusChange(): void {
    this.page = 0;
    this.load();
  }

  reload(): void {
    this.load();
  }

  onPage(event: any): void {
    this.pageSize = event.pageSize;
    this.page = event.pageIndex;
    this.load();
  }

  open(row: any): void {
    this.selected = row;
    this.cdr.markForCheck();
  }

  close(): void {
    this.selected = null;
    this.cdr.markForCheck();
  }

  approve(item: any): void {
    this.confirm('returns.list.actions.approve', () => this.runAction(() => this.admin.approveReturn(item._id || item.id), 'returns.list.toasts.approved'));
  }

  reject(item: any): void {
    this.confirm('returns.list.actions.reject', () => this.runAction(() => this.admin.rejectReturn(item._id || item.id), 'returns.list.toasts.rejected'));
  }

  private runAction(request: () => Observable<any>, successToastKey: string): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    request().subscribe({
      next: () => {
        this.toast.success(this.i18n.instant(successToastKey));
        this.load();
      },
      error: (err) => {
        const code = err?.error?.error?.code;
        this.errorKey = code ? `errors.backend.${code}` : 'returns.list.errors.updateFailed';
        this.lastError = err;
        this.loading = false;
        this.toast.error(this.i18n.instant('returns.list.errors.updateFailed'));
        this.cdr.markForCheck();
      }
    });
  }

  private confirm(actionKey: string, fn: () => void): void {
    const ref = this.dialog.open(ConfirmDialogComponent, { width: '360px', data: { confirmKey: actionKey } });
    ref.afterClosed().subscribe((ok) => {
      if (ok) {
        fn();
      }
    });
  }
}
