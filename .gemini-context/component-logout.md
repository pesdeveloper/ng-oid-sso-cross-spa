# Component: Logout

**Path**: `src/app/pages/logout/logout.ts`

## Description
Componente de finalización de sesión. Su lógica ha sido simplificada drásticamente ya que el manejo pesado del estado de logout se ha movido al `App` component y al `SsoSessionGuardService`.

## Logic Flow (`ngOnInit`)
- **Navegación**: Redirige inmediatamente a la raíz (`/`) usando `router.navigateByUrl('/')`.
- **Cleanup**: La limpieza de flags de recuperación y estado local se realiza previo a la carga de este componente (en el `App` component al detectar la ruta `/logout`) o se maneja implícitamente por el flujo de redirección.

## Dependencies
- `Router`: Para la redirección final.