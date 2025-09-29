# Ecom Admin Platform — Phase 1

This document captures the Phase 1 deliverable of the Angular admin panel. It aligns the implemented modules with the backend contract described in [`API.md`](./API.md) and explains how to extend the platform.

## Table of contents

1. [Stack & tooling](#stack--tooling)
2. [Project structure](#project-structure)
3. [Routing & layout](#routing--layout)
4. [Authentication & session lifecycle](#authentication--session-lifecycle)
5. [Authorization & permissions](#authorization--permissions)
6. [Feature domains](#feature-domains)
7. [Common table experience](#common-table-experience)
8. [Utilities & helpers](#utilities--helpers)
9. [Testing strategy](#testing-strategy)
10. [Contribution workflow](#contribution-workflow)

## Stack & tooling

- **Angular 17** application compiled with strict TypeScript settings.
- Angular Material is used for data tables, dialogs, forms, and layout primitives.
- Chart.js (via `ng2-charts`) powers the analytics visualisations on the admin reports dashboard.
- [`@ngx-translate`](https://github.com/ngx-translate/core) provides i18n, enabling runtime translation without recompilation.

## Project structure

The admin app is organised around feature-driven modules. Core infrastructure lives alongside reusable UI in `shared/`.

```text
src/app/
  app.module.ts          # Bootstraps Material, router, interceptors, translation loader
  app.routing.ts         # Central route configuration with guard wiring
  components/            # Root component and global toast renderer
  core/                  # Auth service, guards, interceptors, toast service
  layout/                # Shell (sidenav, topbar, breadcrumbs)
  pages/                 # Feature areas (admin, catalog, orders, payments, etc.)
  services/              # HTTP API clients with typed responses
  shared/                # Dialogs, Material module, helpers
```

## Routing & layout

All authenticated content is wrapped in `LayoutWrapperComponent`, which renders the topbar, breadcrumbs, and responsive sidenav. Route guards combine `AuthGuard` and `RoleGuard` to ensure only authorised admins reach protected pages. The path map closely follows the specification — for example, `/admin/products`, `/admin/users/:id`, `/admin/permissions`, `/admin/shipments/:id`, `/admin/transactions/:id`, and `/admin/reports` are wired with admin role protection and breadcrumbs for shell navigation. See [`app.routing.ts`](./src/app/app.routing.ts) for the complete definition.

## Authentication & session lifecycle

`AuthService` encapsulates all session handling:

- Restores persisted access & refresh tokens on bootstrap and keeps the current user in a behaviour subject.
- Provides `login`, `logout`, `refresh`, and `getCurrentUser` methods that map to `/api/auth/login`, `/api/auth/logout`, `/api/auth/refresh`, and `/api/auth/me` respectively.
- Schedules token refreshes ahead of expiry and exposes `refreshing$` for UI feedback.
- Persists user preferences via `getPreferences`/`updatePreferences` targeting `/api/auth/preferences`.

The `AuthInterceptor` attaches the `Authorization: Bearer <token>` header to outgoing requests, retries once on `401` by invoking `AuthService.refresh`, and decorates API error payloads so UI components receive consistent `code` + `message` metadata. It also emits Material toast notifications on access-denied responses and automatically clears session state on repeated authentication failures.

## Authorization & permissions

Administrative access is enforced in two layers:

1. **Guards** — `AuthGuard` blocks unauthenticated navigation, while `RoleGuard` and feature-specific checks ensure only users with the `admin` role reach `/admin/*` routes.
2. **Permissions UI** — `PermissionsSettingsComponent` fetches users, loads a domain-grouped permission catalogue, and persists updates using `UserManagementService`. It supports search, optimistic UI, granular toggles, clear/select-all actions, and explanatory tooltips. Permission changes call `replaceUserPermissions` (`POST /api/admin/users/:id/permissions`), while promotion/demotion actions hit `/promote` & `/demote` endpoints.

Widgets that require additional rights inspect the permission set before rendering sensitive actions; for example, product bulk operations and shipments actions respect the granted capabilities.

## Feature domains

The following modules cover the Phase 1 scope:

### Catalog

- **Categories** — `CategoriesComponent` provides list, create/edit dialog, and drag-and-drop reordering backed by `CategoryService`. It consumes `/api/admin/categories` CRUD endpoints and `/api/categories/:id/reorder` for hierarchy adjustments.
- **Products** — `ProductsListComponent` renders search, filter, and bulk actions. `ProductFormComponent` exposes tabbed editing for general details, pricing, media uploads, SEO, attributes, and variants. Attribute and variant CRUD relies on `products.service.ts`, `attribute` helpers, and the variants dialog to orchestrate `/api/products/:productId/attributes[...]` as well as variant matrix generation.

### Inventory suite

- **Inventory dashboard** — `AdminInventoryComponent` shows current stock with filters and opens dialogs for adjustments and transfers.
- **Locations** — `InventoryLocationDialogComponent` and `LocationService` implement create/update/delete flows, including soft delete + restore endpoints.
- **Reservations & adjustments** — `InventoryAdjustmentDialogComponent` posts adjustments to `/api/admin/inventory/adjustments`, while `InventoryService` exposes `getInventory`, `getLowStock`, and reservation release helpers.
- **Transfers** — `InventoryTransferDialogComponent` handles draft/requested/in-transit/received transitions via `TransferService`.
- **Ledger** — `InventoryService` surfaces `/api/admin/inventory/ledger` with filtering options for auditability.

### Orders, returns, shipments

- **Orders** — `AdminOrdersListComponent` renders filters by status, payment status, user, and date range. `AdminOrderDetailComponent` displays items, timeline, associated shipments, and payments with inline update actions.
- **Returns** — `AdminReturnsListComponent` surfaces customer returns and their statuses.
- **Shipments** — `ShipmentsListComponent` and `ShipmentDetailComponent` consume `/api/admin/shipments` endpoints; `ShipmentFormComponent` enables creating shipments for paid orders.

### Payments & refunds

`TransactionsListComponent` and `TransactionDetailComponent` display gateway payloads, while `RefundsListComponent` / `RefundDetailComponent` show refund status and handle the `PAYMENTS_NOT_CONFIGURED` error gracefully with UI callouts.

### Reports & analytics

`ReportsDashboardComponent` renders the sales chart (dual-axis for revenue/orders), top products, and top customers tables. Export buttons leverage the CSV helper described below.

### Audit logs

`AuditService` hits `/api/admin/audit` and `/api/admin/audit/:id` endpoints; corresponding pages list entries with filters and hide sensitive payload keys.

## Common table experience

All major data grids use Angular Material tables with server-driven pagination, sorting, and filter query parameters. Table state is persisted in the route query string and localStorage, allowing refresh-safe navigation. Bulk selection integrates with CSV export so admins can download filtered datasets quickly.

## Utilities & helpers

- **ToastService** centralises snack-bar feedback for success/error states.
- **UploadService** handles media uploads to `/api/uploads` (or `/api/uploads/cloudinary`) and supports drag & drop previews in the product form.
- **CsvExporter** and supporting helpers convert table datasets into downloadable CSV files (used across catalog, inventory, payments, and reports).
- **HttpParams builders** provide consistent pagination/filter translation between view-models and API query parameters.
- **ConfirmDialogComponent** supplies standard confirmation UX for destructive actions.

## Testing strategy

Phase 1 includes:

- **Unit tests** for services to validate HTTP contracts and guards to ensure route denial when prerequisites fail.
- **Component tests** for critical forms (product pricing validators, variant matrix generation, etc.).
- **E2E flows** using Playwright: login → category create → product create (with attributes/options) → generate variants → bulk price update → create inventory location → adjustment → create shipment → view reports.

Execute the suite via Angular CLI testing targets (for example, `ng test admin`, `ng e2e admin-e2e`) once your preferred runners are configured in `angular.json`.

## Contribution workflow

1. Create a feature branch from `main`.
2. Ensure the Definition of Done checklist in [`README.md`](./README.md) remains satisfied.
3. Add/extend relevant unit and e2e tests.
4. Update [`CHANGELOG.md`](./CHANGELOG.md) with your changes.
5. Run `npm run lint` and the relevant Angular CLI test/e2e targets before opening a PR.

For substantial features, include architectural notes or diagrams inside `docs/` or link to relevant tickets in the PR description.
