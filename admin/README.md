# Ecom Admin (Angular)

Comprehensive Angular admin application for the e-commerce backend. The codebase is organised around feature areas (auth, catalog, orders, inventory, payments) and consumes the REST surface described in [`API.md`](./API.md).

> 💡 Looking for the full platform overview, route map, and extension guide? Head over to [`README_ADMIN.md`](./README_ADMIN.md).

## Quick start

```bash
cd admin
npm install
npm start
```

The dev server runs at `http://localhost:4200` and proxies `/api` to `http://localhost:4000` via [`proxy.conf.json`](./proxy.conf.json). To target a different backend, adjust `apiBaseUrl` inside [`src/environments/environment.ts`](./src/environments/environment.ts).

## Requirements

- Node.js 20+
- Running backend that exposes the endpoints in `API.md`

## First-time admin tips

- The first registered user becomes an admin automatically (per backend logic).
- Otherwise, login as an existing admin and use **Admin → Manage User Roles** to promote another user by their ID.

## Tooling scripts

- `npm start` → dev server with HMR
- `npm run build` → production build to `dist/admin`

## Definition of Done (Phase 1)

All items below must remain checked before merging new work into `main`.

- [x] All listed routes exist and are protected.
- [x] All API calls typed and error-handled.
- [x] Permissions enforced at route & widget level.
- [x] CSV export works on all tables.
- [x] No hardcoded data; all live via API.
- [x] Lighthouse a11y score ≥ 90 for key pages.

## Project layout

```text
admin/
  src/
    app/
      app.module.ts
      app.routing.ts
      components/             # Root shell + global UI
      core/                   # Auth, guards, interceptors, toast service
      layout/                 # Sidenav, topbar, breadcrumbs
      pages/                  # Feature areas (dashboard, catalog, admin, etc.)
      services/               # Strongly typed API clients
      shared/                 # Material module, dialogs, toasts, utilities
    assets/
    environments/
```

See `README_ADMIN.md` for per-module responsibilities and contribution workflow.

