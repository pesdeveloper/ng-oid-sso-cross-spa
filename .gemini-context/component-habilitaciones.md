# Component: Habilitaciones

**Path**: `src/app/pages/habilitaciones/habilitaciones.ts`

## Description
Página de redirección/landing para el módulo de Habilitaciones. Su función UI ha sido trasladada al Shell de `App`.

## Logic Flow
- **External Redirect**: Contiene un método `goToExternal()` que redirige al usuario a `https://localhost:4203/tasas`, pero no se invoca directamente en la vista actual.
- **UI**: Contenedor vacío. Las acciones de navegación y autenticación se encuentran en el componente raíz (`App`).

## Dependencies
- Material modules (Button, Card, Icon) importados pero no utilizados activamente en el template.
