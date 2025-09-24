import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from '../core/auth.service';
import { PermissionsService } from '../core/permissions.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  constructor(
    private readonly auth: AuthService,
    private readonly translate: TranslateService,
    private readonly permissions: PermissionsService
  ) {
    this.translate.addLangs(['en', 'fr']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  ngOnInit(): void {
    if (!this.auth.token) {
      return;
    }

    this.auth.getCurrentUser().subscribe({
      next: (user) => {
        console.log('Current user loaded:', user);
      },
      error: (err) => {
        console.error('Error loading current user:', err);
      }
    });

    this.permissions.load().subscribe({
      next: (permissions) => {
        console.log('Permissions loaded:', permissions);
      },
      error: (err) => {
        console.error('Error loading permissions:', err);
      }
    });

    this.auth.getPreferences().subscribe({
      next: ({ preferences }) => {
        if (preferences?.locale) {
          this.translate.use(preferences.locale);
        }
      },
      error: (err) => {
        console.error('Error loading preferences:', err);
      }
    });
  }
}
