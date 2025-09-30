import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-product-variants-panel',
  templateUrl: './product-variants-panel.component.html',
  styleUrls: ['./product-variants-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductVariantsPanelComponent {
  @Input() productId?: string;
  @Input() disabled = false;
  @Output() readonly changed = new EventEmitter<void>();
}
