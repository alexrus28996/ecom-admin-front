import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AdminProductsService } from '../services/products.service';
import { Product } from '../models/product';

@Component({
  selector: 'app-product-view',
  templateUrl: './product-view.component.html',
  styleUrls: ['./product-view.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductViewComponent implements OnInit, OnDestroy {
  product?: Product;
  loading = false;
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly route: ActivatedRoute, private readonly products: AdminProductsService) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      if (!id) {
        return;
      }
      this.loading = true;
      this.products.get(id).subscribe({
        next: product => {
          this.product = product;
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
