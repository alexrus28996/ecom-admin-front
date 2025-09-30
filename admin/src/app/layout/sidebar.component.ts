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

  trackByRoute(_: number, item: LayoutNavItem): string {
    return item.route;
  }

  onNavigate(): void {
    if (this.handset) {
      this.closeMobile.emit();
    }
  }

  getMainItems(): LayoutNavItem[] {
    const mainRoutes = ['/dashboard', '/orders', '/cart', '/addresses', '/profile'];
    return (this.items || []).filter(item => mainRoutes.includes(item.route));
  }

  getAdminItems(): LayoutNavItem[] {
    const adminRoutes = ['/admin'];
    return (this.items || []).filter(item =>
      item.route.startsWith('/admin') && !adminRoutes.includes(item.route)
    );
  }
}

