# Authentication and Session Specification

## Overview
This document specifies the authentication mechanics, session management, and cross-site request forgery (XSRF) protections implemented in the `ng-oid-sso-cross-spa` frontend. 

The application utilizes a hybrid approach:
1. `angular-auth-oidc-client` for the core OpenID Connect (OIDC) protocol.
2. `mma-sso-session-guard` (Internal Library) for customized session polling, state management, and deep-link recovery.

## OIDC Configuration (`src/app/auth/auth.config.ts`)
The OIDC client is configured for the **Authorization Code** flow with **Refresh Tokens**.

**Key Configurations:**
- `responseType`: `'code'`
- `useRefreshToken`: `true` (Tokens are refreshed automatically based on `triggerRefreshWhenIdTokenExpired`).
- **Disabled Native Features:** The standard `silentRenew` and `startCheckSession` are explicitly set to `false`. This delegates session validation responsibilities to the `mma-sso-session-guard`.
- `clientId`: `'js_bod_hab_client'`
- `scope`: `'openid profile email phone offline_access tramites'`

## Routing Protection (`ShieldGuard`)
Located in `src/app/auth/guards.ts`, `ShieldGuard` implements a `CanMatchFn` to protect lazy-loaded features (like the `/datos` route).

**Mechanics:**
1. **Bootstrap Dependency:** It waits for `AuthSessionFacade.bootstrapOnce()` to complete before evaluating access.
2. **Authentication Check:** If `isAuthenticated` is true, the route matches.
3. **OIDC Callback Bypass:** If the current URL is an OIDC callback (contains `code=`, `state=`, etc.), it skips capturing the URL to avoid overriding the deep-link recovery process.
4. **Deep-Link Capture:** If unauthenticated, it reconstructs the requested path from the route segments and instructs the `SsoSessionGuardService` to save it via `setReturnUrl(path)`.

## SSO Session Guard Integration
Configured globally in `src/app/app.config.ts`, `provideSsoSessionGuard` establishes the runtime session monitoring behavior:
- **Ping/Polling:** Pings `/api/session/ping` every 5 seconds (`minIntervalMs: 5000`) on `pageshow` events.
- **Recovery Mode:** `'promptNone'` enables silent re-authentication attempts against the IdP if the local session is lost but the central session remains valid.
- **Deep-Links:** Explicitly allows prefixes like `['/datos', '/checkout']` for post-login return paths.
- **Anti-forgery:** Integrates a pre-ping request to `/antiforgery/token` to ensure the session ping is secure.

## XSRF Cross-Site Security
Angular's native `HttpClient` XSRF protection is typically disabled for cross-origin requests. To securely interact with the IdP (e.g., `https://localhost:5141`), a custom interceptor is implemented: `xsrfCrossSiteInterceptor`.

**Rules:**
- Triggers on unsafe methods (`POST`, `PUT`, `PATCH`, `DELETE`).
- Targets specifically requests matching the IdP origin.
- Forces `withCredentials: true` to ensure cookies are sent.
- Manually reads the `XSRF-TOKEN` cookie and injects it into the `X-XSRF-TOKEN` header.
