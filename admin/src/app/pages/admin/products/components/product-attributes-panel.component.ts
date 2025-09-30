import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-product-attributes-panel',
  templateUrl: './product-attributes-panel.component.html',
  styleUrls: ['./product-attributes-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductAttributesPanelComponent {
  @Input() productId?: string;
  @Input() disabled = false;
  @Output() readonly changed = new EventEmitter<void>();
}
