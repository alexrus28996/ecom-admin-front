# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - Phase 1 Completion

### Added
- Full admin shell with authenticated layout, sidenav, topbar, and breadcrumb navigation.
- Guarded routing for all `/admin/*` feature areas (users, permissions, catalog, inventory, orders, returns, payments, reports, audit).
- Comprehensive services for auth, users, permissions, catalog, inventory, orders, payments, reports, and audit domains.
- Product authoring experience with tabbed form (general, pricing, media, SEO, attributes, variants, inventory snapshot).
- Inventory management dialogs for adjustments, transfers, and location CRUD including soft-delete/restore flows.
- Payments dashboard for transactions and refunds, including graceful handling of `PAYMENTS_NOT_CONFIGURED` responses.
- Reports dashboard with sales charts, top products/customers tables, and CSV export utilities.
- Documentation refresh (`README.md`, `README_ADMIN.md`) outlining setup, Definition of Done checklist, and contribution workflow.

### Changed
- Hardened `AuthInterceptor` to enrich backend errors, attach idempotency keys, and trigger session expiry handling.
- Refined permission management UI with optimistic updates and domain-grouped matrices.

### Testing
- Unit coverage for services, guards, and critical components.
- End-to-end Playwright suite validating the primary merchant workflow (login → catalog → inventory → fulfillment → analytics).
