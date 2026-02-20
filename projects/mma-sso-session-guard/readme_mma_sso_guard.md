# mma-sso-session-guard

Librería para **mejorar la sesión SSO** en SPAs Angular que usan `angular-auth-oidc-client`, especialmente cuando:
- Tenés **múltiples SPAs** (ej: BOD y MásPagos) contra el **mismo IdP**
- Querés que al volver a una SPA, se valide rápido si hay **sesión en el IdP** (cookie) y se recupere con `prompt=none`
- Querés evitar **loops** y manejar bien **logout**, deep-links y “returnUrl”.

Incluye:
- `provideSsoSessionGuard(...)` (provider principal)
- `SsoSessionGuardService` (infra/guard)
- `AuthSessionFacade` (fachada simple para apps: `bootstrap()`, `login()`, `logout()`, `refresh()`, `state$`, `onLogin$`, etc.)

---

## Requisitos

- Angular (standalone / `ApplicationConfig`)  
- `angular-auth-oidc-client` configurado y funcionando (PKCE/code flow recomendado)
- Un IdP accesible (misma autoridad para todas las SPAs que comparten SSO)
- Si vas a usar `pingPath` contra el IdP: CORS + cookies cross-site correctamente configuradas en el IdP

---

## Instalación

### 1) Instalar dependencia

> Si está como paquete npm (ej. interno):  
`npm i mma-sso-session-guard`

Si lo consumís como workspace/lib local, importalo por path o alias según tu repo.

Ejemplo de instalacion desde archivo local

```bash
npm install S:\Source\NET\tokenserver.angular\ng-libs-local\mma-sso-session-guard-1.0.0.tgz

Requisito: angular-auth-oidc-client v20.0.2 o superior.

---

## Conceptos clave

### `bootstrap()`
Se llama **una vez** al iniciar la app (en `ngOnInit` del `App`).
Hace:
- Lee config del `OidcSecurityService`
- Maneja ruta especial `/logout` (limpia sesión local y evita recover)
- Ejecuta un “arranque único” con `bootstrapAuthOnce(...)`:
  - ping al IdP (si aplica)
  - `checkAuth()`
  - `recover(prompt=none)` una sola vez (anti-loop)

### Logout seguro
El logout marca un flag (“logout disabled”) para que el guard **no intente recover** inmediatamente.

### ReturnUrl / deep-links
La lib guarda una returnUrl para volver a la pantalla original, con validación simple por **prefijos permitidos** (ej: `['/datos']`).
No valida querystring/fragment por defecto (simple y práctico).

---

## Configuración: `provideSsoSessionGuard(...)`

Ejemplo típico en `app.config.ts`:

```ts
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { provideAuth, authInterceptor } from 'angular-auth-oidc-client';
import { provideSsoSessionGuard, SimpleLogLevel } from 'mma-sso-session-guard';

import { routes } from './app.routes';
import { authConfig } from './auth/auth.config';
import { xsrfCrossSiteInterceptor } from './auth/xsrf-cross-site.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // OIDC
    provideAuth(authConfig),

    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
      withInterceptors([authInterceptor(), xsrfCrossSiteInterceptor]),
    ),

    // SSO Session Guard
    provideSsoSessionGuard({
      appNs: 'bod',                 // ✅ importante: namespace único por app (anti-loop)
      pingPath: '/api/session/ping', // endpoint en IdP para validar cookie/sesión
      minIntervalMs: 5000,

      // Eventos que disparan pings/validación cuando el user vuelve a la pestaña
      // Recomendado: pageshow + focus (simple y robusto)
      events: ['pageshow', 'focus'],

      onlyWhenAuthenticated: false,  // si querés ping incluso sin tokens locales
      recoverMode: 'promptNone',     // recupera con authorize(prompt=none) una vez
      forceLoginIfNoIdpSession: false,

      logPrefix: 'BOD-SSO',
      defaultLogLevel: SimpleLogLevel.Debug,

      // Opcional: antiforgery (si tu IdP lo requiere para endpoints protegidos)
      antiforgery: {
        enabled: true,
        path: '/antiforgery/token',
        run: 'beforePing', // 'beforePing' | 'beforeRecover' | 'bootstrap'
      },

      // Seguridad returnUrl/deep-links
      allowedReturnUrlPrefixes: ['/datos'], // ✅ /datos/* permitido
    }),
  ],
};