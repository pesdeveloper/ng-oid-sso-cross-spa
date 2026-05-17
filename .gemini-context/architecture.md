# Application Architecture

## Overview
Aplicación Angular standalone (v19+) enfocada en la autenticación con OIDC y la integración con servicios externos de Habilitaciones. Actúa como un portal de acceso seguro (Gateway/Landing) que gestiona la sesión de usuario antes de derivar a aplicaciones específicas.

## Modules & Structure

### Core
- **Services**: 
    - `SsoSessionGuardService`: Gestor de sesión avanzado para sincronización SPA <-> IdP. Incluye manejo integrado de Antiforgery tokens y recuperación silenciosa.
    - `BasicService`: (Legacy/Uso interno) Comunicación con API backend.
- **Interceptors**:
    - `authInterceptor` (angular-auth-oidc-client): Inyecta token bearer.
    - `xsrfCrossSiteInterceptor`: Manejo manual de tokens XSRF para llamadas cross-site seguras hacia el IdP.

### Auth (OIDC)
Configuración centralizada en `src/app/auth/auth.config.ts`.
- **Library**: `angular-auth-oidc-client`.
- **Authority**: `https://localhost:7301` (Dev).
- **Client ID**: `js_bod_hab_client`.
- **Flow**: Code Flow con PKCE (`responseType: 'code'`).
- **Session Management**:
    - `SsoSessionGuardService` activo para validación de cookie de sesión IdP.
    - `autoUserInfo: true`: Carga automática de datos de usuario.
    - `silentRenew: false`: Desactivado en favor del manejo por Refresh tokens.
    - `postLoginRoute`: Se mantiene en `/` para no interferir con la restauración de deep-links.

### Routing (`app.routes.ts`)
| Path | Component | Description |
|------|-----------|-------------|
| `/` | `Home` | Página principal (Dashboard vacío, acciones en Shell). |
| `/logout` | `Logout` | Callback post-logout y limpieza. |
| `/habilitaciones` | `Habilitaciones` | Landing de Habilitaciones (acciones en Shell). |
| `/datos/:sujeto/:cuenta` | `Datos` | Visualización de parámetros de ruta y query string (`v`). |

### Dependency Injection
Configurada en `app.config.ts`.
- `provideHttpClient`: Con `withFetch`, `withXsrfConfiguration` y `withInterceptors`.
- `provideAuth`: Inicializa OIDC.
- `provideSsoSessionGuard`: Configura el servicio de monitoreo de sesión.
    - **Events**: `pageshow` (recomendado para BFCache).
    - **Recover Mode**: `promptNone` (Intenta recuperar sesión silenciosamente si hay cookie IdP).
    - **Antiforgery**: Habilitado (`run: 'beforePing'`).

## Security
- **Secure Routes**: Configurado en `authConfig` para inyectar tokens solo en dominios permitidos (`sb-comon-api`, `sb-pagosonline`).
- **Session hardening**: Implementación de `SsoSessionGuard` para prevenir sesiones "zombies" locales cuando la sesión del IdP expira o se cierra externamente.
- **Cross-Site XSRF**: Manejado explícitamente por `xsrfCrossSiteInterceptor` y por el mecanismo de Antiforgery integrado en `SsoSessionGuard` para comunicaciones con el IdP.
