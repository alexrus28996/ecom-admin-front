import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { map, shareReplay } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../../core/auth.service';
import { ThemeService } from '../../core/theme.service';

interface LayoutNavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly roles?: readonly string[];
}

@Component({
  selector: 'app-layout-shell',
  templateUrl: './layout-shell.component.html',
  styleUrls: ['./layout-shell.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutShellComponent implements OnInit {
  readonly navItems: LayoutNavItem[] = [
    { label: 'Dashboard', icon: 'space_dashboard', route: '/dashboard' },
    { label: 'Products', icon: 'inventory_2', route: '/products', roles: ['admin'] },
    { label: 'Orders', icon: 'receipt_long', route: '/admin/orders', roles: ['admin'] },
    { label: 'Users', icon: 'group', route: '/admin/users', roles: ['admin'] },
    { label: 'Inventory', icon: 'warehouse', route: '/admin/inventory', roles: ['admin'] },
    { label: 'Returns', icon: 'assignment_return', route: '/admin/returns', roles: ['admin'] },
    { label: 'Coupons', icon: 'confirmation_number', route: '/admin/coupons', roles: ['admin'] },
    { label: 'Settings', icon: 'settings', route: '/admin/settings', roles: ['admin'] }
  ];

  readonly isHandset$: Observable<boolean>;
  readonly visibleNav$: Observable<LayoutNavItem[]>;
  readonly searchControl = new FormControl('');

  navCollapsed = false;
  mobileNavOpen = false;
  isDark = false;

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly theme: ThemeService,
    breakpointObserver: BreakpointObserver,
    private readonly destroyRef: DestroyRef
  ) {
    this.isHandset$ = breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Tablet]).pipe(
      map((result) => result.matches),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.visibleNav$ = this.auth.user$.pipe(
      map(() => this.navItems.filter((item) => this.shouldDisplay(item))),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  ngOnInit(): void {
    this.theme.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((mode) => {
      this.isDark = mode === 'dark';
    });

    this.isHandset$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isHandset) => {
      if (!isHandset) {
        this.mobileNavOpen = false;
      }
    });
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleSidebar(): void {
    if (this.mobileNavOpen) {
      this.mobileNavOpen = false;
      return;
    }

    this.navCollapsed = !this.navCollapsed;
  }

  openMobileNav(): void {
    this.mobileNavOpen = true;
  }

  closeMobileNav(): void {
    this.mobileNavOpen = false;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  submitSearch(): void {
    const value = (this.searchControl.value || '').toString().trim();

    if (!value) {
      return;
    }

    this.router.navigate(['/products'], { queryParams: { q: value } });
  }

  shouldDisplay(item: LayoutNavItem): boolean {
    return this.auth.hasAnyRole(item.roles);
  }
}
