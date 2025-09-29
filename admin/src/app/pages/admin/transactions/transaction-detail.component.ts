import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { EMPTY, Subject, switchMap, takeUntil } from 'rxjs';

import { TransactionsService } from '../../../services/transactions.service';
import { Transaction } from '../../../services/api.types';
import { ToastService } from '../../../core/toast.service';
import { AuditService } from '../../../services/audit.service';

@Component({
  selector: 'app-transaction-detail',
  templateUrl: './transaction-detail.component.html',
  styleUrls: ['./transaction-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TransactionDetailComponent implements OnInit, OnDestroy {
  transaction?: Transaction;
  loading = true;
  error?: string;

  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
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
            this.error = 'Transaction not found';
            this.loading = false;
            this.cdr.markForCheck();
            return EMPTY;
          }
          this.audit.log({ action: 'transactions.view', entity: 'transaction', entityId: id }).subscribe();
          this.loading = true;
          this.cdr.markForCheck();
          return this.transactionsService.getTransaction(id);
        })
      )
      .subscribe({
        next: (transaction) => {
          if (!transaction) {
            this.error = 'Transaction not found';
          } else {
            this.transaction = transaction;
            this.error = undefined;
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = err?.error?.error?.message ?? 'Failed to load transaction detail';
          this.toast.error(this.error ?? 'Failed to load transaction detail');
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
    this.router.navigate(['/admin/transactions']);
  }

  get rawPayload(): string {
    if (!this.transaction) {
      return '';
    }
    const payload = this.transaction.rawPayload ?? this.transaction.metadata ?? {};
    try {
      return JSON.stringify(payload, null, 2);
    } catch (error) {
      return String(payload);
    }
  }
}
