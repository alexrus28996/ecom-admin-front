import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-shipments-placeholder',
  templateUrl: './admin-shipments-placeholder.component.html',
  styleUrls: ['./admin-placeholder.shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminShipmentsPlaceholderComponent {
  readonly title = 'Shipments Orchestration';
  readonly description = 'Track fulfillment pipelines, carrier SLAs, and delivery health in real time.';
  readonly checklist = ['Hook list to /api/admin/shipments with filters', 'Add create shipment modal connected to orders', 'Surface carrier tracking timeline + SLA breach alerts'];
}
