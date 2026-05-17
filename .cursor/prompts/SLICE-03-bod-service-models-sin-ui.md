# Slice 03 — BodApiService y modelos mínimos, sin conectar UI todavía

Objetivo: crear modelos mínimos y `BodApiService` para BOD API, sin conectar todavía el botón de alta.

Reglas:

- No tocar auth.
- No modificar `auth.config.ts` ni `secureRoutes` todavía salvo pedido explícito.
- No tocar routing.
- No tocar documentación.
- No sobre-modelar el backend.

Tareas:

1. Crear `src/app/core/models/bod-api.models.ts`.
2. Modelar request/response mínimos para alta comercio/persona según `.cursor/context/BOD_API_ENDPOINTS_BOD_API.md`.
3. Crear `src/app/core/services/bod-api.service.ts`.
4. Usar `HttpClient` con `inject()`.
5. Usar `environment.apis.bodBaseUrl` si existe. Si no existe, agregarlo solo en environment, sin tocar auth.
6. Agregar método `altaComercioPersona(request)` apuntando al endpoint real documentado.
7. No conectar UI todavía.
8. Compilar.
