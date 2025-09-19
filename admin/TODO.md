# Admin Panel TODO / API Sync

Keep the Angular admin aligned with the latest ecombackend endpoints. Every feature below references concrete APIs so we can track parity.

Legend
- [ ] Pending
- [x] Done
- P0 = must-have for day-one admin workflows
- P1 = important follow-up for full coverage
- P2 = polish / scale / backlog

## Execution Plan (Next Up)
1. Establish Angular Material baseline: configure theme palette, typography, and responsive layout shell (app toolbar + sidenav) to support Material-first UI. [in progress]
2. Wire localization scaffolding: ensure i18n module loads, seed translation files, and replace static strings in shell/auth views.
3. Implement RBAC-aware navigation: use `/api/auth/me` roles to drive menu visibility, protect routes, and surface 403 redirect messaging. [started: 403 handling in interceptor + toasts]
4. Build dashboard metrics screen: material cards + charts backed by `GET /api/admin/metrics` and `GET /health`, including loading and empty states.
5. Ship shared UI primitives: confirmation dialog, error banner, loading indicators packaged for reuse across product/order/returns flows. [confirm + error banner shipped]
6. Begin admin returns console: table + detail drawer powered by `/api/admin/returns` and approve/reject endpoints. [list + approve/reject shipped]
7. Follow with inventory console and coupons management before expanding to reviews moderation and bulk tooling.


## P0 - Immediate Parity Gaps
- [ ] RBAC guardrails: hide admin routes and disable actions for non-admin roles; redirect 403 with helpful toast (`roles` from `/api/auth/me`).
  - Started: Interceptor 401/403 handling with toasts + Access Denied page and guard redirect.
- [x] Admin dashboard KPIs: wire cards to `GET /api/admin/metrics` (users/products/orders/revenue) and show health status from `GET /health`.
- [ ] Confirm modal + error banner components reused across delete/demote/approve actions, consuming backend error shape `{ error: { ... } }`.
  - Note: Error banner component shipped and integrated in dashboard, products list, product form, and returns list; continue rollout across remaining screens.
- [ ] Loading states for primary tables/forms to avoid blank flashes while waiting for API responses.
  - Note: Implemented on dashboard, products list, product form, and returns list; consider extracting a shared loading wrapper.
- [ ] Material design polish: base layouts/screens on Angular Material components with responsive grids, typography, and stateful cards (no barebones UI).
  - Started: Admin Orders list migrated to Material table + paginator.
- [ ] Localization coverage: route every label, helper, toast, and error through i18n translation files; keep copy out of components.
  - Note: Added returns translations and fixed categories parent "none" label; continue replacing remaining inline strings.

## P1 - Next Wave
- [ ] Auth preferences UI (`GET/PATCH /api/auth/preferences`): locale dropdown + notification toggles.
  - Started: Preferences form added under Profile; loads/saves and switches locale immediately.
- [ ] Reviews moderation view for admins (list via `GET /api/products/{id}/reviews`, approve/hide endpoints).
- [ ] Admin returns console (`GET /api/admin/returns`, approve/reject endpoints) with inline notes.
  - Started: Returns list + approve/reject actions shipped; added right-side details drawer; inline notes pending.
- [ ] Inventory console (overview + adjustments + low-stock) using `/api/admin/inventory*` endpoints.
- [ ] Coupon management (`/api/admin/coupons` CRUD) plus cart coupon apply/remove (`POST/DELETE /api/cart/coupon`).
- [ ] Orders timeline + invoice links (`GET /api/orders/{id}/timeline|invoice`) surfaced in user+admin views.
  - Started: Admin order detail has invoice open + timeline fetch/table; User order detail updated similarly.
- [ ] Stripe payment intent trigger from order detail (`POST /api/payments/stripe/intent`) with paid/unpaid badge.
- [ ] Product bulk tooling (import/export, price-bulk, category-bulk) with success/error reporting.
- [ ] Reports suite: sales, top products/customers from `/api/admin/reports/*` with CSV/JSON exports.
- [ ] Media uploads UI (local + Cloudinary) mapping to `/api/uploads` + `/api/uploads/cloudinary(+/delete)`.

## P2 – Polish & Future Backlog
- [ ] Product variant editor UX (stock/price deltas, variant attributes) and quick duplicate action.
- [ ] Category tree enhancements (drag/drop reorder, breadcrumbs, badges for children count).
- [ ] Saved carts, clear-confirmation dialogs, and contextual toasts.
- [ ] Payment provider toggles once Razorpay/PayPal APIs ship (track backend TODOs).
- [ ] Theme switcher (light/dark), i18n scaffolding, and offline-friendly caches for key screens.
- [ ] Visual regression stories / Storybook or screenshot tests for critical components.

## Module Backlog (Reference by API)

### Auth & Session
- [x] Core auth flows (`POST /api/auth/register|login|logout|refresh`, `GET /api/auth/me`).
- [x] Profile + password workflows (`PATCH /api/auth/profile`, password change/forgot/reset endpoints).
- [x] Email verify/change flows (`POST /api/auth/email/*`).
- [ ] Preferences UX (`GET/PATCH /api/auth/preferences`).
- [ ] Session expiry handling: detect repeated 401 after refresh, clear storage, and route to login with message.

### Users & RBAC
- [x] Admin user table (`GET /api/admin/users`) with search/pagination.
  - Polished: Material table + paginator, search, activate/deactivate toggle, i18n, loading/error states.
- [ ] User detail drawer (`GET /api/admin/users/{id}`) showing roles, activity, preferences.
- [x] Activate/deactivate toggle (`PATCH /api/admin/users/{id}`).
- [x] Promote/demote buttons (`POST /api/admin/users/{id}/promote|demote`).
- [ ] Audit trail hook once backend exposes logs (watch backend TODO).

### Catalog & Media
- [x] Product CRUD (`/api/products`).
- [ ] Variant manager & stock visibility.
  - Started: Product form shows variant/stock summary; products list displays stock + active variant counts.
- [ ] Upload widget + gallery reorder ( `/api/uploads`, `/api/uploads/cloudinary`, delete endpoint ).
  - Started: Image upload button wired to `/api/uploads` in product form; drag/drop reorder active.
- [x] Category CRUD + reorder ( `/api/categories` and admin aliases ).
- [ ] Category tree polish.
- [ ] Product reviews list + moderation (admin) and customer submission form.

### Cart & Promotions
- [x] Cart CRUD (`GET/POST/PATCH/DELETE /api/cart*`).
- [ ] Coupon apply/remove UI (`POST/DELETE /api/cart/coupon`).
- [ ] Saved cart snapshot or clear-confirm modal.

### Orders & Returns
- [x] Customer orders list/detail (`GET /api/orders*`).
- [ ] Invoice download + timeline view (`GET /api/orders/{id}/invoice|timeline`).
- [ ] Return request form (`POST /api/orders/{id}/returns`).
- [x] Admin orders list/detail/update (`/api/admin/orders*`).
- [ ] Returns management board (`/api/admin/returns*`).
  - Started: Basic returns list with filtering and approve/reject wired.
- [ ] Payment + fulfillment history timeline chips.

### Inventory
- [ ] Inventory overview grid (`GET /api/admin/inventory`).
  - Started: Overview table with filters and pagination; basic columns (product/variant/stock).
- [ ] Adjustment log with add-adjustment modal (`GET/POST /api/admin/inventory/adjustments`).
  - Started: Adjustments list with filters and inline create form; wire-up complete.
- [ ] Low stock report with threshold input (`GET /api/admin/inventory/low`).
  - Started: Low stock section with threshold filter, table, and pagination.
- [ ] Location/warehouse filters when backend adds data.

### Analytics & Reports
- [x] Dashboard KPIs (`GET /api/admin/metrics`).
- [ ] Sales report filters + chart (`GET /api/admin/reports/sales`).
- [ ] Top products/customers tables (`GET /api/admin/reports/top-products|top-customers`).
- [ ] CSV/JSON export wiring for reports and bulk operations.

### Payments
- [ ] Stripe intent initiation + feedback (`POST /api/payments/stripe/intent`).
- [ ] Payment status badges driven by order `paymentStatus`.
- [ ] Future: Razorpay/PayPal integration once APIs exist.

### System & Settings
- [ ] Environment selector (proxy `/api` vs absolute base URL) with persistent choice.
- [ ] Display active API base + docs link for quick troubleshooting.
- [ ] Toggle for CSP/CORS warnings based on env config.

### UX Infrastructure
- [x] Toast/notification service.
- [x] Confirm modal component.
- [x] Error banner component.
- [ ] Loading spinners/skeletons.
  - Started: Shared loading overlay component (`app-loading`) and integrated on orders, products, returns lists.
- [ ] Reusable pagination component.
- [ ] Table sorting + empty state templates.
- [ ] Accessible forms (labels, focus trap, keyboard nav).
- [ ] Theme/offline improvements (see P2).

### Dev & QA
- [ ] Keep this TODO synced with backend Swagger (`/docs/openapi.json`) after each backend release.
- [ ] Shared npm scripts for lint/test/build across admin + backend.
- [ ] Lightweight smoke/E2E suite (Cypress/Playwright) covering auth, products, orders, returns.
- [ ] Visual regression / screenshot checks for dashboards & tables.

Notes
- When wiring forms/tables, copy payload structures directly from `backend/src/docs/spec.js` to avoid drift.
- Double-check error handling paths; most endpoints return structured `error` objects with `code` to surface to users.
- Prioritize P0 list before tackling the deeper module backlog.


