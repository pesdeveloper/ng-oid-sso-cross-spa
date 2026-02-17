# Service: SsoSessionGuardService

**Path**: `src/app/auth/sso-session-guard.service.ts`
**Providers Path**: `src/app/auth/sso-session-guard.providers.ts`

## Description
Guard avanzado y servicio de "Keep-Alive" para sesiones OIDC en SPAs. Su objetivo principal es sincronizar el estado de sesión local (tokens en navegador) con el estado de sesión en el Identity Provider (IdP) mediante cookies.

## Core Responsibilities
1.  **Session Revalidation (Ping)**:
    - Realiza peticiones periódicas (throttled) a un endpoint de "ping" en el IdP (`/api/session/ping`) para verificar si la cookie de sesión sigue activa.
    - Maneja eventos de ciclo de vida de la página: `pageshow` (BFCache), `visibilitychange` (cambio de tab), `focus`.
2.  **State Synchronization**:
    - Si el IdP responde 401/403 (sin sesión), fuerza un `logoffLocal()` en la SPA para evitar estados inconsistentes ("falsos positivos").
3.  **Silent Recovery (Optional)**:
    - Puede intentar recuperar la sesión silenciosamente (`prompt=none`) si detecta cookie en el IdP pero no hay tokens locales.
4.  **Loop Prevention**:
    - Utiliza `sessionStorage` y flags (`promptNoneOnceKey`, `interactiveOnceKey`, `logoutDisabledKey`) para asegurar que los intentos de recuperación o login automático ocurran solo una vez por sesión de pestaña, evitando bucles infinitos.
5.  **Antiforgery Integration**:
    - Capacidad de obtener un token antiforgery del IdP antes de realizar operaciones críticas (como el ping), asegurando que las cookies de sesión sean aceptadas en entornos con protecciones CSRF estrictas.

## Configuration (`SsoSessionGuardAppConfig`)
Interfaz simplificada para la configuración vía `provideSsoSessionGuard`:

- **appNs**: Namespace para claves de storage (e.g., 'bod').
- **pingPath**: Endpoint del IdP (default: `/api/session/ping`).
- **minIntervalMs**: Throttle para evitar exceso de pings (default: 5000ms).
- **onlyWhenAuthenticated**: Si `false`, el guard monitorea incluso si la SPA no tiene tokens (útil para detectar login en otra pestaña o recuperar sesión perdida).
- **recoverMode**: Estrategia de recuperación (`none`, `promptNone`, `interactive`).
- **forceLoginIfNoIdpSession**: Comportamiento tipo Office365 (login forzado si no hay cookie).
- **antiforgery**: Objeto de configuración para el manejo de tokens CSRF:
    - `enabled`: Activa la obtención del token.
    - `path`: Endpoint del token (e.g., `/antiforgery/token`).
    - `run`: Momento de ejecución (e.g., `beforePing`).

## Usage
Se integra en `app.config.ts` mediante `provideSsoSessionGuard(...)`. El provider se encarga de inyectar las dependencias y arrancar el servicio automáticamente (`APP_INITIALIZER`).