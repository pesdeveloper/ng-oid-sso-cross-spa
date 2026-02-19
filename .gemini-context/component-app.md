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
- **Auth State**: Señales para `isAuthenticated`, `accessToken`, `accessPayload`, `idToken`, `idPayload`, `userInfo`, etc.
- **Session Management**: 
    - Integración profunda con `SsoSessionGuardService` para pings al IdP y recuperación silenciosa.
    - Llamada a `ssoGuard.bootstrapAuthOnce({ doCheckAuth: true })` en el inicio.
- **Token payloads**: Expone datos decodificados de los tokens y carga de UserInfo manual mediante paneles expansibles de Angular Material.
- **UI Shell**: 
    - `mat-toolbar` para el título dinámico (Client Name).
    - Paneles expansibles (`mat-expansion-panel`) para visualizar la configuración, Access Token, ID Token y UserInfo.
    - Botones con iconos para acciones comunes:
        - **Logout**: Cierra sesión local y redirige al IdP.
        - **Ver Access Token**: Imprime el token en consola.
        - **Perfil de usuario**: Redirige al perfil del usuario en el IdP.
        - **Refresh session**: Fuerza la renovación del token.
        - **Ir a Más Pagos**: Redirige a la aplicación externa (`https://localhost:4203/?from=bod`).

## Logic Flow

### Initialization (`ngOnInit`)
1.  **Logout Check**: Si la ruta empieza con `/logout`:
    -   `ssoGuard.markLogoutFromThisApp()`: Evita que el guard intente recuperar la sesión.
    -   `oidcSecurityService.logoffLocal()`: Limpia el estado local.
2.  **Auth Subscription**: Suscribe a `isAuthenticated$`:
    -   Actualiza la señal `isAuthenticated`.
    -   Carga la configuración OIDC y actualiza etiquetas (`title`).
    -   Si está autenticado: `ssoGuard.clearLogoutDisabledFlag()` para permitir recuperaciones futuras.
    -   Carga payloads de Access y ID tokens.
3.  **Bootstrap**: Ejecuta `ssoGuard.bootstrapAuthOnce({ doCheckAuth: true })` tras el `checkAuth` inicial de OIDC.

### Authentication Methods
- `login()`: Llama a `authorize()`.
- `logout()`: Marca logout en el guard y ejecuta `logoff()` en el IdP.
- `refreshSession()`: Fuerza la renovación del token.
- `goUserProfile()`: Redirige al perfil del usuario en el IdP.
- `goToMasPagos()`: Salto externo a otra SPA (`https://localhost:4203`).

### Data Loading
- `loadAccessTokenPayload()` / `loadIdTokenPayload()`: Decodifica tokens y actualiza las señales.
- `loadUserInfo()`: Petición explícita al endpoint de UserInfo del IdP con Bearer token.