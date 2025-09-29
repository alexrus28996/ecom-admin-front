import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subject, switchMap, takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { Refund, Transaction } from '../../../services/api.types';
import { RefundsService } from '../../../services/refunds.service';
import { TransactionsService } from '../../../services/transactions.service';
import { ToastService } from '../../../core/toast.service';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-refund-detail',
  templateUrl: './refund-detail.component.html',
  styleUrls: ['./refund-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RefundDetailComponent implements OnInit, OnDestroy {
  refund?: Refund;
  transaction?: Transaction;
  loading = true;
  transactionLoading = false;
  error?: string;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly refundsService: RefundsService,
    private readonly transactionsService: TransactionsService,
    private readonly toast: ToastService,
    private readonly audit: AuditService,
    private readonly cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        takeUntil(this.destroy$),
        switchMap((params) => {
          const id = params.get('id');
          if (!id) {
            this.error = 'Refund not found';
            this.loading = false;
            this.cdr.markForCheck();
            return EMPTY;
          }
          this.audit.log({ action: 'refunds.view', entity: 'refund', entityId: id }).subscribe();
          this.loading = true;
          this.cdr.markForCheck();
          return this.refundsService.getRefund(id);
        })
      )
      .subscribe({
        next: (refund) => {
          this.refund = refund;
          this.loading = false;
          this.error = undefined;
          this.cdr.markForCheck();
          this.loadTransaction();
        },
        error: (err) => {
          this.error = err?.error?.error?.message ?? 'Failed to load refund detail';
          this.toast.error(this.error);
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  back(): void {
    this.router.navigate(['/admin/refunds']);
  }

  goToTransaction(): void {
    if (this.transaction?._id) {
      this.router.navigate(['/admin/transactions', this.transaction._id]);
    }
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

  private loadTransaction(): void {
    const transactionRef = this.refund?.transaction;
    if (!transactionRef) {
      this.transaction = undefined;
      return;
    }

    if (typeof transactionRef !== 'string') {
      this.transaction = transactionRef as Transaction;
      this.cdr.markForCheck();
      return;
    }

    this.transactionLoading = true;
    this.transactionsService
      .getTransaction(transactionRef)
      .pipe(
        finalize(() => {
          this.transactionLoading = false;
          this.cdr.markForCheck();
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (transaction) => {
          this.transaction = transaction;
        },
        error: () => {
          this.transaction = undefined;
        }
      });
  }
}
