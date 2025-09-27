export interface PermissionDefinition {
  id: string;
  labelKey: string;
  descriptionKey?: string;
}

export interface PermissionGroupDefinition {
  key: string;
  labelKey: string;
  icon?: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_GROUPS: PermissionGroupDefinition[] = [
  {
    key: 'catalog',
    labelKey: 'adminUsers.permissions.groups.catalog',
    icon: 'storefront',
    permissions: [
      { id: 'product:create', labelKey: 'adminUsers.permissions.items.productCreate' },
      { id: 'product:edit', labelKey: 'adminUsers.permissions.items.productEdit' },
      { id: 'product:delete', labelKey: 'adminUsers.permissions.items.productDelete' },
      { id: 'category:create', labelKey: 'adminUsers.permissions.items.categoryCreate' },
      { id: 'category:edit', labelKey: 'adminUsers.permissions.items.categoryEdit' },
      { id: 'category:delete', labelKey: 'adminUsers.permissions.items.categoryDelete' }
    ]
  },
  {
    key: 'orders',
    labelKey: 'adminUsers.permissions.groups.orders',
    icon: 'shopping_cart_checkout',
    permissions: [
      { id: 'order:view', labelKey: 'adminUsers.permissions.items.orderView' },
      { id: 'order:edit', labelKey: 'adminUsers.permissions.items.orderEdit' },
      { id: 'refund:approve', labelKey: 'adminUsers.permissions.items.refundApprove' },
      { id: 'refund:reject', labelKey: 'adminUsers.permissions.items.refundReject' }
    ]
  },
  {
    key: 'inventory',
    labelKey: 'adminUsers.permissions.groups.inventory',
    icon: 'inventory_2',
    permissions: [
      { id: 'inventory:view', labelKey: 'adminUsers.permissions.items.inventoryView' },
      { id: 'inventory:adjust', labelKey: 'adminUsers.permissions.items.inventoryAdjust' },
      { id: 'inventory:audit', labelKey: 'adminUsers.permissions.items.inventoryAudit' }
    ]
  },
  {
    key: 'reports',
    labelKey: 'adminUsers.permissions.groups.reports',
    icon: 'insights',
    permissions: [
      { id: 'reports:view', labelKey: 'adminUsers.permissions.items.reportsView' },
      { id: 'reports:export', labelKey: 'adminUsers.permissions.items.reportsExport' }
    ]
  },
  {
    key: 'system',
    labelKey: 'adminUsers.permissions.groups.system',
    icon: 'admin_panel_settings',
    permissions: [
      { id: 'user:invite', labelKey: 'adminUsers.permissions.items.userInvite' },
      { id: 'user:suspend', labelKey: 'adminUsers.permissions.items.userSuspend' },
      { id: 'settings:update', labelKey: 'adminUsers.permissions.items.settingsUpdate' }
    ]
  }
];

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.id)
);
