# Ecom Admin (Angular)

Minimal admin panel for your Node.js + MongoDB backend. No big UI libs; just Angular + HttpClient + Router.

## Features
- Auth: login with JWT, persisted in localStorage
- Guards + interceptor: protects routes, adds `Authorization: Bearer <token>`
- Products: list/search/paginate, create, edit, delete
- Admin users: promote/demote by user ID (backend doesn’t expose user listing)

## Requirements
- Node 20+
- Backend running (defaults: `http://localhost:4000`)

## Setup
```bash
cd admin
npm install
npm start
```
- Dev server runs at `http://localhost:4200` and proxies `/api` to `http://localhost:4000` via `proxy.conf.json`.
- If you don’t want the proxy, set `apiBaseUrl` in `src/environments/environment.ts` to your full backend URL (e.g. `http://localhost:4000/api`).

## First-time admin
- The first registered user becomes admin automatically (per backend logic).
- Otherwise, login as an existing admin and use Admin → Manage User Roles to promote another user by their ID.

## Env notes
- Ensure backend CORS allows `http://localhost:4200` (set `CORS_ORIGIN=http://localhost:4200` in backend `.env`).

## Scripts
- `npm start` → dev server with HMR
- `npm run build` → production build to `dist/admin`

```text
admin/
  src/
    app/
      core/            # auth service, guards, interceptor
      pages/
        login/
        dashboard/
        products/      # list + form
        admin/         # promote/demote users by ID
      services/        # API clients
      components/      # app shell
    environments/      # apiBaseUrl config
```

