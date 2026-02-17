# 🛡️ Guía de Integración: MMA SSO Session Guard

Librería corporativa para la gestión de sesiones sincronizadas en arquitecturas **Single Sign-On (SSO)** con Angular.

---

## 📋 Descripción General
El **MMA SSO Session Guard** es un centinela diseñado para Angular 19/20. Revalida la sesión contra el IdP mediante un "ping" activo activado por eventos del navegador como `focus`, `pageshow` y `visibilitychange`. Su objetivo es evitar que la aplicación mantenga sesiones locales activas cuando la sesión en el servidor de identidad ya ha expirado o ha sido cerrada en otra pestaña.

---

## 🚀 1. Instalación
Para instalar la librería desde el repositorio de red local, ejecuta el siguiente comando en la raíz de tu proyecto:

```bash
npm install S:\Source\NET\tokenserver.angular\ng-libs-local\mma-sso-session-guard-1.0.0.tgz
Requisito: angular-auth-oidc-client v20.0.2 o superior.

⚙️ 2. Configuración Global (app.config.ts)
Registra el provider en tu app.config.ts. Es vital definir un appNs (namespace) único para evitar colisiones en el almacenamiento del navegador.


import { provideSsoSessionGuard, SimpleLogLevel } from 'mma-sso-session-guard';

export const appConfig: ApplicationConfig = {
  providers: [
    // ... otros providers (provideAuth, provideHttpClient, etc.)
    provideSsoSessionGuard({
      appNs: 'mma-app-portal',        // Identificador único de la App
      pingPath: '/api/session/ping',  // Endpoint de validación en IdP
      minIntervalMs: 5000,            // Tiempo mínimo entre pings
      events: ['pageshow', 'focus'],  // Eventos de revalidación
      recoverMode: 'promptNone',      // Login silencioso si hay cookie IdP
      antiforgery: {
        enabled: true,
        path: '/antiforgery/token',   // Warm-up de seguridad (XSRF)
        run: 'beforePing'
      },
      defaultLogLevel: SimpleLogLevel.Info
    })
  ]
};

---

💻 3. Implementación en el Componente Principal (app.ts): 
- El componente principal debes sincronizar el comportamiento de tu aplicación con el estado del guard en el componente principal.

- Inicialización y Reactivación
- En el ngOnInit, configura el bootstrap y asegúrate de reactivar el guard tras un login exitoso:

ngOnInit(): void {
  // 1. Monitorear cambios en la autenticación
  this.oidcSecurityService.isAuthenticated$.subscribe(({ isAuthenticated }) => {
    if (isAuthenticated) {
      // ✅ Si se autentica, reactivamos el guard (limpiamos flag de logout previo)
      this.ssoGuard.clearLogoutDisabledFlag();
    }
  });

  // 2. Ejecutar validación inicial (Bootstrap)
  // Verifica sesión en el IdP y procesa la autenticación inicial
  this.oidcSecurityService.checkAuth().subscribe(() => {
    void this.ssoGuard.bootstrapAuthOnce({ doCheckAuth: true });
  });

  // 3. Manejo de ruta /logout personalizada
  if (window.location.pathname.startsWith('/logout')) {
    this.ssoGuard.markLogoutFromThisApp();
    this.oidcSecurityService.logoffLocal();
  }
}

# Proceso de Logout Seguro. Es obligatorio llamar a markLogoutFromThisApp() antes de iniciar el cierre de sesión para evitar que el guard - - intente re-autenticar al usuario mientras la página se descarga o redirige.

logout() {
  // A) Bloquear al guard para evitar recuperación accidental de sesión
  this.ssoGuard.markLogoutFromThisApp();

  // B) Ejecutar cierre de sesión global en el IdP
  this.oidcSecurityService.logoff().subscribe({
    next: (res) => console.log('Cerrando sesión en IdP...', res),
    error: (err) => {
      console.error('Error en logoff, limpiando local', err);
      this.oidcSecurityService.logoffLocal();
    }
  });
}

---

🛠️ Notas Técnicas
CORS: El servidor de identidad (IdP) debe estar configurado para permitir peticiones con credenciales (withCredentials: true) desde el dominio de esta aplicación.

Antiforgery: Si habilitas el antiforgery, el guard garantiza que se obtenga el token de seguridad antes de realizar cualquier ping de sesión.

Persistencia: La librería utiliza sessionStorage para gestionar los flags de anti-bucle y estado de logout.

