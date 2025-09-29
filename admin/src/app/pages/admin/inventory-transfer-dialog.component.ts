import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap, takeUntil } from 'rxjs';

import { InventoryLocation, TransferOrder } from '../../services/api.types';
import { ProductsService, ProductSummary } from '../../services/products.service';
import { CreateTransferPayload, TransferLinePayload, TransferService } from '../../services/transfer.service';
import { ToastService } from '../../core/toast.service';

export interface InventoryTransferDialogData {
  locations: InventoryLocation[];
}

export interface InventoryTransferDialogResult {
  created: boolean;
  transfer?: TransferOrder;
}

interface ProductOption {
  product: ProductSummary;
  label: string;
  subtitle?: string;
}

interface VariantOption {
  id: string;
  label: string;
}

interface TransferLineContext {
  options: ProductOption[];
  variantOptions: VariantOption[];
  loadingProducts: boolean;
  loadingVariants: boolean;
  destroy$: Subject<void>;
}

@Component({
  selector: 'app-inventory-transfer-dialog',
  templateUrl: './inventory-transfer-dialog.component.html',
  styleUrls: ['./inventory-transfer-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventoryTransferDialogComponent implements OnDestroy {
  readonly form = this.fb.group({
    fromLocationId: ['', Validators.required],
    toLocationId: ['', Validators.required],
    lines: this.fb.array([] as FormGroup[])
  });

  readonly locations = this.data.locations || [];
  readonly destroy$ = new Subject<void>();
  readonly lineContexts: TransferLineContext[] = [];
  saving = false;

  constructor(
    private readonly dialogRef: MatDialogRef<InventoryTransferDialogComponent, InventoryTransferDialogResult | undefined>,
    @Inject(MAT_DIALOG_DATA) public readonly data: InventoryTransferDialogData,
    private readonly fb: FormBuilder,
    private readonly products: ProductsService,
    private readonly transfers: TransferService,
    private readonly toast: ToastService,
    private readonly cdr: ChangeDetectorRef
  ) {
    this.addLine();
  }

  get linesArray(): FormArray<FormGroup> {
    return this.form.controls.lines as FormArray<FormGroup>;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.lineContexts.forEach((context) => {
      context.destroy$.next();
      context.destroy$.complete();
    });
  }

  addLine(): void {
    const lineGroup = this.fb.group({
      productSearch: [''],
      productId: ['', Validators.required],
      variantId: [''],
      quantity: [1, [Validators.required, Validators.min(1)]]
    });
    this.linesArray.push(lineGroup);
    const context: TransferLineContext = {
      options: [],
      variantOptions: [],
      loadingProducts: false,
      loadingVariants: false,
      destroy$: new Subject<void>()
    };
    this.lineContexts.push(context);
    this.registerProductSearch(lineGroup, context);
    this.cdr.markForCheck();
  }

  removeLine(index: number): void {
    if (this.linesArray.length === 1) {
      return;
    }
    const context = this.lineContexts[index];
    context.destroy$.next();
    context.destroy$.complete();
    this.linesArray.removeAt(index);
    this.lineContexts.splice(index, 1);
    this.cdr.markForCheck();
  }

  displayProduct(option?: ProductOption | string | null): string {
    if (!option) {
      return '';
    }
    if (typeof option === 'string') {
      return option;
    }
    return option.label;
  }

  onProductSelected(index: number, event: MatAutocompleteSelectedEvent): void {
    const option = event.option.value as ProductOption | null;
    if (!option) {
      return;
    }
    const line = this.linesArray.at(index);
    const context = this.lineContexts[index];
    line.patchValue({
      productId: option.product._id || '',
      variantId: '',
      productSearch: option.label
    }, { emitEvent: false });
    this.loadVariantsForLine(index, option.product._id || '');
    context.options = [];
  }

  clearProduct(index: number): void {
    const line = this.linesArray.at(index);
    const context = this.lineContexts[index];
    line.patchValue({ productId: '', variantId: '', productSearch: '' }, { emitEvent: false });
    context.options = [];
    context.variantOptions = [];
    this.cdr.markForCheck();
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.fromLocationId === raw.toLocationId) {
      this.toast.error('Source and destination must be different.');
      return;
    }
    const lines: TransferLinePayload[] = raw.lines.map((line) => ({
      productId: line.productId,
      variantId: line.variantId || undefined,
      quantity: Number(line.quantity)
    }));
    const payload: CreateTransferPayload = {
      fromLocationId: raw.fromLocationId as string,
      toLocationId: raw.toLocationId as string,
      lines
    };

    this.saving = true;
    this.cdr.markForCheck();
    this.transfers.create(payload).subscribe({
      next: (transfer) => {
        this.saving = false;
        this.cdr.markForCheck();
        this.dialogRef.close({ created: true, transfer });
      },
      error: (error) => {
        this.saving = false;
        this.toast.error(this.resolveError(error));
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void {
    this.dialogRef.close({ created: false });
  }

  trackLine(index: number): number {
    return index;
  }

  private registerProductSearch(group: FormGroup, context: TransferLineContext): void {
    group.controls['productSearch']
      .valueChanges.pipe(
        takeUntil(context.destroy$),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((term: string) => {
          const query = (term || '').trim();
          if (!query) {
            context.options = [];
            context.loadingProducts = false;
            this.cdr.markForCheck();
            return of({ items: [] });
          }
          context.loadingProducts = true;
          this.cdr.markForCheck();
          return this.products.list({ q: query, limit: 8 });
        })
      )
      .subscribe({
        next: (res) => {
          const items = res?.items || [];
          context.options = items.map((product: ProductSummary) => ({
            product,
            label: product.name || product._id || 'Product',
            subtitle: product.sku || undefined
          }));
          context.loadingProducts = false;
          this.cdr.markForCheck();
        },
        error: () => {
          context.options = [];
          context.loadingProducts = false;
          this.cdr.markForCheck();
        }
      });
  }

  private loadVariantsForLine(index: number, productId: string): void {
    const context = this.lineContexts[index];
    context.loadingVariants = true;
    context.variantOptions = [];
    this.cdr.markForCheck();
    this.products
      .get(productId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          const product = response?.product;
          context.variantOptions = (product?.variants || []).map((variant: any) => ({
            id: variant?._id || variant?.sku || '',
            label: variant?.sku || variant?.name || 'Variant'
          }));
          context.loadingVariants = false;
          this.cdr.markForCheck();
        },
        error: () => {
          context.loadingVariants = false;
          this.toast.error('Unable to load variants for the selected product.');
          this.cdr.markForCheck();
        }
      });
  }

  private resolveError(error: any): string {
    return (
      error?.error?.error?.message ||
      error?.message ||
      'Unable to create transfer. Please try again.'
    );
  }
}
