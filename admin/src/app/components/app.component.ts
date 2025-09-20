import { ChangeDetectionStrategy, Component, DestroyRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { MatSidenav } from '@angular/material/sidenav';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';

interface ShellNavItem {
  labelKey: string;
  icon: string;
  route: string;
  requiredRoles?: readonly string[];
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  readonly primaryNav: ShellNavItem[] = [
    { labelKey: 'shell.nav.dashboard', icon: 'dashboard', route: '/dashboard' },
    { labelKey: 'shell.nav.products', icon: 'inventory_2', route: '/products', requiredRoles: ['admin'] },
    { labelKey: 'shell.nav.addresses', icon: 'location_on', route: '/addresses' },
    { labelKey: 'shell.nav.cart', icon: 'shopping_cart', route: '/cart' },
    { labelKey: 'shell.nav.orders', icon: 'assignment', route: '/orders' }
  ];

  readonly adminNav: ShellNavItem[] = [
    { labelKey: 'shell.nav.admin.users', icon: 'admin_panel_settings', route: '/admin/users', requiredRoles: ['admin'] },
    { labelKey: 'shell.nav.admin.orders', icon: 'insights', route: '/admin/orders', requiredRoles: ['admin'] },
    { labelKey: 'shell.nav.admin.categories', icon: 'category', route: '/admin/categories', requiredRoles: ['admin'] },
    { labelKey: 'shell.nav.admin.returns', icon: 'assignment_return', route: '/admin/returns', requiredRoles: ['admin'] },
    { labelKey: 'shell.nav.admin.inventory', icon: 'inventory', route: '/admin/inventory', requiredRoles: ['admin'] }
  ];

  readonly isHandset$: Observable<boolean>;
  readonly visibleAdminNav$: Observable<ShellNavItem[]>;
  isHandset = false;
  isDark = false;
  navCollapsed = false;

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly theme: ThemeService,
    breakpointObserver: BreakpointObserver,
    private readonly translate: TranslateService,
    private readonly destroyRef: DestroyRef
  ) {
    this.isHandset$ = breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Tablet]).pipe(
      map((result) => result.matches),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.visibleAdminNav$ = this.auth.user$.pipe(
      map(() => this.adminNav.filter((item) => this.shouldDisplay(item))),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.translate.addLangs(['en']);
    this.translate.setDefaultLang('en');
    this.translate.use('en');
  }

  ngOnInit(): void {
    if (this.auth.token) {
      this.auth
        .getCurrentUser()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: () => {}, error: () => {} });
      // Load preferences (locale) after auth
      this.auth
        .getPreferences()
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({ next: ({ preferences }) => { if (preferences?.locale) this.translate.use(preferences.locale); }, error: () => {} });
    }

    this.theme.changes
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((mode) => (this.isDark = mode === 'dark'));

    this.isHandset$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => (this.isHandset = value));
  }

  toggleTheme(): void {
    this.theme.toggle();
  }

  toggleNavCollapse(): void {
    if (this.isHandset) {
      return;
    }

    this.navCollapsed = !this.navCollapsed;
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  trackByRoute(_: number, item: ShellNavItem): string {
    return item.route;
  }

  shouldDisplay(item: ShellNavItem): boolean {
    return this.auth.hasAnyRole(item.requiredRoles);
  }

  onNavigate(drawer: MatSidenav): void {
    if (this.isHandset) {
      drawer.close();
    }
  }
}
