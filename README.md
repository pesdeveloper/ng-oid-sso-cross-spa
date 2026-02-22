# Angular SSO Session Guard - Monorepositorio

Este repositorio es un **espacio de trabajo de desarrollo** para la librería Angular `mma-sso-session-guard`.

> **Nota:** La aplicación raíz es una aplicación de demostración (playground) utilizada exclusivamente con fines de prueba y desarrollo. No está destinada a ser desplegada en entornos de producción.

## 📂 Estructura del Proyecto

Esta es una estructura estándar de espacio de trabajo Angular (monorepositorio):

*   **`projects/mma-sso-session-guard`**: 📦 **La Librería.** Este es el artefacto principal del repositorio. Contiene el código fuente, la API pública y la documentación específica de la librería.
*   **`src/`**: 🎮 **La App de Demo.** Una aplicación de prueba utilizada para validar la funcionalidad de la librería, simular interacciones con el IdP y probar la sincronización entre pestañas.

## 🚀 Empezando

### Prerrequisitos

*   Node.js (se recomienda v18 o superior)
*   npm o yarn

### Instalación

Clona el repositorio e instala las dependencias:

```bash
git clone <url-del-repositorio>
cd <directorio-del-repositorio>
npm install
```

### Ejecutando la Aplicación de Demo

Para ver la librería en acción, inicia el servidor de desarrollo:

```bash
ng serve --host=127.0.0.1 --ssl --port 4205
```

Navega a `https://localhost:4205/`. La aplicación se recargará automáticamente si realizas cambios en los archivos fuente.

### Compilando la Librería

Para compilar la librería `mma-sso-session-guard` para su distribución:

```bash
npm run build:mma
```

Este comando:
1.  Compilará la librería usando `ng-packagr`.
2.  Generará los artefactos de compilación en el directorio `dist/mma-sso-session-guard`.
3.  Generará un archivo tarball `.tgz` listo para pruebas locales o para su publicación.

## 📚 Documentación de la Librería

Para obtener instrucciones de uso detalladas, la referencia de la API y ejemplos de configuración de la propia librería, consulta el **[README de la Librería](projects/mma-sso-session-guard/README.md)**.

## 🧪 Pruebas

Ejecuta las pruebas unitarias para la librería:

```bash
ng test mma-sso-session-guard
```

## 🤝 Contribuciones

¡Las contribuciones son bienvenidas! Sigue estos pasos:

1.  Haz un fork del repositorio.
2.  Crea una rama para tu funcionalidad (`git checkout -b feature/funcionalidad-increible`).
3.  Realiza tus cambios en el directorio `projects/mma-sso-session-guard`.
4.  Actualiza la aplicación de demo en `src/` para verificar tus cambios si es necesario.
5.  Realiza un commit de tus cambios.
6.  Abre un Pull Request.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](projects/mma-sso-session-guard/LICENSE) para más detalles.