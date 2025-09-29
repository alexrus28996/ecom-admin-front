import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';

import { Refund } from '../../../services/api.types';
import { RefundsService } from '../../../services/refunds.service';
import { ToastService } from '../../../core/toast.service';
import { AuditService } from '../../../services/audit.service';
import { PermissionsService } from '../../../core/permissions.service';

@Component({
  selector: 'app-refunds-list',
  templateUrl: './refunds-list.component.html',
  styleUrls: ['./refunds-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RefundsListComponent implements OnInit, OnDestroy {
  readonly filtersForm = this.fb.group({
    orderId: [''],
    status: [''],
    range: this.fb.group({
      start: [null as Date | null],
      end: [null as Date | null]
    })
  });

  readonly displayedColumns = ['id', 'orderId', 'status', 'amount', 'createdAt', 'actions'];
  readonly statusOptions = [
    { value: '', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'succeeded', label: 'Succeeded' },
    { value: 'failed', label: 'Failed' }
  ];

  refunds: Refund[] = [];
  total = 0;
  pageIndex = 0;
  pageSize = 20;
  loading = false;
  exportInFlight = false;
  readOnly = false;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly refundsService: RefundsService,
    private readonly toast: ToastService,
    private readonly audit: AuditService,
    private readonly permissions: PermissionsService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.readOnly = !this.permissions.can('payments.manage', true);
    this.load();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();

    const filters = this.filtersForm.value;
    const params: any = {
      page: this.pageIndex + 1,
      limit: this.pageSize
    };

    if (filters.orderId) params.orderId = filters.orderId;
    if (filters.status) params.status = filters.status;

    const start = filters.range?.start;
    const end = filters.range?.end;
    if (start) params.dateStart = new Date(start).toISOString();
    if (end) params.dateEnd = new Date(end).toISOString();

    this.refundsService
      .getRefunds(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.refunds = response.data ?? response.items ?? [];
          this.total = response.total ?? this.refunds.length;
          this.pageIndex = Math.max(0, (response.page ?? 1) - 1);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.toast.error(err?.error?.error?.message ?? 'Unable to load refunds');
          this.cdr.markForCheck();
        }
      });
  }

  applyFilters(): void {
    this.pageIndex = 0;
    this.load();
    this.audit.log({ action: 'refunds.filter', metadata: this.buildFilterMetadata() }).subscribe();
  }

  resetFilters(): void {
    this.filtersForm.reset({
      orderId: '',
      status: '',
      range: { start: null, end: null }
    });
    this.applyFilters();
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  viewRefund(refund: Refund): void {
    this.audit.log({ action: 'refunds.view', entity: 'refund', entityId: refund._id }).subscribe();
    this.router.navigate(['/admin/refunds', refund._id]);
  }

  exportRefunds(): void {
    if (this.exportInFlight || this.readOnly) {
      return;
    }

    this.exportInFlight = true;
    this.cdr.markForCheck();
    const filters = this.buildFilterMetadata();

    this.refundsService
      .exportRefunds(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadBlob(blob, `refunds-${new Date().toISOString()}.csv`);
          this.toast.success('Refunds exported');
          this.audit.log({ action: 'refunds.export', metadata: filters }).subscribe();
          this.exportInFlight = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.exportInFlight = false;
          this.toast.error(err?.error?.error?.message ?? 'Export failed');
          this.cdr.markForCheck();
        }
      });
  }

  statusClass(status: string): string {
    const normalized = (status ?? '').toLowerCase();
    if (normalized === 'succeeded' || normalized === 'completed') {
      return 'status-pill success';
    }
    if (normalized === 'failed') {
      return 'status-pill error';
    }
    if (normalized === 'pending') {
      return 'status-pill pending';
    }
    return 'status-pill';
  }

  private buildFilterMetadata(): Record<string, unknown> {
    const filters = this.filtersForm.value;
    const metadata: Record<string, unknown> = {};
    if (filters.orderId) metadata.orderId = filters.orderId;
    if (filters.status) metadata.status = filters.status;
    if (filters.range?.start) metadata.dateStart = new Date(filters.range.start).toISOString();
    if (filters.range?.end) metadata.dateEnd = new Date(filters.range.end).toISOString();
    return metadata;
  }

  private downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
