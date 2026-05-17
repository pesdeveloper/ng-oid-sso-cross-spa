# Architecture Specification

## Overview
This document describes the architectural layout, technology stack, and module structure of the `ng-oid-sso-cross-spa` application.

## Technology Stack
- **Framework:** Angular v20 (Standalone Components architecture)
- **Language:** TypeScript
- **Styling:** SCSS
- **Authentication:** `angular-auth-oidc-client` (v20.0.2)
- **SSO Session Guard:** Internal library `mma-sso-session-guard`

## Project Structure
The workspace contains two main projects configured in `angular.json`:
1. **`mp-angular` (Application):** The main SPA application.
2. **`mma-sso-session-guard` (Library):** A workspace library providing SSO session guarding functionality. (Note: Treated as READ-ONLY for this specification).

## Application Entry Point & Configuration
The application bootstraps using the modern Standalone API.
- **Entry point:** `src/main.ts` calls `bootstrapApplication(App, appConfig)`.
- **Global Configuration:** Defined in `src/app/app.config.ts`. It registers:
  - Global error listeners.
  - Zone change detection.
  - Router configuration.
  - HTTP Client with XSRF configuration (`X-XSRF-TOKEN`).
  - HTTP Interceptors: `authInterceptor` (from OIDC client) and `xsrfCrossSiteInterceptor` (custom).
  - Auth configuration via `provideAuth(authConfig)`.
  - SSO Session Guard configuration via `provideSsoSessionGuard(...)`.

### SSO Session Guard Configuration
The SSO Guard is heavily customized in `app.config.ts` to support deep linking and recovery modes:
- `appNs`: 'bod'
- `events`: ['pageshow']
- `minIntervalMs`: 5000
- `recoverMode`: 'promptNone'
- `pingPath`: '/api/session/ping'
- `antiforgery`: enabled for '/antiforgery/token'
- `allowedReturnUrlPrefixes`: ['/datos', '/checkout']

## Routing Architecture
Global routes are defined in `src/app/app.routes.ts`. The application uses lazy loading for protected features.
- `/`: Maps to `Home` component.
- `/logout`: Maps to `Logout` component.
- `/datos/:sujeto/:cuenta`: Lazy-loads `Datos` component. This route is critically protected by `ShieldGuard` (`canMatch: [ShieldGuard]`), allowing secure deep linking.
- `**`: Fallback route redirecting to `/`.
