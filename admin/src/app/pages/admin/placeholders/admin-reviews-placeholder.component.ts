import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-reviews-placeholder',
  templateUrl: './admin-reviews-placeholder.component.html',
  styleUrls: ['./admin-placeholder.shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminReviewsPlaceholderComponent {
  readonly title = 'Reviews Moderation';
  readonly description = 'Moderate customer feedback, highlight insights, and act on low ratings proactively.';
  readonly checklist = ['Connect moderation queue to /api/admin/reviews', 'Add sentiment and flag indicators', 'Support approve/hide actions with audit trail'];
}
