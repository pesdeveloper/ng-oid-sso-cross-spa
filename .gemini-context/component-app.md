# Component: App

**Path**: `src/app/app.ts`

## Description
Componente raíz de la aplicación. Orquesta la inicialización de la seguridad, la interfaz principal (Shell) y la integración con el `SsoSessionGuardService`.

## Dependencies
- `OidcSecurityService`: Gestión de autenticación OIDC.
- `SsoSessionGuardService`: Servicio de monitoreo de sesión y recuperación.
- `Router`: Navegación.
- `HttpClient`: Peticiones HTTP auxiliares.

## Key Features
- **Auth State**: Mantiene señales (`signals`) para `isAuthenticated`, `accessToken`, `userInfo`, etc.
- **Session Management**: 
    - Delega la lógica compleja de recuperación y validación de sesión al `SsoSessionGuardService`.
    - En `ngOnInit`, inicializa la suscripción a `isAuthenticated$`.
- **Token Debugging**: Visualización y copiado de payloads de tokens para desarrollo.

## Logic Flow

### Initialization (`ngOnInit`)
1.  **Logout Check**: Si la ruta es `/logout`:
    -   Llama a `ssoGuard.markLogoutFromThisApp()` para evitar bucles de recuperación.
    -   Ejecuta `logoffLocal()`.
2.  **Auth Subscription**:
    -   Se suscribe a `isAuthenticated$`.
    -   Si está autenticado:
        -   Llama a `ssoGuard.clearLogoutDisabledFlag()` para reactivar la protección de sesión.
        -   Carga payloads de tokens y UserInfo.
3.  **Initial Check**: Llama a `oidcSecurityService.checkAuth()` una única vez para procesar callbacks de login o verificar estado inicial.

### Authentication Methods
- `login()`: Trigger de `authorize`.
- `logout()`: 
    -   Marca `ssoGuard.markLogoutFromThisApp()`.
    -   Ejecuta `logoff()` contra el IdP.
- `refreshSession()`: Fuerza renovación de tokens vía refresh token.

### Integration with `SsoSessionGuard`
El componente actúa como consumidor del guard, notificándole eventos críticos (como el logout explícito) y permitiendo que el guard gestione independientemente los pings al IdP y la recuperación de sesión en segundo plano.
