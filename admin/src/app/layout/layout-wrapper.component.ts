import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { filter, map, shareReplay } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

import { AuthService } from '../core/auth.service';
import { ThemeService } from '../core/theme.service';
import { LayoutNavItem, BreadcrumbItem } from './layout.models';
import { PermissionsService } from '../core/permissions.service';
import { ContextSearchService, ContextSearchState } from '../core/context-search.service';

@Component({
  selector: 'app-layout-wrapper',
  templateUrl: './layout-wrapper.component.html',
  styleUrls: ['./layout-wrapper.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LayoutWrapperComponent implements OnInit {
  navItems: LayoutNavItem[] = [];
  private readonly navItemsSubject = new BehaviorSubject<LayoutNavItem[]>([]);

  readonly searchControl = new FormControl('');
  readonly isHandset$: Observable<boolean>;
  readonly visibleNav$: Observable<LayoutNavItem[]>;

  isDark = false;
  navCollapsed = false;
  mobileNavOpen = false;
  breadcrumbs: BreadcrumbItem[] = [];
  searchPlaceholder = 'Search the admin console…';
  searchModuleLabel: string | null = 'Global';
  searchHint: string | null = null;
  searchIcon = 'search';
  searchEnabled = true;

  private searchNavigateTo: string | null = '/admin/products';
  private searchQueryParam = 'q';
  private searchQueryExtras: ContextSearchState['queryExtras'];
  private searchPlaceholderLocked = false;

  constructor(
    public readonly auth: AuthService,
    private readonly router: Router,
    private readonly activatedRoute: ActivatedRoute,
    private readonly theme: ThemeService,
    private readonly permissions: PermissionsService,
    private readonly translate: TranslateService,
    private readonly contextSearch: ContextSearchService,
    breakpointObserver: BreakpointObserver
  ) {
    this.isHandset$ = breakpointObserver.observe([Breakpoints.Handset, Breakpoints.Tablet]).pipe(
      map((result) => result.matches),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.visibleNav$ = combineLatest([
      this.auth.user$,
      this.navItemsSubject.asObservable()
    ]).pipe(
      map(([, items]) => items.filter((item) => this.auth.hasAnyRole(item.roles))),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this.contextSearch.state$
      .pipe(takeUntilDestroyed())
      .subscribe((state) => this.applySearchState(state));
  }

  ngOnInit(): void {
    this.initializeNavItems();

    this.translate.onLangChange
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.initializeNavItems());

    this.theme.changes.pipe(takeUntilDestroyed()).subscribe((mode) => {
      this.isDark = mode === 'dark';
    });

    this.isHandset$.pipe(takeUntilDestroyed()).subscribe((isHandset) => {
      if (!isHandset) {
        this.mobileNavOpen = false;
      }
    });

    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed()
      )
      .subscribe(() => {
        this.mobileNavOpen = false;
        this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
        this.updateSearchPlaceholder();
      });

    this.breadcrumbs = this.buildBreadcrumbs(this.activatedRoute.root);
    this.updateSearchPlaceholder();
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
    if (!this.searchEnabled || !this.searchNavigateTo) {
      return;
    }

    const raw = value ?? this.searchControl.value;
    const search = (raw || '').toString().trim();

    if (!search) {
      return;
    }

    const target = this.resolveSearchTarget();
    const queryParams: Record<string, string | number | boolean | null> = {};

    if (this.searchQueryExtras) {
      Object.entries(this.searchQueryExtras).forEach(([key, extraValue]) => {
        if (extraValue !== undefined) {
          queryParams[key] = extraValue;
        }
      });
    }

    queryParams[this.searchQueryParam] = search;

    this.router.navigate([target], {
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  logout(): void {
    this.auth.logout();
    this.permissions.clear();
    this.router.navigate(['/login']);
  }

  private initializeNavItems(): void {
    const items: LayoutNavItem[] = [
      {
        label: this.translate.instant('shell.nav.dashboard') || 'Dashboard',
        icon: 'space_dashboard',
        route: '/dashboard',
        exact: true,
        section: 'overview'
      },
      {
        label: this.translate.instant('shell.nav.profile') || 'My Profile',
        icon: 'person',
        route: '/profile',
        section: 'overview'
      },
      {
        label: this.translate.instant('shell.nav.products') || 'Products',
        icon: 'inventory_2',
        route: '/admin/products',
        roles: ['admin'],
        section: 'catalog'
      },
      {
        label: this.translate.instant('shell.nav.categories') || 'Categories',
        icon: 'category',
        route: '/admin/categories',
        roles: ['admin'],
        section: 'catalog'
      },
      {
        label: this.translate.instant('shell.nav.inventory') || 'Inventory',
        icon: 'warehouse',
        route: '/admin/inventory',
        roles: ['admin'],
        section: 'operations'
      },
      {
        label: this.translate.instant('shell.nav.orders') || 'Orders',
        icon: 'assignment',
        route: '/admin/orders',
        roles: ['admin'],
        section: 'operations'
      },
      {
        label: this.translate.instant('shell.nav.shipments') || 'Shipments',
        icon: 'local_shipping',
        route: '/admin/shipments',
        roles: ['admin'],
        section: 'operations'
      },
      {
        label: this.translate.instant('shell.nav.returns') || 'Returns',
        icon: 'assignment_return',
        route: '/admin/returns',
        roles: ['admin'],
        section: 'operations'
      },
      {
        label: this.translate.instant('shell.nav.payments') || 'Payments',
        icon: 'credit_card',
        route: '/admin/transactions',
        roles: ['admin'],
        section: 'operations'
      },
      {
        label: this.translate.instant('shell.nav.reports') || 'Reports',
        icon: 'insights',
        route: '/admin/reports',
        roles: ['admin'],
        section: 'intelligence'
      },
      {
        label: this.translate.instant('shell.nav.auditLogs') || 'Audit Logs',
        icon: 'fact_check',
        route: '/admin/audit-logs',
        roles: ['admin'],
        section: 'governance'
      },
      {
        label: this.translate.instant('shell.nav.usersPermissions') || 'Users & Permissions',
        icon: 'shield_person',
        route: '/admin/users',
        roles: ['admin'],
        section: 'governance'
      }
    ];

    this.navItems = items;
    this.navItemsSubject.next(items);
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

  private updateSearchPlaceholder(): void {
    if (this.searchPlaceholderLocked) {
      return;
    }

    this.searchPlaceholder = this.computeDefaultPlaceholder();
  }

  private computeDefaultPlaceholder(): string {
    const routeWithData = this.findDeepestRoute(this.activatedRoute);
    const explicitPlaceholder = routeWithData.snapshot.data?.['searchPlaceholder'];
    if (typeof explicitPlaceholder === 'string' && explicitPlaceholder.trim().length > 0) {
      return explicitPlaceholder;
    }

    const lastCrumb = this.breadcrumbs[this.breadcrumbs.length - 1];
    if (lastCrumb?.label) {
      return `Search ${lastCrumb.label.toLowerCase()}…`;
    }

    return 'Search the admin console…';
  }

  private findDeepestRoute(route: ActivatedRoute): ActivatedRoute {
    let current = route;
    while (current.firstChild) {
      current = current.firstChild;
    }
    return current;
  }

  private resolveSearchTarget(): string {
    if (this.searchNavigateTo) {
      return this.searchNavigateTo;
    }

    const explicit = this.findDeepestRoute(this.activatedRoute).snapshot.data?.['searchRoute'];
    if (typeof explicit === 'string' && explicit.trim().length > 0) {
      return explicit;
    }

    const url = this.router.url;
    if (url.startsWith('/admin/orders')) {
      return '/admin/orders';
    }
    if (url.startsWith('/admin/transactions') || url.startsWith('/admin/payments')) {
      return '/admin/transactions';
    }
    if (url.startsWith('/admin/returns')) {
      return '/admin/returns';
    }
    if (url.startsWith('/admin/shipments')) {
      return '/admin/shipments';
    }
    if (url.startsWith('/admin/inventory')) {
      return '/admin/inventory';
    }
    if (url.startsWith('/admin/categories')) {
      return '/admin/categories';
    }
    if (url.startsWith('/admin/users') || url.startsWith('/admin/permissions')) {
      return '/admin/users';
    }
    if (url.startsWith('/admin/reports')) {
      return '/admin/reports';
    }
    if (url.startsWith('/admin/audit-logs')) {
      return '/admin/audit-logs';
    }
    return '/admin/products';
  }

  private applySearchState(state: ContextSearchState): void {
    const moduleLabel = state.moduleLabel?.trim();
    this.searchModuleLabel = moduleLabel && moduleLabel.length ? moduleLabel : null;

    const hint = state.hint?.trim();
    this.searchHint = hint && hint.length ? hint : null;

    const icon = state.icon?.trim();
    this.searchIcon = icon && icon.length ? icon : 'search';

    this.searchEnabled = !!state.enabled;
    const navigateTo = state.navigateTo?.trim();
    this.searchNavigateTo = navigateTo && navigateTo.length ? navigateTo : null;

    const queryParam = state.queryParam?.trim();
    this.searchQueryParam = queryParam && queryParam.length ? queryParam : 'q';
    this.searchQueryExtras = state.queryExtras;

    const placeholder = state.placeholder?.trim();
    if (placeholder && placeholder.length) {
      this.searchPlaceholder = placeholder;
      this.searchPlaceholderLocked = true;
    } else {
      this.searchPlaceholderLocked = false;
      this.searchPlaceholder = this.computeDefaultPlaceholder();
    }

    if (this.searchEnabled) {
      if (this.searchControl.disabled) {
        this.searchControl.enable({ emitEvent: false });
      }
    } else if (this.searchControl.enabled) {
      this.searchControl.disable({ emitEvent: false });
    }

    if (state.presetValue !== undefined) {
      const nextValue = state.presetValue ?? '';
      if (this.searchControl.value !== nextValue) {
        this.searchControl.setValue(nextValue, { emitEvent: false });
      }
    }
  }
}
