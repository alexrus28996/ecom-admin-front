import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-admin-settings-placeholder',
  templateUrl: './admin-settings-placeholder.component.html',
  styleUrls: ['./admin-placeholder.shared.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminSettingsPlaceholderComponent {
  readonly title = 'Platform Settings';
  readonly description = 'Centralize environment, integrations, and security settings with auditability.';
  readonly checklist = ['Group configuration into tabs (general, payments, notifications)', 'Wire save actions to settings endpoints once exposed', 'Implement audit log + change tracking'];
}
