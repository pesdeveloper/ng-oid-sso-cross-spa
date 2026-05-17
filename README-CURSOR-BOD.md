# Paquete Cursor para continuar BOD Angular

Copiar estas carpetas/archivos en la raíz del repo Angular:

- `.cursor/rules/*`
- `.cursor/context/*`
- `.cursor/prompts/*`

Uso recomendado:

1. Restaurar repo limpio.
2. Hacer commit baseline.
3. Copiar este paquete.
4. Hacer commit de reglas Cursor.
5. Ejecutar slices de a uno desde `.cursor/prompts/`.

Orden sugerido:

1. `SLICE-00-base-habilitaciones.md`
2. `SLICE-01-alta-ux-sin-http.md`
3. `SLICE-02-mocks-falso-sin-http.md`
4. `SLICE-03-bod-service-models-sin-ui.md`

Regla de oro: si Cursor intenta tocar auth, cancelar el cambio.
