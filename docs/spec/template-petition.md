# [SPEC] Requerimiento: [Nombre Corto de la Funcionalidad o Tarea]

## 1. Contexto y Fuentes de Verdad
Antes de proponer o escribir cualquier línea de código, debes leer, analizar y alinear la solución con los siguientes archivos de especificación técnica del proyecto:
- [ ] `./docs/spec/architecture.md` (Para respetar la arquitectura de módulos y flujos de datos)
- [ ] `./docs/spec/data-models.md` (Para mantener la consistencia en interfaces y DTOs)
- [ ] `./docs/spec/auth-session.md` (Si la tarea interactúa con la sesión o seguridad)

---

## 2. Objetivo del Requerimiento
[Describe de forma clara y concisa QUÉ se quiere lograr con esta nueva tarea o refactorización. Ej: "Agregar una pantalla de perfil de usuario que permita editar los datos básicos y ver el historial de accesos"].

---

## 3. Requerimientos Detallados

### 🧩 Frontend / Componentes (Angular)
- **Componente:** `[Nombre del nuevo componente o componente a modificar]`
- **Ruta propuesta:** `[Ej: ./src/app/modules/user/pages/profile/]`
- **Comportamiento esperado:**
  - [ ] [Requerimiento 1: Ej. Mostrar un formulario con validación reactiva para Email y Teléfono].
  - [ ] [Requerimiento 2: Ej. Consumir el servicio de auditoría para listar los últimos 10 accesos].

### 🔄 Servicios y Estado
- [ ] [Ej. Crear o extender el servicio `UserService` para incluir la petición PUT `/user/profile`].
- [ ] [Ej. Manejar el loading y manejo de errores usando el interceptor global].

---

## 4. Restricciones Técnicas y Reglas Críticas
- ⚠️ **REGLA DE ORO:** Tienes estrictamente **PROHIBIDO** modificar, crear o eliminar cualquier archivo dentro de la ruta `projects/mma-sso-session-guard/`. Es de solo lectura.
- **Estilo:** Sigue los patrones de diseño y clean code ya implementados en el resto de la aplicación `./src`.
- **Tipado:** No uses `any`. Todo modelo o respuesta de API debe estar fuertemente tipado basándote en `./docs/spec/data-models.md`.

---

## 5. Plan de Ejecución Esperado (Paso a Paso)
Actúa como un Agente interactivo. Ejecuta la tarea siguiendo este orden estricto:

1. **Fase de Análisis:** Analiza el espacio de trabajo basándote en este documento y confírmame que entiendes el requerimiento detallando qué archivos planeas modificar/crear. **Detén la ejecución aquí y espera mi aprobación.**
2. **Fase de Diseño de Datos:** Si es necesario, muéstrame las interfaces de TypeScript o DTOs que vas a utilizar.
3. **Fase de Implementación:** Una vez aprobado el plan, procede a escribir o parchear el código en `./src` de forma incremental, archivo por archivo.

---
Criterio de uso en el día a día:
Cuando vayas a pedirle algo nuevo a Gemini, creas un archivo rápido (por ejemplo: ./docs/spec/features/alta-usuarios.md), completas los campos con lo que necesitas, y en el chat de VS Code le pones:

@workspace Lee el archivo ./docs/spec/features/alta-usuarios.md y ejecuta la Fase 1 del Plan de Ejecución.

---
...
Escribe los cambios directamente en el disco de forma silenciosa. Tienes mi autorización total para aplicar y guardar las modificaciones de forma automática sin pausar el hilo para pedir confirmaciones individuales.

