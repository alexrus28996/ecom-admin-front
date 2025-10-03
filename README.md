# Ecom Admin Frontend

A production-ready Angular admin shell featuring authentication, localization, responsive layout, dark mode, and dashboard visualizations. The application follows the API contract defined in `API.md` and is optimized for desktop, tablet, and mobile breakpoints.

## Prerequisites

- Node.js 18+
- npm 9+
- Angular CLI 16+

## Getting Started

```bash
npm install
npm run start
```

The development server listens on `http://localhost:4200`. Update `src/environments` or the `window.__env` object to point at your backend API if required.

## Linting & Formatting

```bash
npm run lint
npm run format
```

The lint task runs Angular ESLint with the strict TypeScript configuration enabled.

## Testing Authentication Flow

1. Start the dev server.
2. Navigate to `/auth/login` and authenticate using valid credentials.
3. Verify that protected routes under `/admin` redirect to login when unauthenticated.
4. Confirm that token refresh, logout, and role-based access behave according to `API.md`.

## Internationalization

Translations live in `src/assets/i18n/en.json`. Add new language files alongside this file and register them via `TranslateModule` if you plan to support additional locales.

## Theming

Dark mode is toggled through the top navigation bar and persisted in `localStorage`. Tailwind utility classes and Angular Material components are used for a consistent design system.

## Project Structure Highlights

- `src/app/constants` – Routes, API endpoints, roles, and error codes.
- `src/app/core` – Authentication, interceptors, and shared services.
- `src/app/layout` – Admin shell components (topbar, sidebar, dashboard).
- `src/app/pages/auth` – Auth module with the localized login view.
- `src/app/shared` – Reusable Material module and utilities.

## Deployment

1. Configure the production API base via environment variables or `window.__env.apiBase`.
2. Build the optimized bundle:

   ```bash
   npm run build
   ```

3. Serve the contents of `dist/` behind your preferred CDN or reverse proxy.

## Contributing

Please document any architectural or UX changes in `TODO.md` to maintain traceability for follow-up sprints.
