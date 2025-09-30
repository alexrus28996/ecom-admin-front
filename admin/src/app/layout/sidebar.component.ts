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

  readonly sectionLabels: Record<NonNullable<LayoutNavItem['section']>, string> = {
    overview: 'Overview',
    catalog: 'Catalog',
    operations: 'Operations',
    intelligence: 'Intelligence',
    governance: 'Governance'
  } as const;

  trackByRoute(_: number, item: LayoutNavItem): string {
    return item.route;
  }

  onNavigate(): void {
    if (this.handset) {
      this.closeMobile.emit();
    }
  }

  get groupedItems(): { key: NonNullable<LayoutNavItem['section']>; label: string; items: LayoutNavItem[] }[] {
    const groups = new Map<NonNullable<LayoutNavItem['section']>, LayoutNavItem[]>();
    for (const item of this.items || []) {
      const section = item.section ?? 'overview';
      if (!groups.has(section)) {
        groups.set(section, []);
      }
      groups.get(section)!.push(item);
    }

    return Array.from(groups.entries())
      .map(([key, items]) => ({
        key,
        label: this.sectionLabels[key] ?? key,
        items
      }))
      .sort((a, b) => this.sectionOrder(a.key) - this.sectionOrder(b.key));
  }

  private sectionOrder(key: NonNullable<LayoutNavItem['section']>): number {
    const order: NonNullable<LayoutNavItem['section']>[] = [
      'overview',
      'catalog',
      'operations',
      'intelligence',
      'governance'
    ];
    const index = order.indexOf(key);
    return index === -1 ? order.length : index;
  }
}

