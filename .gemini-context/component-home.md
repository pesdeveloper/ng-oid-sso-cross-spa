# Component: Home

**Path**: `src/app/pages/home/home.ts`

## Description
Componente de la página de inicio (Landing Page). La lógica de autenticación y redirección se ha trasladado al componente `App`.

## Logic
- Muestra el estado de autenticación actual (`isAuthenticated`) mediante una señal, pero la interfaz de usuario ha sido reemplazada por el contenedor vacío.
- Se suscribe a `oidcSecurityService.isAuthenticated$` en `ngOnInit` para actualizar el estado.

## UI
- Contenedor vacío. Las acciones de inicio de sesión y redirección se manejan en el componente principal (`App`).
