import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from '../core/auth.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  constructor(
    private readonly auth: AuthService,
    private readonly translate: TranslateService
  ) {
    this.translate.addLangs(['en', 'fr']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  ngOnInit(): void {
    if (!this.auth.token) {
      return;
    }

    this.auth.loadContext({ force: true }).subscribe({
      next: (state) => {
        console.debug('[AppComponent] Authorization context ready', state);
      },
      error: (err) => {
        console.error('[AppComponent] Failed to load authorization context', err);
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
