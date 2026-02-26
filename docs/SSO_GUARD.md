# SSO Session Guard – Funcionamiento Interno

---

# 🎯 Qué resuelve

- Sincroniza sesión SPA ↔ cookie IdP
- Detecta sesión cruzada entre SPAs
- Recover silencioso con prompt=none
- Anti-loop
- Logout seguro
- Deep-link restore

---

# 🔧 provideSsoSessionGuard(options)

## appNs

Namespace único por SPA.  
Ej: 'bod', 'maspagos'.

Evita que flags de sessionStorage se compartan.

---

## pingPath

Endpoint del IdP:

/api/session/ping  

Valida cookie.

---

## recoverMode

'promptNone' | 'none'  

Recomendado: promptNone

---

## events

Eventos que disparan ping:

['pageshow', 'focus']

---

## antiforgery (opcional)

{
  enabled: true,
  path: '/antiforgery/token',
  run: 'beforePing'
}

---

# 🔁 bootstrapAuthOnce()

Orden interno:

1. checkAuth()
2. ping IdP
3. si cookie && !auth local → authorize(prompt=none)
4. anti-loop por pestaña

---

# 🔐 markLogoutFromThisApp()

Evita recover inmediato tras logout.

---

# 📡 ping()

Resultado:

- true → hay sesión IdP
- false → no hay sesión
- null → error / safari

---

# 📦 AuthSessionFacade

API pública:

bootstrap() → Inicializa guard + oidc  
login() → rememberReturnUrl() + authorize()  
logout() → marca flag + logoff()  
state$ → Estado reactivo consolidado  
onLogin$ → Transición false → true  
onLogout$ → Transición true → false  

---

# 🧠 Buenas prácticas

- Label debe usar fallback config.clientId
- No depender solo de idPayload
- Usar allowedReturnUrlPrefixes
- appNs distinto por SPA
