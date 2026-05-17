# Reglas de Comportamiento del Asistente (Project Rules)

## Ámbito de Trabajo
- Tienes acceso completo de LECTURA y ESCRITURA para el código fuente dentro de la carpeta `./src`.
- Tienes acceso de LECTURA para la configuración general del proyecto Angular.

## Restricciones Críticas de Seguridad y Escritura (PROHIBIDO TOCAR)
- **Ruta Protegida:** `projects/mma-sso-session-guard/`
- **Regla:** Tienes permiso de **LECTURA ÚNICAMENTE** sobre esta carpeta para entender el Single Sign-On y los flujos de sesión. Está **ESTRICTAMENTE PROHIBIDO** crear, modificar, parchear o eliminar cualquier archivo dentro de esta ruta bajo ninguna circunstancia.

## Fuente de Verdad (Spec-as-Source)
- **Directiva Obligatoria:** Antes de escribir, modificar o sugerir cualquier código, debes leer y analizar activamente los archivos de especificación técnica ubicados en `./docs/spec/`.
- **Alineación:** Cualquier nueva funcionalidad, componente, servicio o refactorización debe alinearse estrictamente con la arquitectura (`architecture.md`), los modelos de datos (`data-models.md`) y las reglas de sesión (`auth-session.md`) allí definidos.
- **Sincronización Bidireccional:** Si el usuario te pide una tarea que altera el comportamiento actual del sistema, primero debes proponer la actualización correspondiente en el archivo `.md` de la especificación antes de modificar el código fuente (`./src`).
