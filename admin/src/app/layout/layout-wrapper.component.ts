import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, DestroyRef, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { LayoutNavItem, BreadcrumbItem } from './layout.models';
import { PermissionsService } from '../core/permissions.service';

@Component({
  selector: 'app-layout-wrapper',
  templateUrl: './layout-wrapper.component.html',
  styleUrls: ['./layout-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutWrapperComponent implements OnInit {
  navItems: LayoutNavItem[] = [];

  readonly searchControl = new FormControl('');
  readonly isHandset$: Observable<boolean>;
  readonly visibleNav$: Observable<LayoutNavItem[]>;

  isDark = false;
  navCollapsed = false;
  mobileNavOpen = false;
  breadcrumbs: BreadcrumbItem[] = [];

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly theme: ThemeService,
    private readonly permissions: PermissionsService,
    private readonly translate: TranslateService,
    breakpointObserver: BreakpointObserver,
    private readonly destroyRef: DestroyRef
  ) {
    this.isHandset$ = breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Tablet]).pipe(
      map((result) => result.matches),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.visibleNav$ = this.auth.user$.pipe(
      map((user) => {
        console.log('User changed:', user);
        console.log('User roles:', user?.roles);
        const filtered = this.navItems.filter((item) => {
          const hasRole = this.auth.hasAnyRole(item.roles);
          console.log(`Item: ${item.label}, Required roles: ${JSON.stringify(item.roles)}, Has role: ${hasRole}`);
          return hasRole;
        });
        console.log('Visible nav items:', filtered);
        return filtered;
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
  }

  ngOnInit(): void {
    this.initializeNavItems();

    this.theme.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((mode) => {
      this.isDark = mode === 'dark';
    });

    this.isHandset$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((isHandset) => {
      if (!isHandset) {
        this.mobileNavOpen = false;
      }
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.mobileNavOpen = false;
        this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
      });

    // Seed initial breadcrumbs on load
    this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
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

  submitSearch(value?: string): void {
    const raw = value ?? this.searchControl.value;
    const search = (raw || '').toString().trim();

    if (!search) {
      return;
    }

    this.router.navigate(['/admin/products'], { queryParams: { q: search } });
  }

  logout(): void {
    this.auth.logout();
    this.permissions.clear();
    this.router.navigate(['/login']);
  }

  private initializeNavItems(): void {
    this.navItems = [
      { label: this.translate.instant('shell.nav.dashboard'), icon: 'grid_view', route: '/dashboard', exact: true },
      { label: this.translate.instant('shell.nav.orders'), icon: 'receipt_long', route: '/orders' },
      { label: this.translate.instant('shell.nav.cart'), icon: 'shopping_cart', route: '/cart' },
      { label: this.translate.instant('shell.nav.addresses'), icon: 'location_on', route: '/addresses' },
      { label: this.translate.instant('shell.nav.profile'), icon: 'person', route: '/profile' },
      { label: this.translate.instant('shell.nav.products'), icon: 'inventory_2', route: '/admin/products', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.orders'), icon: 'receipt_long', route: '/admin/orders', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.users'), icon: 'group', route: '/admin/users', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.categories'), icon: 'category', route: '/admin/categories', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.inventory'), icon: 'warehouse', route: '/admin/inventory', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.returns'), icon: 'assignment_return', route: '/admin/returns', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.reviews'), icon: 'reviews', route: '/admin/reviews', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.shipments'), icon: 'local_shipping', route: '/admin/shipments', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.coupons'), icon: 'confirmation_number', route: '/admin/coupons', roles: ['admin'] },
      { label: this.translate.instant('shell.nav.admin.settings'), icon: 'settings', route: '/admin/settings', roles: ['admin'] }
    ];
  }

  private buildBreadcrumbs(route: ActivatedRoute, url = '', breadcrumbs: BreadcrumbItem[] = []): BreadcrumbItem[] {
    const children = route.children;

    if (!children || children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      if (child.outlet !== 'primary') {
        continue;
      }

      const routeURL = child.snapshot.url.map((segment) => segment.path).join('/');
      const nextUrl = routeURL ? `${url}/${routeURL}` : url;
      const data = child.snapshot.data;

      if (data && data['breadcrumb']) {
        const breadcrumbKey = `breadcrumb.${data['breadcrumb']}`;
        breadcrumbs = [
          ...breadcrumbs,
          {
            label: data['breadcrumb'] as string,
            url: nextUrl || '/',
            translationKey: breadcrumbKey
          }
        ];
      }

      return this.buildBreadcrumbs(child, nextUrl, breadcrumbs);
    }

    return breadcrumbs;
  }
}
