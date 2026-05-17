# Core Features Specification

## Overview
This document maps the primary use cases, core UI components, and business rules within the `ng-oid-sso-cross-spa` application. The application utilizes Angular Standalone Components and the modern Signals API for state management.

## UI Components (`src/app/pages`)

### 1. Home (`Home`)
- **Path:** `/`
- **Purpose:** Serves as the landing dashboard.
- **State Management:** Uses an Angular `signal` (`isAuthenticated`) to reactively reflect the user's authentication status by subscribing to `OidcSecurityService.isAuthenticated$`.
- **UI:** Implements basic Material Design (`MatCardModule`).

### 2. Datos (`Datos`)
- **Path:** `/datos/:sujeto/:cuenta`
- **Purpose:** A secure deep-link target used to display specific account/subject data.
- **Routing Rules:** Protected by `ShieldGuard`. Requires an active session.
- **State Management:** Captures `sujeto` and `cuenta` from the route path parameters, and an optional `v` from query parameters (`?v=...`), storing them in individual `signal` variables.
- **Business Rule:** This component is the primary entry point for external flows linking into the application to display specific tax/subject details.

### 3. Logout (`Logout`)
- **Path:** `/logout`
- **Purpose:** Acts as the `postLogoutRedirectUri` landing page after a central logout from the IdP.
- **Business Rule:** It has no UI logic. It simply triggers an automatic redirect to `/` (Home) upon initialization. Session cleanup is expected to be handled *before* the redirect to the IdP by the `AuthSessionFacade`.

## Core Services (`src/app/core/services`)

### `BasicService`
- **Purpose:** Central HTTP service for retrieving core subject/account information.
- **Target API:** `https://sb-comon-api.malvinasargentinas.gob.ar`
- **Method:** `getBasic(id_suj: number, id_bie: number): Observable<BasicResponse>`
- **Logic:** Constructs HTTP GET requests to `/Basic/Get` utilizing `HttpParams` to append `id_suj` and `id_bie`.

## UI & Architecture Standards Detected
1. **Signals:** The application aggressively adopts Angular Signals (`signal<T>`) for primitive state holding in components instead of relying heavily on `BehaviorSubject` or raw class variables.
2. **Standalone Components:** Modules are fully bypassed in favor of Standalone components declaring their own `imports` (e.g., `CommonModule`, `MatCardModule`).
3. **Dependency Injection:** Prefers the modern `inject()` function over constructor injection for cleaner class signatures.
