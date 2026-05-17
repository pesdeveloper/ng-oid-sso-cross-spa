# Slice 01 — Paso visual Alta comercio/persona, sin HTTP

Objetivo: agregar en `src/app/habilitaciones.ts/html/scss` una primera versión visual del Paso 1 “Alta cuenta comercio/persona”, sin llamadas HTTP todavía.

Reglas:

- No modificar auth.
- No modificar rutas.
- No modificar documentación.
- No instalar dependencias.
- No crear servicios HTTP todavía.
- No tocar `package.json` ni `package-lock.json`.

Tareas:

1. En `/habilitaciones`, agregar botón “Preparar alta comercio/persona”.
2. Al presionar, mostrar sección inline editable, no modal por ahora.
3. Campos simples: razón social/titular, nombre fantasía, domicilio comercio, domicilio postal.
4. Crear un objeto `requestPreview` en memoria del componente.
5. Actualizar `requestPreview` con los campos editables.
6. Mostrar debajo el JSON del `requestPreview`.
7. Agregar botón “Cancelar”.
8. Agregar botón “Enviar alta” pero por ahora deshabilitado o mostrando “Pendiente: integración API”.
9. Compilar y corregir solo errores causados por estos cambios.

Resultado esperado:

- `/habilitaciones` sigue cargando.
- Se ve el botón de preparar alta.
- Se puede editar un request mock local.
- No hay HTTP.
- No se tocó auth/routing/docs.
