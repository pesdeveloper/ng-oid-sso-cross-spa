# Angular SSO Session Guard – Monorepositorio

Workspace de desarrollo para la librería Angular `mma-sso-session-guard`
y su aplicación de pruebas (BOD Demo App).

---

# 🎯 Objetivo

Resolver correctamente el SSO entre múltiples SPAs Angular
(BOD / MásPagos) contra un mismo IdP (OpenIddict v7),
manteniendo:

- Sincronización real con la cookie del IdP
- Recover automático con `prompt=none`
- Anti-loop por pestaña
- Logout seguro
- Restauración de deep-links
- Compatibilidad Safari / BFCache
- Soporte antiforgery opcional

---

# 📂 Estructura

projects/mma-sso-session-guard  → Librería  
src/                             → App demo BOD  
docs/                            → Documentación técnica  

---

# 🚀 Desarrollo Local (Mac)

## 1️⃣ Bajar último código

./bod-git-download.sh

Este script ejecuta:

git fetch origin  
git reset --hard origin/main  
git clean -fd  

---

## 2️⃣ Ejecutar BOD (demo)

./bod-run.sh

Internamente:

npm run dist:mma  
ng serve --host=127.0.0.1 --ssl --port=4205  

App disponible en:

https://localhost:4205  

---

# 🧠 Arquitectura SSO

SPA BOD  
↓  
angular-auth-oidc-client  
↓  
SsoSessionGuardService  
↓  
Ping IdP (/api/session/ping)  
↓  
Si cookie IdP y no auth local → authorize(prompt=none)  
↓  
AuthSessionFacade actualiza state$  

---

# 🔐 Flujo de Autenticación

1. bootstrap()  
2. checkAuth() (procesa code si viene del IdP)  
3. ping IdP  
4. si hay cookie IdP pero no tokens locales → recoverMode = promptNone  
5. onLogin$ emite evento  
6. deep-link restore si existe  

---

# 🔁 Logout Seguro

logout():

- marca flag anti-recover
- limpia estado local
- ejecuta oidc.logoff()

Evita loops post-logout.

---

# 🔗 Deep Links

La librería permite restaurar rutas como:

/datos/comercio/708?v=RC-12-12345678  

Siempre que coincidan con:

allowedReturnUrlPrefixes: ['/datos']

Restauración ocurre sólo después de login exitoso.

---

# 🧪 Problemas Comunes

## 401 en ping

Verificar:

- CORS allow credentials
- origin exacto (incluye puerto)
- cookies SameSite=None; Secure

## Safari no detecta cookie

Ping puede devolver null.  
Recover se maneja con prompt=none.

---

# 📦 Build Librería

npm run build:mma

Genera:

dist/mma-sso-session-guard  
dist/mma-sso-session-guard-<version>.tgz  

---

# 📚 Documentación Técnica

Ver:

- docs/SSO_GUARD.md  
- docs/DEEP_LINKS.md  
- docs/CONFIG_BOD.md  
- docs/SCRIPTS_MAC.md  

---

# 🏛 Proyecto Municipal

Esta implementación forma parte del ecosistema:

- BOD  
- MásPagos  
- IdP OpenIddict (.NET 9)  

Diseñado para entornos productivos multi-SPA con SSO compartido.

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Consulta el archivo [LICENSE](LICENSE) para más detalles.