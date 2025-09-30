import { ChangeDetectionStrategy, Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { AdminProductsService, ProductReferencesResponse } from '../services/products.service';
import { Product } from '../models/product';
import { ToastService } from '../../../../core/toast.service';

interface DialogData {
  product: Product;
}

@Component({
  selector: 'app-product-delete-references-dialog',
  templateUrl: './product-delete-references-dialog.component.html',
  styleUrls: ['./product-delete-references-dialog.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDeleteReferencesDialogComponent implements OnInit {
  references?: ProductReferencesResponse;
  loading = false;
  canDelete = false;
  error?: string;

  constructor(
    private readonly dialogRef: MatDialogRef<ProductDeleteReferencesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) private readonly data: DialogData,
    private readonly products: AdminProductsService,
    private readonly toast: ToastService
  ) {}

  get product(): Product {
    return this.data.product;
  }

  ngOnInit(): void {
    this.loading = true;
    this.products.references(this.product._id).subscribe({
      next: refs => {
        this.references = refs;
        this.loading = false;
        this.canDelete = Object.values(refs).every(count => count === 0);
      },
      error: () => {
        this.error = 'Failed to load references';
        this.loading = false;
      }
    });
  }

  close(): void {
    this.dialogRef.close();
  }

  confirmDelete(): void {
    this.loading = true;
    this.products.delete(this.product._id).subscribe({
      next: () => {
        this.loading = false;
        this.toast.success('Product deleted');
        this.dialogRef.close({ deleted: true });
      },
      error: () => {
        this.loading = false;
        this.toast.error('Unable to delete product');
      }
    });
  }
}
