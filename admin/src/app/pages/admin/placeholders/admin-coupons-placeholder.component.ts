import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-coupons-placeholder',
  templateUrl: './admin-coupons-placeholder.component.html',
  styleUrls: ['./admin-placeholder.shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminCouponsPlaceholderComponent {
  readonly title = 'Coupon Management';
  readonly description = 'Configure coupon campaigns, track redemption, and audit promotion performance.';
  readonly checklist = ['Wire list + detail views to /api/admin/coupons', 'Add coupon creation workflow with validation', 'Surfacing usage analytics and expiration alerts'];
}
