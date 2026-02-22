# Angular SSO Session Guard & Navegación Cross-SPA

Una librería de infraestructura robusta para gestionar la **persistencia de autenticación entre múltiples SPAs**, **enlaces profundos (deep linking) seguros** y **sincronización de sesiones** en aplicaciones Angular.

Construida sobre [angular-auth-oidc-client](https://github.com/damienbod/angular-auth-oidc-client), esta librería actúa como un "gestor inteligente" que orquesta las verificaciones de autenticación, renovaciones silenciosas y eventos de navegación entre múltiples aplicaciones de página única (SPAs) que comparten el mismo Proveedor de Identidad (IdP).

## 🚀 Problemática

Al construir una suite de SPAs (ej. un Panel de Control, un Portal de Pagos y un Gestor de Perfil) que comparten una única sesión SSO, los desarrolladores suelen enfrentar desafíos complejos:

*   **Sincronización de Sesión:** Si un usuario cierra sesión en la Pestaña A, la Pestaña B permanece "conectada" hasta que se intenta acceder a una ruta protegida.
*   **Bucles (Looping):** Las redirecciones ingenuas al IdP pueden causar bucles infinitos de inicio de sesión si la sesión es inválida.
*   **Deep Linking:** Devolver a un usuario a una ruta anidada específica (ej. `/pedidos/123`) después de un inicio de sesión silencioso suele fallar o ser inseguro.
*   **Sesiones "Zombis":** Los tokens locales persisten incluso si la sesión en el servidor del IdP ha expirado.

**SSO Session Guard** resuelve estos problemas proporcionando una máquina de estados centralizada que escucha eventos de ventana, verifica el estado de la sesión en el IdP y restaura de forma segura el contexto de la aplicación.

## ✨ Características

*   **Recuperación Inteligente de Sesión:** Intenta automáticamente `prompt=none` (renovación silenciosa) cuando se detecta una sesión en el IdP, sin bloquear la interfaz de usuario.
*   **Sincronización entre Pestañas:** Escucha los eventos `focus` y `pageshow` para re-validar las sesiones cuando los usuarios cambian de pestaña.
*   **Deep Linking Seguro:** Preserva la `returnUrl` con una lista permitida (allowlist) de prefijos estrictos para prevenir vulnerabilidades de Redirección Abierta (Open Redirect).
*   **Prevención de Bucles:** Lógica inteligente para detectar y detener bucles de redirección infinitos entre la SPA y el IdP.
*   **Soporte para "Ping" al IdP:** Capacidad opcional de realizar un "ping" a un endpoint ligero del IdP para verificar el estado de la sesión antes de intentar intercambios de tokens completos.
*   **Preparado para Standalone:** Totalmente compatible con la arquitectura `provide...` de Angular y Componentes Standalone.

## 📦 Instalación

```bash
npm install mma-sso-session-guard
```

### Dependencias (Peer Dependencies)

Asegúrate de tener instalados:

*   `@angular/core` >= 17.0.0
*   `angular-auth-oidc-client` >= 17.0.0

## ⚙️ Configuración del Backend (IdP / OpenIddict)

Esta librería fue desarrollada y probada utilizando **OpenIddict v7** como servidor de tokens.

Para que la funcionalidad de `pingPath` (verificación activa de sesión) funcione correctamente, **es necesario implementar un endpoint en tu servidor de identidad**. Este endpoint debe validar la cookie de autenticación y retornar:
*   `200 OK`: Si la sesión (cookie) es válida.
*   `401 Unauthorized`: Si la sesión ha expirado o no existe.

### Ejemplo de implementación (ASP.NET Core)

```csharp
app.MapGet("/api/session/ping", async (HttpContext ctx) => {
    // 'AuthSchemes.Primary' debe ser el esquema de autenticación por cookies de tu aplicación
    // (ej. IdentityConstants.ApplicationScheme o "Cookies")
    var result = await ctx.AuthenticateAsync(AuthSchemes.Primary);

    if (!result.Succeeded || result.Principal == null) {
        Log.Logger.Information($"EXECUTE PING /api/session/ping result: UNAUTHORIZED at {DateTimeOffset.UtcNow} from {ctx.Request.Path}");
        return Results.Unauthorized();
    }

    Log.Logger.Information($"EXECUTE PING /api/session/ping result: AUTHORIZED at {DateTimeOffset.UtcNow} from {ctx.Request.Path}");
    return Results.Ok(new { isAuthenticated = true, user = result.Principal.Identity?.Name });
});
```

## 🛠️ Uso

### 1. Configurar el Proveedor

Añade `provideSsoSessionGuard` a tu `app.config.ts` (o `AppModule`). Generalmente se coloca junto a la configuración de `provideAuth`.

```typescript
// app.config.ts
import { ApplicationConfig } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAuth } from 'angular-auth-oidc-client';
import { provideSsoSessionGuard, SimpleLogLevel } from 'mma-sso-session-guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    
    // 1. Configura tu cliente OIDC como de costumbre
    provideAuth({
      config: {
        authority: 'https://identidad.ejemplo.com',
        redirectUrl: window.location.origin,
        postLogoutRedirectUri: window.location.origin,
        clientId: 'mi-cliente-spa',
        scope: 'openid profile email',
        responseType: 'code',
        silentRenew: true,
        useRefreshToken: true,
      }
    }),

    // 2. Añade el SSO Session Guard
    provideSsoSessionGuard({
      // Namespace único para esta app (evita colisiones en almacenamiento compartido)
      appNs: 'mi-app-dashboard',
      
      // Opcional: Ruta a un endpoint ligero en tu IdP para verificar cookies
      pingPath: 'https://identidad.ejemplo.com/api/session/status', 
      
      // Intervalo mínimo entre verificaciones para evitar spam al IdP
      minIntervalMs: 5000,

      // Eventos que disparan la re-verificación de sesión
      events: ['pageshow', 'focus'],

      // Seguridad: Solo permite restaurar URLs que comiencen con estos prefijos
      allowedReturnUrlPrefixes: ['/dashboard', '/configuracion', '/pedidos'],

      // Prefijo de logs para depuración (opcional)
      logPrefix: '[SSO-Guard]',
      defaultLogLevel: SimpleLogLevel.Warning,
    }),
  ],
};
```

### 2. Inicializar en AppComponent

Inyecta `AuthSessionFacade` y llama a `bootstrap()` en tu componente raíz. Esto iniciará la lógica de verificación y restauración de sesión.

```typescript
// app.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthSessionFacade } from 'mma-sso-session-guard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
  private readonly ssoFacade = inject(AuthSessionFacade);

  ngOnInit(): void {
    // Inicializa la lógica del guard de sesión
    this.ssoFacade.bootstrap();
    
    // Opcional: Suscribirse a eventos de login para efectos secundarios
    this.ssoFacade.onLogin$.subscribe(() => {
      console.log('¡Usuario autenticado y sesión activa!');
    });
  }
}
```

## ⚙️ Opciones de Configuración

| Opción | Tipo | Defecto | Descripción |
| :--- | :--- | :--- | :--- |
| `appNs` | `string` | **Requerido** | Identificador único de la aplicación. Se usa para las claves de almacenamiento. |
| `allowedReturnUrlPrefixes` | `string[]` | `[]` | **Configuración Crítica de Seguridad.** Lista permitida de rutas a las que la app puede volver tras el login. |
| `pingPath` | `string` | `undefined` | URL absoluta del endpoint del IdP para verificar la cookie de sesión. |
| `events` | `string[]` | `['focus', 'pageshow']` | Eventos de ventana que disparan una verificación. |
| `minIntervalMs` | `number` | `5000` | Intervalo de throttling para no saturar al servidor. |

## 🔒 Consideraciones de Seguridad

### Deep Linking y Redirección Abierta
Esta librería captura la URL actual antes de redirigir al IdP para el login. Al volver, restaura esta URL. Para prevenir ataques de Redirección Abierta, **DEBES** configurar `allowedReturnUrlPrefixes`.

```typescript
// BIEN
allowedReturnUrlPrefixes: ['/app', '/dashboard']

// Si un usuario visita ?returnUrl=https://sitio-malvado.com, la librería lo ignorará.
```

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.