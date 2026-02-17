# Component: Home

**Path**: `src/app/pages/home/home.ts`

## Description
Componente de la página de inicio (Landing Page).

## Logic
- Muestra el estado de autenticación actual (`isAuthenticated`) mediante una señal.
- Se suscribe a `oidcSecurityService.isAuthenticated$` en `ngOnInit` para actualizar el estado.
- UI simple basada en Material Card.

## Dependencies
- `OidcSecurityService`: Para monitorear el estado de autenticación.