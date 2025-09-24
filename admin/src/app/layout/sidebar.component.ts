import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { LayoutNavItem } from './layout.models';

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SidebarComponent {
  @Input() items: LayoutNavItem[] | null = [];
  @Input() collapsed = false;
  @Input() mobileOpen = false;
  @Input() handset = false;

  @Output() toggleCollapse = new EventEmitter<void>();
  @Output() closeMobile = new EventEmitter<void>();

  readonly logo = 'EA';

  trackByRoute(_: number, item: LayoutNavItem): string {
    return item.route;
  }

  onNavigate(): void {
    if (this.handset) {
      this.closeMobile.emit();
    }
  }
}
