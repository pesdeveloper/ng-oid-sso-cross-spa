# Component: Datos

**Path**: `src/app/pages/datos/datos.ts`

## Description
Componente simple para visualizar parámetros recibidos a través de la URL.

## Logic Flow
- **Route Params**: Captura `sujeto` y `cuenta` desde la ruta (`/datos/:sujeto/:cuenta`).
- **Query Params**: Captura el parámetro `v` desde la query string (`?v=...`).
- **UI**: Muestra los valores capturados en una tarjeta de Material Design.

## Dependencies
- `ActivatedRoute`: Para acceder a los parámetros de la ruta.
- `MatCardModule`: Para la presentación visual.
