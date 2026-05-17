# Component: App

**Path**: `src/app/app.ts`

## Description
Componente raíz y Shell de la aplicación. Es responsable de inicializar el flujo de autenticación a través del `AuthSessionFacade` y de renderizar la UI principal basada en el estado de la sesión.

## Dependencies
- `AuthSessionFacade`: El punto de entrada principal para toda la gestión de sesión y autenticación.
- `Router`: Navegación.

## Key Features
- **Auth State**: Señales para `isAuthenticated`, `accessToken`, `accessPayload`, `idToken`, `idPayload`, `userInfo`, etc.
- **Session Management**: 
    - Delegación completa de la gestión de sesión al `AuthSessionFacade`.
    - Una única llamada a `auth.bootstrapOnce()` en `ngOnInit` se encarga de todo el proceso de inicialización, incluyendo `checkAuth`, ping al IdP, recuperación silenciosa y restauración de deep-links.
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
1.  **State Subscription**: Se suscribe al observable `auth.state$` del `AuthSessionFacade`. Cada vez que el estado de la sesión cambia, actualiza las señales locales del componente (`isAuthenticated`, `idPayload`, `userInfo`, etc.).
2.  **Event Hooks (Opcional)**: Se suscribe a eventos del facade como `onLogin$` y `onLogout$` para logging o efectos secundarios.
3.  **Bootstrap**: Invoca `auth.bootstrapOnce()` al final del `ngOnInit`. Esta es la acción clave que dispara todo el flujo de autenticación y sincronización de sesión. La llamada es asíncrona y su posible rechazo se maneja para no bloquear la app.

### Authentication Methods
- `login()`: Llama a `auth.login()`.
- `logout()`: Llama a `auth.logout()`.
- `refreshSession()`: Llama a `auth.refresh()`.
- `goUserProfile()`: Llama a `auth.goUserProfile()`.
- `goToMasPagos()`: Salto externo a otra SPA (`https://localhost:4203`).

### Data Loading
- Los payloads de los tokens se obtienen directamente del `AuthSessionState` (`s.accessPayload`, `s.idPayload`).
- `loadUserInfo()` / `refreshUserInfo()`: Invocan los métodos correspondientes del facade (`auth.refreshUserInfo()`) para cargar o forzar la recarga de la información del usuario.
