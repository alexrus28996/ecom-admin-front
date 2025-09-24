import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl } from '@angular/forms';

import { PublicUser } from '../core/auth.service';

@Component({
  selector: 'app-topbar',
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TopbarComponent {
  @Input() searchControl: FormControl = new FormControl('');
  @Input() isDark = false;
  @Input() isHandset = false;
  @Input() user: PublicUser | null = null;

  @Output() menuClick = new EventEmitter<void>();
  @Output() toggleTheme = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() search = new EventEmitter<string>();

  get avatarInitials(): string {
    if (!this.user) {
      return 'NA';
    }
    const source = (this.user.name || this.user.email || '').trim();
    return source ? source.slice(0, 2).toUpperCase() : 'NA';
  }

  submit(): void {
    const value = (this.searchControl?.value || '').toString().trim();
    if (!value) {
      return;
    }
    this.search.emit(value);
  }
}
