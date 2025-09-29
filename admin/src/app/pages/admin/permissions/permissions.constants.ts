export interface PermissionToggleDefinition {
  code: string;
  label: string;
  description: string;
}

export interface PermissionDomainDefinition {
  key: string;
  title: string;
  icon: string;
  permissions: PermissionToggleDefinition[];
}

export const PERMISSION_DOMAINS: PermissionDomainDefinition[] = [
  {
    key: 'categories',
    title: 'Categories',
    icon: 'category',
    permissions: [
      {
        code: 'category:create',
        label: 'Create categories',
        description: 'Create new product categories and subcategories.',
      },
      {
        code: 'category:update',
        label: 'Edit categories',
        description: 'Update category metadata, SEO, and hierarchy.',
      },
      {
        code: 'category:delete',
        label: 'Delete categories',
        description: 'Archive or delete categories from the catalog.',
      },
    ],
  },
  {
    key: 'products',
    title: 'Products',
    icon: 'inventory',
    permissions: [
      {
        code: 'product:create',
        label: 'Create products',
        description: 'Create new products with pricing, media, and variants.',
      },
      {
        code: 'product:update',
        label: 'Edit products',
        description: 'Modify product details, pricing, inventory, and SEO.',
      },
      {
        code: 'product:delete',
        label: 'Delete products',
        description: 'Retire or hide products from the storefront catalog.',
      },
    ],
  },
  {
    key: 'orders',
    title: 'Orders & Returns',
    icon: 'assignment_return',
    permissions: [
      {
        code: 'order:manage',
        label: 'Manage orders',
        description: 'View and update order status, payments, and notes.',
      },
      {
        code: 'return:manage',
        label: 'Manage returns',
        description: 'Review return requests and approve or reject actions.',
      },
    ],
  },
  {
    key: 'shipments',
    title: 'Shipments',
    icon: 'local_shipping',
    permissions: [
      {
        code: 'shipment:manage',
        label: 'Manage shipments',
        description: 'Create shipments and update tracking milestones.',
      },
    ],
  },
  {
    key: 'inventory',
    title: 'Inventory',
    icon: 'inventory_2',
    permissions: [
      {
        code: 'inventory:adjust',
        label: 'Adjust inventory',
        description: 'Create adjustments, transfers, and reservations.',
      },
      {
        code: 'inventory:locations',
        label: 'Manage locations',
        description: 'Create, update, and archive inventory locations.',
      },
    ],
  },
  {
    key: 'reports',
    title: 'Reports',
    icon: 'insights',
    permissions: [
      {
        code: 'report:view',
        label: 'View reports',
        description: 'Access analytics dashboards and export sales data.',
      },
    ],
  },
  {
    key: 'custom',
    title: 'Custom',
    icon: 'extension',
    permissions: [
      {
        code: 'custom:manage',
        label: 'Custom integrations',
        description: 'Manage future custom domains and integrations.',
      },
      {
        code: 'permissions:manage',
        label: 'Manage permissions',
        description: 'Grant or revoke admin permissions for other users.',
      },
    ],
  },
];

export const PERMISSION_TOOLTIPS: Record<string, string> = PERMISSION_DOMAINS.reduce(
  (acc, domain) => {
    domain.permissions.forEach((permission) => {
      acc[permission.code] = `${permission.code} — ${permission.description}`;
    });
    return acc;
  },
  {} as Record<string, string>
);
