# mma-sso-session-guard

Angular library para sincronización real de sesión entre múltiples SPAs usando OpenID Connect.

Diseñada para escenarios con múltiples SPAs compartiendo IdP (OpenIddict / IdentityServer / Azure AD / Auth0), SSO cross-app, recuperación automática de sesión, logout seguro, deep-link restore, soporte Safari / BFCache y antiforgery opcional.

---

## 🎯 Problema que resuelve

Las SPAs con OIDC suelen quedar en estados inconsistentes:

- La SPA cree estar autenticada pero la cookie del IdP ya no existe.
- Otra SPA inicia sesión y esta app no lo detecta.
- Logout en una SPA no se refleja en otra.
- Refresh del navegador rompe sesión.
- Deep-links se pierden tras login.
- Safari bloquea cookies cross-site.

Esta librería sincroniza el estado real del IdP con el estado local de la SPA.

---

## 🧠 Qué hace la librería

- Detecta cookie real del IdP.
- Sincroniza sesión automáticamente.
- Recupera sesión silenciosa (`prompt=none`).
- Previene loops de autenticación.
- Soporta múltiples SPAs con namespace aislado.
- Maneja logout correctamente.
- Restaura deep-links tras login.
- Funciona con Safari / BFCache.
- Permite antiforgery warm-up.

---

## 📦 Instalación

Desde tarball local:

```
npm install ../ng-libs-local/mma-sso-session-guard.tgz --force
```

Desde dist local:

```
npm install ./dist/mma-sso-session-guard --force
```

Requiere `angular-auth-oidc-client` v20 o superior.

---

## 🚀 Uso básico

### 1️⃣ Registrar provider

```ts
import { provideSsoSessionGuard } from 'mma-sso-session-guard';

provideSsoSessionGuard({
  appNs: 'bod',
  pingPath: '/api/session/ping',
  recoverMode: 'promptNone',
});
```

### 2️⃣ Inicializar en bootstrap

```ts
constructor(private auth: AuthSessionFacade) {}

ngOnInit() {
  this.auth.bootstrap();
}
```

### 3️⃣ Usar el Facade

```ts
auth.login();
auth.logout();
auth.refresh();
auth.state$.subscribe(...);
```

---

## ⚙️ Configuración completa

### appNs (requerido)

Namespace único por SPA:

```
appNs: 'bod'
appNs: 'maspagos'
```

Evita compartir flags entre aplicaciones.

---

### pingPath

Endpoint del IdP para validar cookie:

```
pingPath: '/api/session/ping'
```

Debe devolver:
- 200 → hay sesión
- 401/403 → no hay sesión

---

### recoverMode

```
recoverMode: 'promptNone' | 'none'
```

Recomendado:

```
promptNone
```

---

### events

Eventos que disparan verificación de sesión:

```
events: ['pageshow', 'focus']
```

Recomendado mínimo:

```
['pageshow']
```

---

### onlyWhenAuthenticated

Evita ping si no hay token local:

```
onlyWhenAuthenticated: true
```

---

### forceLoginIfNoIdpSession

Modo tipo Office365:

```
forceLoginIfNoIdpSession: true
```

---

### antiforgery

Warm-up antiforgery antes de ping o recover:

```ts
antiforgery: {
  enabled: true,
  path: '/antiforgery/token',
  run: 'beforePing'
}
```

---

## 🔄 Flujo interno

bootstrapAuthOnce():

1. checkAuth()
2. ping IdP
3. si hay cookie IdP y no auth local → authorize(prompt=none)
4. limpiar flags anti-loop

---

## 🔐 Deep Links

Ejemplo:

```
/datos/comercio/708?v=RC-12-12345678
```

Flujo:

1. login() guarda returnUrl.
2. callback OIDC ejecuta checkAuth().
3. onLogin$ restaura deep-link.

---

## 🔁 Logout Seguro

logout():

- marca flag anti-recover
- limpia estado local
- ejecuta logoff IdP

Evita login automático tras logout.

---

## 📡 API Pública

### AuthSessionFacade

- bootstrap() → Inicializa guard y listeners.
- bootstrapOnce() → Inicializa una sola vez.
- login() → Guarda deep-link y ejecuta authorize.
- logout() → Cierra sesión segura.
- refresh() → Force refresh token.
- state$ → Estado reactivo consolidado.
- onLogin$ → Evento login confirmado.
- onLogout$ → Evento logout confirmado.

Estado típico:

```ts
{
  isAuthenticated,
  accessToken,
  idToken,
  userInfo
}
```

---

## 🧪 Escenarios soportados

- SSO entre múltiples SPAs.
- Sesión compartida entre apps.
- Logout cross-app.
- Refresh de navegador.
- Safari ITP.
- BFCache.
- Login silencioso.
- Recuperación tras crash SPA.

---

## ⚠️ Requisitos del IdP

Debe permitir:

- cookies SameSite=None; Secure
- CORS allow credentials
- endpoint ping
- redirect URIs exactos

---

## 🐞 Troubleshooting

Ping siempre 401:
- Verificar CORS.
- withCredentials=true.
- origin exacto con puerto.

Safari no detecta sesión:
- Ping puede devolver null.
- Recover se maneja automáticamente.

Deep link no restaura:
- Verificar login() captura URL.
- Restore ocurre tras onLogin$.
- No usar postLoginRoute fijo.

---

## 🏛 Uso en Producción

Esta librería fue diseñada para el ecosistema:

- BOD
- MásPagos
- IdP OpenIddict (.NET 9)

Pensada para entornos municipales con múltiples SPAs compartiendo sesión.

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.