# Deep Links + OIDC + Guard

---

# Problema

Durante code flow:

1. Usuario navega a: /datos/comercio/708?v=...
2. Guard intercepta
3. authorize()
4. IdP redirige con ?code=...
5. Angular procesa callback
6. postLoginRoute puede sobreescribir URL

---

# Estrategia Final

✔ Capturar deep-link solo una vez  
✔ No sobrescribir si ya existe  
✔ Restaurar solo después de login confirmado  
✔ Validar prefijo permitido  

---

# Flujo

1. login() → guard.rememberReturnUrl()
2. OIDC callback → checkAuth()
3. onLogin$ → restore deep-link

---

# Seguridad

allowedReturnUrlPrefixes:

['/datos']

Evita open redirect.

---

# Evitar Problemas

No usar router.getCurrentNavigation() (deprecated)  
No capturar deep-link durante callback  
No restaurar si no está autenticado  

---

# Ejemplo Real

Entrada:

/datos/comercio/708?v=RC-12-12345678  

Restore ocurre solo si:

- isAuthenticated = true
- coincide prefijo