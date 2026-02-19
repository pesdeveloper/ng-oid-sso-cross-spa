// sso-session-guard.providers.ts
//
// Plug-and-play providers para arrancar el SsoSessionGuardService automáticamente.
// Angular 19+ => APP_INITIALIZER está deprecated: usamos provideAppInitializer().
//
// Uso: en app.config.ts => providers: [ provideSsoSessionGuard({ ... }) ]

//** 1) Cómo lo usás en tu App (BOD) sin “interferir”
//** En tu logout() llamá una línea extra para que el guard no intente recuperar:
/* TS
logout() {
  this.ssoGuard.markLogoutFromThisApp(); // <- agrega esto
  this.oidcSecurityService.logoff().subscribe();
}
*/

//** Cuando autenticás OK (o en tu subscribe de isAuthenticated$ cuando true), limpiá el flag “logoutDisabled”:
/* TS
if (isAuthenticated) {
  this.ssoGuard.clearLogoutDisabledFlag();
}
*/

import {
  EnvironmentProviders,
  InjectionToken,
  makeEnvironmentProviders,
  provideAppInitializer,
  inject,
} from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { map, take, firstValueFrom, of } from 'rxjs';
import {
  RecoverMode,
  SimpleLogLevel,
  SsoSessionGuardOptions,
  SsoSessionGuardService,
} from './sso-session-guard.service';
import { catchError } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';

/**
 * Config “para terceros”: mínima, clara, sin pensar demasiado.
 * - authority se deduce SIEMPRE desde la OpenIdConfiguration activa (oidc.getConfiguration()).
 */
export interface SsoSessionGuardAppConfig {
  /** Namespace para keys en sessionStorage: 'bod', 'maspagos', etc. */
  appNs: string;

  /** (opcional) Path del ping en el IdP */
  pingPath?: string; // default '/api/session/ping'

  /** (opcional) Cache buster ?ts=... */
  cacheBuster?: boolean; // default true

  /** (opcional) Throttle entre pings */
  minIntervalMs?: number; // default 1500

  /** (opcional) Solo ping si la SPA cree que está autenticada */
  onlyWhenAuthenticated?: boolean; // default true

  /**
   * “Office365-like”
   * - true: si NO hay sesión en el IdP => authorize() (login interactivo) una vez por pestaña
   * - false: solo limpia local (logoffLocal) y deja a la app deslogueada
   */
  forceLoginIfNoIdpSession?: boolean; // default false

  /**
   * Si HAY cookie IdP pero NO hay auth local:
   * - 'none': no recupera
   * - 'promptNone': authorize(prompt=none) una vez por pestaña (recomendado)
   * - 'interactive': authorize() una vez por pestaña
   */
  recoverMode?: RecoverMode; // default 'promptNone'

  /** Eventos para revalidar (backbutton/alt-tab) */
  events?: Array<'pageshow' | 'focus' | 'visibilitychange'>;

  /** Prefijo de logs */
  logPrefix?: string;

  /** Nivel default si no se puede leer cfg.logLevel */
  defaultLogLevel?: SimpleLogLevel;

  antiforgery?: {
    enabled?: boolean;
    /** default '/antiforgery/token' */
    path?: string;
    /** default 'beforePing' */
    run?: 'beforePing' | 'beforeRecover' | 'bootstrap';
  };

  allowedReturnUrlPrefixes?: string[];
}

/** Token para inyectar la config */
export const SSO_SESSION_GUARD_CONFIG = new InjectionToken<SsoSessionGuardAppConfig>(
  'SSO_SESSION_GUARD_CONFIG'
);

/**
 * Provider “único” para apps: instala el guard apenas levanta la app.
 * Importante: por defecto NO bloquea el bootstrap (no devuelve Promise/Observable).
 */
export function provideSsoSessionGuard(config: SsoSessionGuardAppConfig): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: SSO_SESSION_GUARD_CONFIG, useValue: config },

    provideAppInitializer(() => {
      const guard = inject(SsoSessionGuardService);
      const oidc = inject(OidcSecurityService);
      const cfg = inject(SSO_SESSION_GUARD_CONFIG);
      const http = inject(HttpClient);

      const opts: SsoSessionGuardOptions = {
        appNs: cfg.appNs,
        oidc,

        // authority SIEMPRE desde la config activa del oidc-client
        authority$: () =>
          oidc.getConfiguration().pipe(
            take(1),
            map(c => (c as any)?.authority as string)
          ),

        pingPath: cfg.pingPath,
        cacheBuster: cfg.cacheBuster,
        minIntervalMs: cfg.minIntervalMs,
        onlyWhenAuthenticated: cfg.onlyWhenAuthenticated,

        forceLoginIfNoIdpSession: cfg.forceLoginIfNoIdpSession,
        recoverMode: cfg.recoverMode,

        events: cfg.events,
        logPrefix: cfg.logPrefix,
        defaultLogLevel: cfg.defaultLogLevel,

        antiforgery: cfg.antiforgery?.enabled
          ? {
              enabled: true,
              path: cfg.antiforgery.path ?? '/antiforgery/token',
              run: cfg.antiforgery.run ?? 'beforePing',
              loader: (url: string) =>
                firstValueFrom(
                  http.get(url, {
                    withCredentials: true,
                    responseType: 'text' as const,
                  }).pipe(
                    map(() => void 0),
                    catchError(() => of(void 0))
                  )
                ),
            }
          : undefined,

        allowedReturnUrlPrefixes: cfg.allowedReturnUrlPrefixes,          
      };

      // ✅ instala hooks (pageshow/focus/visibilitychange), throttle, inFlight, etc.
      guard.start(opts);

      // OJO: si querés que también haga “bootstrap” (ping + checkAuth) automáticamente,
      // lo ideal es que sea opt-in. Si tu app YA hace checkAuth en otro lado,
      // NO lo llames para no duplicar.
      //
      // return guard.bootstrapAuthOnce(); // <- esto sí bloquearía si devuelve Promise/Observable
      //
      return;
    }),
  ]);
}
