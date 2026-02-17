# Component: Habilitaciones

**Path**: `src/app/pages/habilitaciones/habilitaciones.ts`

## Description
Página de redirección/landing para el módulo de Habilitaciones. Reemplaza al anterior componente `Tasas`.

## Logic Flow
- **External Redirect**: Contiene un método `goToExternal()` que redirige al usuario a `https://localhost:4203/tasas`.
- **UI**: Muestra una interfaz simple con botones o tarjetas (Material Design) para iniciar el trámite o consulta externa.

## Dependencies
- Ninguna dependencia de servicios inyectada explícitamente más allá de lo necesario para el renderizado (Material modules).