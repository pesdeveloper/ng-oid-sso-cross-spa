# Slice 00 — Base UX/ruta Habilitaciones, sin HTTP

Trabajá solo en el repo local abierto en Cursor.

Antes de tocar código, leé:

- `.cursor/context/REGLAS_RUTAS_ANGULAR.md`
- `.cursor/context/BOD_API_ENDPOINTS_BOD_API.md`

Objetivo: crear desde cero la base de UX para el flujo de pruebas BOD Habilitaciones, sin implementar llamadas HTTP ni tocar autenticación.

Reglas obligatorias:

- No modificar lógica de autenticación.
- No modificar `src/app/auth/*`.
- No modificar `src/app/app.config.ts`.
- No modificar `auth.config.ts`.
- No modificar guards.
- No modificar `mma-sso-session-guard`.
- No modificar clientId, scopes, authority, redirectUri, silent renew, storage ni callback handling.
- No instalar dependencias.
- No tocar `package.json` ni `package-lock.json`.
- No modificar documentación ni archivos `.md`.
- No crear servicios HTTP todavía.
- No llamar APIs todavía.
- No crear mocks todavía.
- No usar `@ngneat/falso` todavía.

Contexto:

- Esta app Angular ya tiene flujo OIDC/SSO funcionando.
- El home actual tiene UX de login/logout/datos y un panel de pruebas de redirección.
- Queremos reemplazar visualmente el panel de pruebas de redirección por accesos a flujos reales de prueba BOD.
- Por ahora solo crear acceso a Habilitaciones.
- El componente Habilitaciones debe vivir en `src/app/habilitaciones.ts`.
- La ruta debe importar exactamente: `import('./habilitaciones').then(m => m.Habilitaciones)`.
- No usar `import('./pages/habilitaciones/habilitaciones')`.

Tareas:

1. Revisar `src/app/app.routes.ts`.
2. Agregar rutas `/habilitaciones` y `/habilitaciones/:valueId`.
3. Ambas rutas deben usar `loadComponent: () => import('./habilitaciones').then(m => m.Habilitaciones)`.
4. Mantener `canMatch: [ShieldGuard]` si las rutas protegidas existentes lo usan.
5. Crear `src/app/habilitaciones.ts`, `src/app/habilitaciones.html`, `src/app/habilitaciones.scss`.
6. `src/app/habilitaciones.ts` debe ser standalone y exportar exactamente `export class Habilitaciones`.
7. Leer `valueId` desde `ActivatedRoute`.
8. Mostrar modo inicio si no hay `valueId`.
9. Mostrar modo retorno/consulta si hay `valueId`.
10. En el home/app principal, quitar visualmente el “Panel de pruebas de Redirección”, sin borrar métodos/lógica que puedan ser usados por auth/logout/deep-link si no estás seguro.
11. Mantener visibles controles de sesión/logout existentes.
12. Agregar tarjeta o botón “Flujo Habilitaciones”.
13. Ese botón debe navegar a `/habilitaciones` usando `Router.navigate`, no `routerLink`.
14. La pantalla `/habilitaciones` debe mostrar título y pasos: Alta cuenta comercio/persona, Emitir tasa de habilitaciones, Continuar a MASPagos, Leer cuenta corriente.
15. Compilar y corregir solo errores causados por estos cambios.

Resultado esperado:

- La app sigue cargando.
- Login/logout no se rompe.
- Home muestra “Flujo Habilitaciones”.
- Click navega a `/habilitaciones`.
- `/habilitaciones` muestra pantalla base.
- `/habilitaciones/123` muestra modo retorno/consulta.
- No se tocó auth.
- No se tocó documentación.
- No se instalaron dependencias.
