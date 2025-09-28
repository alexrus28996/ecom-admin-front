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
      {
        id: 'product:create',
        labelKey: 'adminUsers.permissions.items.productCreate',
        descriptionKey: 'permissionsSettings.tooltips.productCreate'
      },
      {
        id: 'product:edit',
        labelKey: 'adminUsers.permissions.items.productEdit',
        descriptionKey: 'permissionsSettings.tooltips.productEdit'
      },
      {
        id: 'product:delete',
        labelKey: 'adminUsers.permissions.items.productDelete',
        descriptionKey: 'permissionsSettings.tooltips.productDelete'
      },
      {
        id: 'category:create',
        labelKey: 'adminUsers.permissions.items.categoryCreate',
        descriptionKey: 'permissionsSettings.tooltips.categoryCreate'
      },
      {
        id: 'category:edit',
        labelKey: 'adminUsers.permissions.items.categoryEdit',
        descriptionKey: 'permissionsSettings.tooltips.categoryEdit'
      },
      {
        id: 'category:delete',
        labelKey: 'adminUsers.permissions.items.categoryDelete',
        descriptionKey: 'permissionsSettings.tooltips.categoryDelete'
      }
    ]
  },
  {
    key: 'orders',
    labelKey: 'adminUsers.permissions.groups.orders',
    icon: 'shopping_cart_checkout',
    permissions: [
      {
        id: 'order:view',
        labelKey: 'adminUsers.permissions.items.orderView',
        descriptionKey: 'permissionsSettings.tooltips.orderView'
      },
      {
        id: 'order:edit',
        labelKey: 'adminUsers.permissions.items.orderEdit',
        descriptionKey: 'permissionsSettings.tooltips.orderEdit'
      },
      {
        id: 'refund:approve',
        labelKey: 'adminUsers.permissions.items.refundApprove',
        descriptionKey: 'permissionsSettings.tooltips.refundApprove'
      },
      {
        id: 'refund:reject',
        labelKey: 'adminUsers.permissions.items.refundReject',
        descriptionKey: 'permissionsSettings.tooltips.refundReject'
      }
    ]
  },
  {
    key: 'inventory',
    labelKey: 'adminUsers.permissions.groups.inventory',
    icon: 'inventory_2',
    permissions: [
      {
        id: 'inventory:view',
        labelKey: 'adminUsers.permissions.items.inventoryView',
        descriptionKey: 'permissionsSettings.tooltips.inventoryView'
      },
      {
        id: 'inventory:adjust',
        labelKey: 'adminUsers.permissions.items.inventoryAdjust',
        descriptionKey: 'permissionsSettings.tooltips.inventoryAdjust'
      },
      {
        id: 'inventory:audit',
        labelKey: 'adminUsers.permissions.items.inventoryAudit',
        descriptionKey: 'permissionsSettings.tooltips.inventoryAudit'
      }
    ]
  },
  {
    key: 'reports',
    labelKey: 'adminUsers.permissions.groups.reports',
    icon: 'insights',
    permissions: [
      {
        id: 'reports:view',
        labelKey: 'adminUsers.permissions.items.reportsView',
        descriptionKey: 'permissionsSettings.tooltips.reportsView'
      },
      {
        id: 'reports:export',
        labelKey: 'adminUsers.permissions.items.reportsExport',
        descriptionKey: 'permissionsSettings.tooltips.reportsExport'
      }
    ]
  },
  {
    key: 'system',
    labelKey: 'adminUsers.permissions.groups.system',
    icon: 'admin_panel_settings',
    permissions: [
      {
        id: 'user:invite',
        labelKey: 'adminUsers.permissions.items.userInvite',
        descriptionKey: 'permissionsSettings.tooltips.userInvite'
      },
      {
        id: 'user:suspend',
        labelKey: 'adminUsers.permissions.items.userSuspend',
        descriptionKey: 'permissionsSettings.tooltips.userSuspend'
      },
      {
        id: 'settings:update',
        labelKey: 'adminUsers.permissions.items.settingsUpdate',
        descriptionKey: 'permissionsSettings.tooltips.settingsUpdate'
      }
    ]
  }
];

export const ALL_PERMISSIONS: string[] = PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.id)
);
