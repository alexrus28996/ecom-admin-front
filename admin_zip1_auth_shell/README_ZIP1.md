# Zip 1 — Auth + Shell (Angular Admin)

**Goal:** Provide a robust authentication flow and a beautiful admin shell (topbar + sidebar + breadcrumbs + dashboard) with Tailwind-first styling, Angular Material components, localization, and strict TypeScript. No mock data — fully wired to your backend API from `API.md`.

## What you get
- Login screen with email/password, remember-me, validation, and inline API errors.
- `AuthService` handling access/refresh tokens, `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`, `/api/auth/logout`.
- Interceptors for Authorization header and consistent error toasts (`code`, `message`).
- Guards: `AuthGuard` (session required) and `AdminGuard` (`admin` role required).
- Admin shell: responsive topbar + collapsible sidebar + breadcrumbs + dashboard with quick cards.
- Localization (no hardcoded UI strings): `assets/i18n/en.*.json`.
- Tailwind-first UI with accessible focus rings & dark-ready tokens.
- Console diagnostics left on in dev to help chase down issues quickly.

## How to integrate
1. **Copy files** into your Angular project root, preserving paths under `src/`.
2. **App module:** import `HttpClientModule`, `TranslateModule` with a JSON loader if not present.
3. **Tailwind:** ensure your `tailwind.config.js` scans `./src/**/*.{html,ts}` and you have `@tailwind base; @tailwind components; @tailwind utilities;` in global styles.
4. **Routing:**
   - Add a lazy route for auth:
     ```ts
     { path: 'auth', loadChildren: () => import('./pages/auth/auth.module').then(m => m.AuthModule) }
     ```
   - Add a lazy route for admin shell (protected):
     ```ts
     { path: 'admin', canActivate: [AuthGuard, AdminGuard], loadChildren: () => import('./layout/shell/shell.module').then(m => m.ShellModule) }
     ```
   - Default redirect: `{ path: '', pathMatch: 'full', redirectTo: 'admin' }`
5. **Interceptors:** provide in `app.module.ts`:
   ```ts
   { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true },
   { provide: HTTP_INTERCEPTORS, useClass: ErrorInterceptor, multi: true },
   ```
6. **Environment:** ensure `environment.apiBase = 'http://localhost:4001'` (or your base).
7. **Material:** install `@angular/material` and import `MaterialModule` from `shared/`.
8. **Test:** run the app, visit `/auth/login`, login with an admin user, you should land on `/admin/dashboard`.

## API Endpoints used
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## Notes
- This pack is UI-complete and production-ready for Phase 1 shell. Zip 2 (Users & Permissions) and others hook into this shell.
- No sample data — all calls are live. If the spinner remains, check browser console — interceptors will log root causes.

See `TODO_ZIP1.md` for the tracked items.
