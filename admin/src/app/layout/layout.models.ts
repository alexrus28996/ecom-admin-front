export interface LayoutNavItem {
  readonly label: string;
  readonly icon: string;
  readonly route: string;
  readonly roles?: readonly string[];
  readonly exact?: boolean;
  readonly section?: 'overview' | 'catalog' | 'operations' | 'intelligence' | 'governance';
}

export interface BreadcrumbItem {
  readonly label: string;
  readonly url?: string;
  readonly icon?: string;
  readonly translationKey?: string;
}
