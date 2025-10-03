# Ecom Admin Frontend

A production-ready Angular 17 admin shell that delivers authentication, localization, responsive layout, dark mode, and a real-time dashboard. All data flows are wired to the HTTP endpoints described in [`API.md`](API.md).

## Prerequisites

- Node.js 18+
- npm 9+
- Angular CLI 17+

## Setup

```
npm install
npm run start
```

The dev server runs on `http://localhost:4200`. Update your backend base URL by customizing the `API_BASE_URL` constant in `src/app/constants/api.constants.ts` or by injecting runtime configuration before bootstrap.

## Available Scripts

| Command | Description |
| --- | --- |
| `npm run start` | Start the development server with HMR. |
| `npm run build` | Produce an optimized production bundle. |
| `npm run lint` | Execute Angular ESLint with strict TypeScript settings. |
| `npm test` | Execute the default Karma/Jasmine test suite. |

## Key Features

- Tailwind + Angular Material login page (email/password + forgot-password link).
- Token-based authentication with refresh flow, logout, and route guards.
- Role-aware admin shell featuring responsive top bar and collapsible sidebar.
- Dashboard cards and revenue/orders chart backed by `/api/admin/metrics` and `/api/admin/reports/sales`.
- Localization via `@ngx-translate`, with all copy defined in `src/assets/i18n/en.json`.
- Dark mode persisted to `localStorage` with system preference detection.

## Project Structure

```
src/app/
  app.component.ts        # Root container applying theme + router outlet
  app.routes.ts           # Route map (login + admin shell)
  constants/              # API endpoints, storage keys, route helpers, roles
  core/                   # Auth services, guards, interceptors, dashboard service
  layout/admin/           # Shell, top bar, sidebar components
  pages/login/            # Standalone login feature
  features/dashboard/     # Dashboard view with metrics + chart
  shared/                 # Reusable components and utilities (loader, metric card, pipes)
```

## API Contracts

- `POST /api/auth/login` — Authenticate and persist JWT/refresh token.
- `GET /api/auth/me` — Hydrate the active user session on bootstrap.
- `POST /api/auth/logout` — Invalidate refresh token and clear session state.
- `POST /api/auth/refresh` — Rotate access tokens on 401 responses.
- `GET /api/admin/metrics` — Populate headline metrics in the dashboard cards.
- `GET /api/admin/reports/sales` — Feed the revenue vs. orders chart.

All requests are made through Angular's `HttpClient` with interceptors for bearer tokens and refresh retries.

## Internationalization

Translations are centralized in `src/assets/i18n/en.json`. To add another locale:

1. Create a new `<lang>.json` alongside `en.json`.
2. Register the language in `LanguageService.supportedLanguages`.
3. Provide localized strings for all existing keys.

The language selector in the top bar persists the preference in `localStorage`.

## Theming

`ThemeService` syncs the `dark` class on the document root, reading system preferences on first load and persisting user overrides. Tailwind's `dark:` variants and Angular Material components provide consistent styling across light and dark modes.

## Testing the Auth Flow

1. Start the dev server and ensure the API described in `API.md` is reachable.
2. Navigate to `/login` and authenticate with valid admin credentials.
3. Verify `/admin/dashboard` renders metrics and the chart once authenticated.
4. Attempt to access `/admin/...` routes while signed out to confirm guards redirect to `/login`.
5. Trigger a token expiry (or invalidate refresh token) to confirm automatic logout.

## Deployment

1. Set the production API base in `api.constants.ts` or through a runtime config shim.
2. Build the project: `npm run build`.
3. Serve the generated `dist/ecom-admin-front/browser` directory via your preferred CDN or reverse proxy. Ensure requests to `/api` forward to the backend service.

## Contributing

Document future enhancements or module work in [`TODO.md`](TODO.md) so follow-up sprints stay coordinated.
