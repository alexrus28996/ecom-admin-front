import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { UntypedFormBuilder } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { ToastService } from '../../core/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { Paginated, Return, ReturnStatus } from '../../services/api.types';
import { ReturnsService } from '../../services/returns.service';
import { PermissionsService } from '../../core/permissions.service';

@Component({
  selector: 'app-admin-returns-list',
  templateUrl: './returns-admin-list.component.html',
  styleUrls: ['./returns-admin-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminReturnsListComponent implements OnInit {
  readonly filterForm = this.fb.group({ status: [''] });
  readonly displayed = ['order', 'amount', 'status', 'requestedAt', 'actions'];

  data: Return[] = [];
  selected: Return | null = null;
  total = 0;
  page = 0;
  pageSize = 10;
  readonly pageSizes = [10, 25, 50, 100];

  loading = false;
  errorKey: string | null = null;
  lastError: any = null;

  constructor(
    private readonly returns: ReturnsService,
    private readonly fb: UntypedFormBuilder,
    private readonly dialog: MatDialog,
    private readonly toast: ToastService,
    private readonly i18n: TranslateService,
    private readonly cdr: ChangeDetectorRef,
    private readonly permissions: PermissionsService
  ) {}

  readonly canManage$ = this.permissions.can$('admin');

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.errorKey = null;
    this.lastError = null;
    this.cdr.markForCheck();

    const s = (this.filterForm.value.status || '') as ReturnStatus | '';
    const status = s ? (s as ReturnStatus) : undefined;
    this.returns.getReturns({ status, page: this.page + 1, limit: this.pageSize }).subscribe({
      next: (res: Paginated<Return>) => {
        this.data = (res.items || []) as Return[];
        this.total = res.total || 0;
        this.page = (res.page || 1) - 1;
        this.loading = false;

        if (this.selected) {
          const selectedId = this.selected._id || this.selected.id;
          this.selected = this.data.find((row) => (row._id || (row as any).id) === selectedId) || null;
        }

        this.cdr.markForCheck();
      },
      error: (err: any) => {
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

  open(row: Return): void {
    this.selected = row;
    this.cdr.markForCheck();
  }

  close(): void {
    this.selected = null;
    this.cdr.markForCheck();
  }

  approve(item: Return): void {
    this.confirm('returns.list.actions.approve', () => this.runAction(() => this.returns.approveReturn(item._id), 'returns.list.toasts.approved'));
  }

  reject(item: Return): void {
    this.confirm('returns.list.actions.reject', () => this.runAction(() => this.returns.rejectReturn(item._id), 'returns.list.toasts.rejected'));
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
      error: (err: any) => {
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
    ref.afterClosed().subscribe((ok: boolean) => {
      if (ok) {
        fn();
      }
    });
  }
}
