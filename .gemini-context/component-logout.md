# Component: Logout

**Path**: `src/app/pages/logout/logout.ts`

## Description
Componente de finalización de sesión. Actúa como el destino de la redirección (`postLogoutRedirectUri`) después de que el usuario ha cerrado sesión en el Identity Provider (IdP).

## Logic Flow (`ngOnInit`)
- **Navegación**: Redirige inmediatamente a la raíz (`/`) usando `router.navigateByUrl('/')`.
- **Cleanup**: La lógica de limpieza de estado y la prevención de bucles de recuperación de sesión no ocurren aquí. Son manejadas por el `AuthSessionFacade.logout()` *antes* de que el usuario sea redirigido al IdP. Este componente es simplemente un punto de aterrizaje limpio post-logout.

## Dependencies
- `Router`: Para la redirección final.
- `OidcSecurityService`: Inyectado pero no usado activamente en el bloque `ngOnInit` actual.
