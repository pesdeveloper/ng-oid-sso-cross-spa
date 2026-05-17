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
- **appNs**: Namespace para claves de storage (e.g., 'bod').
- **pingPath**: Endpoint del IdP (default: `/api/session/ping`).
- **minIntervalMs**: Throttle para evitar exceso de pings (default: 5000ms).
- **events**: Eventos monitoreados: `['pageshow', 'focus']`.
- **onlyWhenAuthenticated**: Si `false`, monitorea incluso sin tokens (permite detectar login externo).
- **recoverMode**: Estrategia de recuperación: `promptNone` (usa iframe silencioso).
- **antiforgery**:
    - `enabled: true`.
    - `path: '/antiforgery/token'`.
    - `run: 'beforePing'`.

## Core Methods
- `start(options)`: Inicializa los hooks y la configuración.
- `bootstrapAuthOnce(params)`: Realiza un ping inicial y opcionalmente un `checkAuth` para sincronizar el estado al arrancar.
- `markLogoutFromThisApp()`: Setea un flag en `sessionStorage` para evitar que el guard intente recuperar la sesión tras un cierre voluntario.
- `clearLogoutDisabledFlag()`: Limpia el flag de logout para permitir nuevas recuperaciones.