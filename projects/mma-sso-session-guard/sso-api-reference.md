# mma-sso-session-guard — API Reference (Service + Facade)

Este documento describe **qué hace cada método** y **cuándo usarlo**.  
La librería está pensada para:

- Mantener sesión local OIDC (`angular-auth-oidc-client`) consistente con la sesión del IdP.
- Detectar sesión IdP (cookie) mediante un `ping` al IdP.
- Recuperar sesión local sin interacción usando `authorize(prompt=none)` si corresponde.
- Evitar loops (anti-loop por pestaña), respetar logout y deep-links.

---

## 1) `provideSsoSessionGuard(options)` (providers)

### ¿Qué hace?
Registra e inicializa la configuración del guard para la app actual (por ejemplo `bod` o `maspagos`).

### Opciones más relevantes

- `appNs: string`  
  Namespace de la app para keys de anti-loop y flags de logout.  
  **Importante**: evita que dos SPAs compartan keys.

- `pingPath: string`  
  Endpoint del IdP para validar sesión/cookie. Ej: `/api/session/ping`.

- `minIntervalMs: number`  
  Intervalo mínimo entre pings (throttle).

- `events: Array<'pageshow' | 'focus' | 'visibilitychange' | ...>`  
  Eventos del navegador que disparan el "check/ping" cuando el usuario vuelve a la pestaña o la SPA toma foco.  
  Recomendación práctica:
  - `['pageshow', 'focus']` para comportamiento "tipo Office365"
  - `['pageshow']` si querés minimizar ruido

- `onlyWhenAuthenticated: boolean`  
  Si `true`, el ping se ejecuta solo cuando hay auth local.  
  Si `false`, el ping puede ejecutarse aun sin tokens locales (útil para detectar cookie IdP y recuperar sesión).

- `recoverMode: 'promptNone' | 'none'`  
  - `promptNone`: si hay cookie IdP y no hay auth local válida, dispara `authorize(prompt=none)`.
  - `none`: desactiva recover automático.

- `forceLoginIfNoIdpSession: boolean`  
  Si `true`, cuando el ping confirma que no hay sesión IdP, se fuerza login (interactivo).  
  En tus SPAs normalmente lo dejamos en `false` para evitar loops.

- `antiforgery` (opcional)
  - `enabled: boolean`
  - `path: string` (ej `/antiforgery/token`)
  - `run: 'beforePing' | 'beforeRecover' | 'bootstrap'`  
  Sirve si el IdP requiere setear cookies/cabeceras previas.

- `allowedReturnUrlPrefixes: string[]`  
  Lista de prefijos permitidos para restaurar deep-links de la SPA luego de `authorize`.  
  Ej: `['/datos', '/tramites']`.

---

## 2) `SsoSessionGuardService` — API (Service)

> Servicio de infraestructura. Normalmente no lo usás directo en el App si estás usando el Facade, pero es importante entender qué hace.

### `bootstrapAuthOnce(args) : Promise<void>`

**Uso típico**: se llama 1 vez al arrancar la SPA (lo hace el `AuthSessionFacade.bootstrap()`).

**Qué hace**:
1. (Opcional) Ejecuta `checkAuth()` del OIDC client para procesar callback si la URL trae `code/state`.
2. Ejecuta un ping al IdP (`pingPath`) para ver si existe cookie/sesión IdP.
3. Si **hay cookie IdP pero no hay auth local**, y `recoverMode='promptNone'`, dispara `authorize(prompt=none)` **una sola vez por pestaña** (anti-loop).
4. Si `forceLoginIfNoIdpSession=true` y no hay cookie IdP, puede forzar login (normalmente deshabilitado).

**Parámetros comunes**:
- `doCheckAuth: boolean`  
  Si `true`, ejecuta checkAuth al arranque. Esto es clave para el primer load cuando venís de redirect del IdP.
- `router?: Router`  
  Se usa para restaurar `returnUrl` y/o para navegación segura (según tu implementación).

---

### `markLogoutFromThisApp(): void`

Marca un flag persistente (namespaced por `appNs`) indicando:  
> “Esta app pidió logout; no intentes recover automático”.

**Cuándo se usa**:
- En la ruta `/logout` (hard logout route) antes de `logoffLocal()`.
- En `logout()` antes de `oidc.logoff()`.

**Qué evita**:
- Que el guard haga `authorize(prompt=none)` inmediatamente después del logout (loop).

---

### `clearLogoutDisabledFlag(): void`

Limpia el flag de logout deshabilitador (el que se setea con `markLogoutFromThisApp`).

**Cuándo se usa**:
- Al detectar que `isAuthenticated=true` (login exitoso).  
  Esto re-habilita recover en futuras visitas.

---

### `rememberReturnUrl(): void`

Guarda el deep-link actual (path + query) como "returnUrl" para restaurarlo luego del login/recover.

**Cuándo se usa**:
- Antes de `authorize()` en `login()`.

---

### `tryRestoreAfterLogin(): void | Promise<void>` (si existe)

Restaura el deep-link guardado al completar login/recover.

**Cuándo se usa**:
- Luego de `checkAuth()` exitoso o al detectar transición a autenticado.

**Seguridad**:
- Debe validar contra `allowedReturnUrlPrefixes`.

---

### `pingIdpSession(): Promise<PingResult>` (si existe)

Realiza el `GET {authority}{pingPath}?ts=...` con credenciales/cookies.

**Qué determina**:
- `hasIdpSession = true/false`
- Posibles metadata extra.

**Notas prácticas**:
- Si da `401` suele ser por CORS / credentials:
  - `withCredentials: true` en fetch/xhr
  - `Access-Control-Allow-Credentials: true` en IdP
  - `origin` exacto permitido (puerto incluido)

---

## 3) `AuthSessionFacade` — API (Facade)

Este es el API que usan los devs en `App.ngOnInit()` y para alimentar el HTML.
Internamente coordina: `OidcSecurityService` + `SsoSessionGuardService`.

---

### `bootstrap(): void`

**Llamar una sola vez** al iniciar la app (típicamente en `ngOnInit` del root).

**Qué hace**:
1. Lee `window.location.pathname`.
2. Carga `getConfiguration()` **siempre** (incluso sin sesión) y lo refleja en `state.config`.
3. Si estás en `/logout`:
   - llama `guard.markLogoutFromThisApp()`
   - llama `oidc.logoffLocal()`
   - retorna (no inicia recover)
4. Se subscribe a `oidc.isAuthenticated$` y actualiza `state.isAuthenticated`.
5. Si `isAuthenticated=true` limpia flag de logout (`guard.clearLogoutDisabledFlag()`).
6. Llama `guard.bootstrapAuthOnce({ doCheckAuth: true, router })` para iniciar ping + recover.

**Relación con el HTML**:
- Permite mostrar `clientLabel` incluso sin estar autenticado (por `state.config`).

---

### `state$ : Observable<AuthSessionState>`

Estado reactivo consolidado.

**Contiene típicamente**:
- `isAuthenticated: boolean`
- `config: OpenIdConfiguration | null`

Opcional (si lo implementaste como opción A):
- `accessToken: string`
- `accessPayload: any | null`
- `idToken: string`
- `idPayload: any | null`
- `userInfo: any | null`
- `userInfoLoadedAt: Date | null`

**Uso en App**:
- `this.auth.state$.subscribe(s => ...)` para alimentar signals y el HTML.

---

### `onLogin$ : Observable<void>`

Evento de transición **false → true** de `isAuthenticated`.

**Cuándo se dispara**:
- Cuando el OIDC client termina callback y el estado local pasa a autenticado.
- También cuando recover por `prompt=none` logra tokens.

**Para qué sirve**:
- Cargar datos de negocio al loguear.
- Limpiar flags de logout, inicializar UI, etc.

---

### `onLogout$ : Observable<void>`

Evento de transición **true → false** de `isAuthenticated`.

**Cuándo se dispara**:
- Cuando se pierde auth local (por ejemplo `logoffLocal` o limpieza de tokens).
- **Importante**: si durante logout no hay transición real (porque ya estaba false), este evento no se dispara.

---

### `onLogoutRequested$ : Observable<void>`

Evento “imperativo” cuando el usuario pide logout.

**Cuándo se dispara**:
- Siempre que se llama `logout()`, incluso si `isAuthenticated` ya era false.

**Para qué sirve**:
- Limpiar caches, signals, estado UI inmediatamente al click.

---

### `login(): void`

Inicia login interactivo.

**Qué hace**:
1. `guard.rememberReturnUrl()`
2. `oidc.authorize()` (redirige al IdP)

---

### `logout(): void`

Inicia logout (redirige al IdP) y evita recover.

**Qué hace**:
1. Emite `onLogoutRequested$`
2. (Opcional, recomendado) fuerza transición local:
   - `state.isAuthenticated = false` (para actualizar UI inmediatamente)
3. `guard.markLogoutFromThisApp()`
4. `oidc.logoff().subscribe()`

**Por qué el UI pierde label a veces**:
- Si el App calculaba label desde `idPayload` y este se limpia en logout.
- Solución: el label debe tener fallback `config.clientId` (por eso se carga config aun sin sesión).

---

### `refresh(): Observable<LoginResponse>`

Fuerza refresh de sesión local (renueva tokens).

**Cuándo se usa**:
- Botón “Refresh session”.

**Qué NO hace**:
- No implementa ping IdP por sí mismo (eso lo hace el guard con eventos).

---

### `goUserProfile(): void`

Redirige al perfil de usuario en el IdP.

**Qué hace**:
1. `getConfiguration()` para obtener `authority` y `clientId`.
2. arma URL:
   - `{authority}/account/profile?client_id={clientId}&returnUrl={currentUrl}`
3. navega con `window.location.href = ...`

---

### `getAccessToken(): Observable<string>`

Devuelve el access token vigente desde el OIDC client.

**Uso típico**:
- Mostrar en consola (debug).
- Consumir en calls custom (aunque idealmente se use interceptor).

---

## 4) Métodos “de panel” (si tu Facade los implementa)

Si elegiste **opción A** (estado incluye tokens/payloads/userInfo), estos métodos viven en el Facade y el App solo consume `state$`.

### `loadAccessTokenPayload(): void`

**Qué hace**:
- Si no autenticado:
  - limpia `state.accessToken=''` y `state.accessPayload=null`
- Si autenticado:
  - lee `oidc.getAccessToken()` (1 vez) y lo guarda en estado
  - lee `oidc.getPayloadFromAccessToken()` (1 vez) y lo guarda en estado

**Cuándo se llama**:
- `onLogin$` (opcional)
- al abrir el panel de Access Token: `(opened)="..."`

---

### `loadIdTokenPayload(): void`

Igual al anterior, pero para:
- `oidc.getIdToken()`
- `oidc.getPayloadFromIdToken()`

---

### `loadUserInfo(): void`

**Qué hace**:
- Si no autenticado:
  - limpia `state.userInfo=null` y `state.userInfoLoadedAt=null`
- Si autenticado:
  - obtiene `authority` y `accessToken`
  - llama `GET {authority}/connect/userinfo` con `Authorization: Bearer {token}`
  - guarda resultado en estado y setea `userInfoLoadedAt = new Date()`

---

### `refreshUserInfo(): void`

**Qué hace**:
- limpia `userInfo` / `userInfoLoadedAt`
- llama `loadUserInfo()`

---

## 5) ¿Cómo se conecta con el `ngOnInit` y el HTML?

### En `ngOnInit` (mínimo recomendado)
1. `this.auth.bootstrap()`
2. subscribirse a:
   - `onLogin$`, `onLogout$`, `onLogoutRequested$` (opcional)
3. `state$` para alimentar UI:
   - `isAuthenticated`
   - `config` (para label incluso sin sesión)
   - (si opción A) tokens/payloads/userInfo

### En el HTML
- Mostrar el label:
  - preferir `idPayload.client_name` / `idPayload.azp`
  - fallback: `config.clientId`
- Paneles:
  - al abrir panel, invocar `loadAccessTokenPayload/loadIdTokenPayload/loadUserInfo`
  - usar `copy()/copyJson()` para facilitar debug.

---

## 6) Reglas prácticas (para evitar problemas comunes)

- **El label no debe depender solo de `idPayload`**: en logout se limpia.  
  Siempre fallback a `config.clientId`.

- **`onLogout$` no se dispara si no hay transición real**.  
  Para “siempre que se pidió logout”, usar `onLogoutRequested$`.

- **Anti-loop**: si usás dos SPAs, asegurate de `appNs` distinto.

- **CORS/401 en ping**: revisar:
  - credentials habilitadas
  - origins exactos permitidos (incluye puerto)
  - `Access-Control-Allow-Credentials`.

---