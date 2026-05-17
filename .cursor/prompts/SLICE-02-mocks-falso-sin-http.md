# Slice 02 — Mock factory con @ngneat/falso, sin HTTP real

Objetivo: incorporar `@ngneat/falso` para generar el request mock editable de alta comercio/persona, sin llamar todavía a BOD API.

Reglas:

- No tocar auth.
- No tocar routing.
- No tocar documentación.
- No crear HTTP real todavía.
- No usar `randUuid()`.
- Para sufijo único usar `Date.now().toString().slice(-6)`.

Tareas:

1. Si `@ngneat/falso` no está instalado, pedir confirmación antes de instalar. Si ya está instalado, usarlo.
2. Crear `src/app/core/mocks/bod-habilitaciones.mock.ts`.
3. Crear función `buildMockAltaComercioPersonaRequest()`.
4. Usar `@ngneat/falso` para nombres, empresa, calle, teléfono, email.
5. Usar valores fijos válidos para IDs/catálogos según `.cursor/context/BOD_API_ENDPOINTS_BOD_API.md`.
6. Conectar el botón “Preparar alta comercio/persona” para usar el factory.
7. Mantener form editable y JSON preview.
8. No llamar backend todavía.
9. Compilar.
