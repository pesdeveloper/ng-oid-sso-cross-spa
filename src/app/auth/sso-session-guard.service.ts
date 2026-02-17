// sso-session-guard.service.ts
//
// Guard “plug-and-play” para SPAs Angular que usan angular-auth-oidc-client.
// Objetivo:
// - Revalidar si existe sesión REAL en el IdP (cookie) cuando la SPA “vuelve” (BFCache/backbutton, alt-tab, focus, etc.)
// - Si la cookie IdP NO está => limpiar estado local (logoffLocal) para evitar “falsos autenticados”.
// - Opcional “modo Office365”: si no hay sesión en IdP, disparar login interactivo 1 vez por pestaña.
// - Opcional: si HAY cookie IdP pero NO hay auth local, intentar recuperar con prompt=none (una sola vez por pestaña).
//
// NOTAS IMPORTANTES
// - No usa LoggerService (no exportable). En su lugar, intenta leer logLevel desde getConfiguration().
// - NO llama checkAuth automáticamente salvo que vos lo pidas (para no interferir con tu App.ts), salvo
//   en isLocallyAuthenticated() que es explícito (ver opts.onlyWhenAuthenticated).
// - Throttle + inFlight para evitar spam.
//
// Requisitos:
// - En el IdP debe existir GET {authority}/api/session/ping que devuelva:
//     200 => hay sesión (cookie válida)
//     401 => no hay sesión
// - CORS del IdP debe permitir credentials desde tus SPAs.
//
// Integración recomendada:
// - Usar provideSsoSessionGuard(...) (providers) para auto-start.
// - O manual: inyectás SsoSessionGuardService y llamás start(opts) en App.ngOnInit().

import { Injectable } from '@angular/core';
import { OidcSecurityService } from 'angular-auth-oidc-client';
import { Observable, firstValueFrom } from 'rxjs';
import { take } from 'rxjs/operators';

// -----------------------------
// Tipos y enums públicos
// -----------------------------

/** Nivel de log simple */
export enum SimpleLogLevel {
  None = 0,
  Error = 1,
  Warn = 2,
  Info = 3,
  Debug = 4,
}

/**
 * Modo de recuperación cuando:
 * - Hay cookie en IdP (ping OK)
 * - Pero checkAuth/isAuthenticated local da false
 */
export type RecoverMode = 'none' | 'promptNone' | 'interactive';

export interface SsoSessionGuardOptions {
  /** Namespace para sessionStorage keys */
  appNs: string;

  /** OidcSecurityService (inyectado en tu app) */
  oidc: OidcSecurityService;

  /**
   * Obtiene el authority actual desde config OIDC (recomendado).
   * Ejemplo:
   *   authority$: () => oidc.getConfiguration().pipe(take(1), map(c => (c as any).authority))
   */
  authority$: () => Observable<string>;

  /** Path del ping en el IdP (default: '/api/session/ping') */
  pingPath?: string;

  /** Agregar ?ts=Date.now() (default: true) */
  cacheBuster?: boolean;

  /** Mínimo intervalo entre pings (default: 5000ms) */
  minIntervalMs?: number;

  /** Solo ping si la SPA cree que está autenticada (default: false) */
  onlyWhenAuthenticated?: boolean;

  /**
   * Office365-like:
   * Si NO hay sesión IdP => authorize() interactivo 1 vez por pestaña.
   * (default: false)
   */
  forceLoginIfNoIdpSession?: boolean;

  /**
   * Si HAY cookie IdP pero no hay auth local => recuperar:
   * - 'promptNone' (default)
   * - 'interactive'
   * - 'none'
   */
  recoverMode?: RecoverMode;

  /**
   * Eventos que disparan revalidación.
   * Default: ['pageshow','visibilitychange','focus']
   */
  events?: Array<'pageshow' | 'focus' | 'visibilitychange'>;

  /** Prefijo de logs (default: 'SSO') */
  logPrefix?: string;

  /** Si no puedo leer cfg.logLevel, uso este (default: Debug) */
  defaultLogLevel?: SimpleLogLevel;

  /**
   * (Opcional) Antiforgery warm-up:
   * Llama una URL (ej: {authority}/antiforgery/token) con credentials
   * para que el IdP/Backend setee cookies/tokens necesarios.
   * - Best effort: ignora errores
   * - Se ejecuta una sola vez por instancia
   */
  antiforgery?: {
    enabled?: boolean;
    /** default: '/antiforgery/token' */
    path?: string;
    /**
     * default: 'beforePing'
     * Nota: aunque exista este flag, el guard garantiza orden:
     * si antiforgery.enabled => se ejecuta antes de cualquier ping en bootstrap/resume.
     */
    run?: 'beforePing' | 'beforeRecover' | 'bootstrap';
    /** Implementación concreta del loader (la arma el provider con HttpClient) */
    loader: (url: string) => Promise<void>;
  };
}

// -----------------------------
// Service
// -----------------------------

@Injectable({ providedIn: 'root' })
export class SsoSessionGuardService {
  private started = false;

  // Estado interno
  private opts!: Required<
    Pick<
      SsoSessionGuardOptions,
      | 'appNs'
      | 'oidc'
      | 'authority$'
      | 'pingPath'
      | 'cacheBuster'
      | 'minIntervalMs'
      | 'onlyWhenAuthenticated'
      | 'forceLoginIfNoIdpSession'
      | 'recoverMode'
      | 'events'
      | 'logPrefix'
      | 'defaultLogLevel'
    >
  > &
    SsoSessionGuardOptions;

  private lastPingAt = 0;
  private pingInFlight = false;

  private attached = false;
  private detachFns: Array<() => void> = [];

  // Keys (sessionStorage)
  private promptNoneOnceKey = '';
  private interactiveOnceKey = '';
  private logoutDisabledKey = '';

  private antiforgeryDone = false;
  private antiforgeryInFlight = false;

  private isResuming = false; // mutex simple

  /**
   * Inicia el guard y engancha hooks.
   * Llamar 1 vez.
   */
  start(options: SsoSessionGuardOptions): void {
    if (this.started) return;
    this.started = true;

    // Defaults
    const pingPath = options.pingPath ?? '/api/session/ping';
    const cacheBuster = options.cacheBuster ?? true;
    const minIntervalMs = options.minIntervalMs ?? 5000;
    const onlyWhenAuthenticated = options.onlyWhenAuthenticated ?? false;
    const forceLoginIfNoIdpSession = options.forceLoginIfNoIdpSession ?? false;
    const recoverMode = options.recoverMode ?? 'promptNone';
    const events = options.events ?? ['pageshow', 'visibilitychange', 'focus'];
    const logPrefix = options.logPrefix ?? 'SSO';
    const defaultLogLevel = options.defaultLogLevel ?? SimpleLogLevel.Debug;

    this.opts = {
      ...options,
      pingPath,
      cacheBuster,
      minIntervalMs,
      onlyWhenAuthenticated,
      forceLoginIfNoIdpSession,
      recoverMode,
      events,
      logPrefix,
      defaultLogLevel,
    };

    // SessionStorage keys namespaced
    this.promptNoneOnceKey = `${this.opts.appNs}:oidc:promptnone:once`;
    this.interactiveOnceKey = `${this.opts.appNs}:oidc:interactive:once`;
    this.logoutDisabledKey = `${this.opts.appNs}:oidc:recover:disabled`;

    this.logDebug(
      `antiforgery enabled=${!!this.opts.antiforgery?.enabled} run=${
        this.opts.antiforgery?.run ?? 'beforePing'
      } path=${this.opts.antiforgery?.path ?? ''}`
    );

    this.attachHooks();
  }

  /**
   * Opcional:
   * Hace 1 bootstrap: (antiforgery) -> ping IdP y luego:
   * - si no hay cookie => logoffLocal() y opcional login interactivo (office365)
   * - si hay cookie => no hace checkAuth automáticamente (por defecto)
   *
   * Si VOS querés enlazarlo con checkAuth, llamá esto en tu App.ts.
   */
  async bootstrapAuthOnce(params?: { doCheckAuth?: boolean }): Promise<void> {
    const doCheckAuth = params?.doCheckAuth ?? false;

    // ✅ GARANTÍA: si antiforgery.enabled => SIEMPRE antes del ping en bootstrap
    if (this.opts.antiforgery?.enabled) {
      await this.ensureAntiforgeryOnce('bootstrap');
    }

    const hasIdp = await this.safePing('bootstrap');
    if (!hasIdp) {
      await this.handleNoIdpSession('bootstrap');
      return;
    }

    if (doCheckAuth) {
      const resp = await firstValueFrom(this.opts.oidc.checkAuth().pipe(take(1)));
      this.logDebug(`bootstrap: checkAuth isAuthenticated=${resp?.isAuthenticated}`);
      if (!resp?.isAuthenticated) {
        await this.handleHasIdpButNoLocalAuth('bootstrap');
      }
    }
  }

  /**
   * Llamalo cuando el usuario hace logout desde ESTA app (botón logout).
   */
  markLogoutFromThisApp(): void {
    this.setLogoutDisabled();
    this.clearPromptNoneOnce();
    this.clearInteractiveOnce();
  }

  clearLogoutDisabledFlag(): void {
    this.clearLogoutDisabled();
  }

  // -----------------------------
  // Hooks (resume / BFCache)
  // -----------------------------

  private attachHooks(): void {
    if (this.attached) return;
    this.attached = true;

    const { events } = this.opts;

    if (events.includes('pageshow')) {
      const fn = (ev: PageTransitionEvent) => {
        const persisted = (ev as any)?.persisted === true;
        this.onResume(`pageshow persisted=${persisted}`);
      };
      window.addEventListener('pageshow', fn);
      this.detachFns.push(() => window.removeEventListener('pageshow', fn));
    }

    if (events.includes('visibilitychange')) {
      const fn = () => {
        if (document.visibilityState === 'visible') {
          this.onResume('visibilitychange visible');
        }
      };
      document.addEventListener('visibilitychange', fn);
      this.detachFns.push(() => document.removeEventListener('visibilitychange', fn));
    }

    if (events.includes('focus')) {
      const fn = () => this.onResume('focus');
      window.addEventListener('focus', fn);
      this.detachFns.push(() => window.removeEventListener('focus', fn));
    }

    this.logDebug(`hooks attached: ${events.join(', ')}`);
  }

  // -----------------------------
  // Lógica principal
  // -----------------------------

  private isOidcCallbackUrl(url: string): boolean {
    // Detecta callback típico OIDC:
    // - success: ?code=...&state=...
    // - error:   ?error=...&state=...
    // - extras: iss, session_state
    try {
      const u = new URL(url, window.location.origin);
      const p = u.searchParams;

      return p.has('code') || p.has('state') || p.has('error') || p.has('iss') || p.has('session_state');
    } catch {
      return /[?&](code|state|error|iss|session_state)=/i.test(url);
    }
  }

  /**
   * “Resume”: llamado por hooks.
   * Orden garantizado cuando hay ping:
   *   antiforgery (si enabled) -> ping
   */
  private async onResume(reason: string): Promise<void> {
    if (!this.started) return;

    const url = window.location.href;

    // 1) callback => NO tocar nada
    if (this.isOidcCallbackUrl(url)) {
      this.logDebug(`onResume(${reason}) ignored: OIDC callback URL`);
      return;
    }

    // 2) logout desde esta app => NO tocar nada
    if (this.isLogoutDisabled()) {
      this.logDebug(`resume ignored (logoutDisabled=true). reason=${reason}`);
      return;
    }

    // 3) mutex
    if (this.isResuming) {
      this.logDebug(`onResume(${reason}) ignored: already running`);
      return;
    }

    this.isResuming = true;
    try {
      // 4) onlyWhenAuthenticated (soft): si no hay token local, no ping
      if (this.opts.onlyWhenAuthenticated) {
        let token = '';
        try {
          token = await firstValueFrom(this.opts.oidc.getAccessToken().pipe(take(1)));
        } catch {
          token = '';
        }
        if (!token) {
          this.logDebug(`resume ignored (no accessToken). reason=${reason}`);
          return;
        }
      }

      // 5) throttle (antes de hacer requests)
      const now = Date.now();
      if (now - this.lastPingAt < this.opts.minIntervalMs) {
        this.logDebug(`resume throttled (${now - this.lastPingAt}ms < ${this.opts.minIntervalMs}ms). reason=${reason}`);
        return;
      }

      // 6) in-flight
      if (this.pingInFlight) {
        this.logDebug(`resume ignored (pingInFlight=true). reason=${reason}`);
        return;
      }

      this.lastPingAt = now;
      this.pingInFlight = true;

      try {
        // ✅ GARANTÍA: si antiforgery.enabled => SIEMPRE antes del ping en resume
        if (this.opts.antiforgery?.enabled) {
          await this.ensureAntiforgeryOnce(`resume:${reason}`);
        }

        this.logDebug(`resume -> ping IdP session... reason=${reason}`);
        const hasIdp = await this.safePing(`resume:${reason}`);
        this.logDebug(`resume ping hasIdpSession=${hasIdp}`);

        if (!hasIdp) {
          await this.handleNoIdpSession(`resume:${reason}`);
          return;
        }

        // local auth roto?
        const isLocalAuth = await this.isLocallyAuthenticated();
        this.logDebug(`resume local isAuthenticated=${isLocalAuth}`);

        if (!isLocalAuth) {
          await this.handleHasIdpButNoLocalAuth(`resume:${reason}`);
        } else {
          // Si se autenticó, limpiá flags para permitir futuros recover
          this.clearPromptNoneOnce();
          this.clearInteractiveOnce();
          this.clearLogoutDisabled();
        }
      } finally {
        this.pingInFlight = false;
      }
    } catch (e) {
      this.logWarn(`resume failed (ignored). reason=${reason}`, e);
    } finally {
      this.isResuming = false;
    }
  }

  clearPromptNoneOnceFlag(): void {
    this.clearPromptNoneOnce();
  }

  private async isLocallyAuthenticated(): Promise<boolean> {
    try {
      const resp = await firstValueFrom(this.opts.oidc.checkAuth().pipe(take(1)));
      return !!resp?.isAuthenticated;
    } catch {
      return false;
    }
  }

  private async handleNoIdpSession(context: string): Promise<void> {
    this.logWarn(`IdP session missing -> logoffLocal(). ctx=${context}`);
    try {
      this.opts.oidc.logoffLocal();
    } catch (e) {
      this.logWarn(`logoffLocal failed (ignored). ctx=${context}`, e);
    }

    // refrescar estado (BFCache)
    try {
      const resp = await firstValueFrom(this.opts.oidc.checkAuth().pipe(take(1)));
      this.logDebug(`after logoffLocal: checkAuth isAuthenticated=${resp?.isAuthenticated} ctx=${context}`);
    } catch (e) {
      this.logWarn(`after logoffLocal: checkAuth failed (ignored). ctx=${context}`, e);
    }

    if (this.opts.forceLoginIfNoIdpSession) {
      const can = this.canTryInteractiveOnce();
      this.logDebug(`office365-like: forceLoginIfNoIdpSession=true canInteractive=${can} ctx=${context}`);
      if (can) {
        try {
          this.opts.oidc.authorize();
        } catch (e) {
          this.logError(`authorize() failed. ctx=${context}`, e);
        }
      }
    }
  }

  private async handleHasIdpButNoLocalAuth(context: string): Promise<void> {
    const mode = this.opts.recoverMode;

    if (mode === 'none') {
      this.logDebug(`recoverMode=none (no action). ctx=${context}`);
      return;
    }

    if (mode === 'promptNone') {
      const can = this.canTryPromptNoneOnce();
      this.logDebug(`recoverMode=promptNone canTry=${can} ctx=${context}`);
      if (!can) return;

      // Si querés específicamente antes de recover (por si no hubo resume/bootstrap previo)
      if (this.opts.antiforgery?.enabled && (this.opts.antiforgery.run ?? 'beforePing') === 'beforeRecover') {
        await this.ensureAntiforgeryOnce(`recover:${context}`);
      }

      try {
        this.opts.oidc.authorize(undefined, { customParams: { prompt: 'none' } });
      } catch (e) {
        this.logError(`authorize(prompt=none) failed. ctx=${context}`, e);
      }
      return;
    }

    if (mode === 'interactive') {
      const can = this.canTryInteractiveOnce();
      this.logDebug(`recoverMode=interactive canTry=${can} ctx=${context}`);
      if (!can) return;

      try {
        this.opts.oidc.authorize();
      } catch (e) {
        this.logError(`authorize() failed. ctx=${context}`, e);
      }
      return;
    }
  }

  private buildUrlFromAuthority(authority: string, path: string): string {
    const base = (authority ?? '').replace(/\/+$/, '');
    const p = path.startsWith('/') ? path : `/${path}`;
    return `${base}${p}`;
  }

  private async ensureAntiforgeryOnce(context: string): Promise<void> {
    const af = this.opts.antiforgery;
    if (!af?.enabled) return;

    if (this.antiforgeryDone) return;
    if (this.antiforgeryInFlight) return;

    const authority = await this.getAuthorityOnce();
    if (!authority) return;

    const url = this.buildUrlFromAuthority(authority, af.path ?? '/antiforgery/token');

    this.antiforgeryInFlight = true;
    try {
      this.logDebug(`antiforgery warm-up -> GET ${url} ctx=${context}`);
      await af.loader(url);
    } catch (e) {
      // best effort
      this.logWarn(`antiforgery warm-up failed (ignored). ctx=${context}`, e);
    } finally {
      // ✅ importante: aunque falle, no spamear
      this.antiforgeryDone = true;
      this.antiforgeryInFlight = false;
    }
  }

  // -----------------------------
  // Ping (IdP cookie)
  // -----------------------------

  private async safePing(context: string): Promise<boolean> {
    try {
      const authority = await this.getAuthorityOnce();
      if (!authority) {
        this.logWarn(`safePing: missing authority. ctx=${context}`);
        return true; // no rompas UX
      }

      const url = this.buildPingUrl(authority);

      const resp = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
      });

      // Si el browser siguió un redirect, para nosotros es "no hay sesión"
      if (resp.redirected) return false;

      const finalUrl = (resp.url ?? '').toLowerCase();
      if (finalUrl.includes('/account/error/unauthorized')) return false;

      if (resp.status === 200) return true;
      if (resp.status === 401 || resp.status === 403) return false;
      if (resp.status === 404) return false;

      this.logWarn(`safePing: unexpected status=${resp.status}. ctx=${context}`);
      return true;
    } catch (e) {
      this.logWarn(`safePing: failed (ignored). ctx=${context}`, e);
      return true;
    }
  }

  private async getAuthorityOnce(): Promise<string> {
    try {
      const auth = await firstValueFrom(this.opts.authority$().pipe(take(1)));
      return (auth ?? '').trim();
    } catch {
      return '';
    }
  }

  private buildPingUrl(authority: string): string {
    const base = authority.replace(/\/+$/, '');
    const path = this.opts.pingPath.startsWith('/') ? this.opts.pingPath : `/${this.opts.pingPath}`;
    let url = `${base}${path}`;
    if (this.opts.cacheBuster) {
      const sep = url.includes('?') ? '&' : '?';
      url += `${sep}ts=${Date.now()}`;
    }
    return url;
  }

  // -----------------------------
  // sessionStorage flags (anti-loop)
  // -----------------------------

  private canTryPromptNoneOnce(): boolean {
    try {
      if (sessionStorage.getItem(this.promptNoneOnceKey) === '1') return false;
      sessionStorage.setItem(this.promptNoneOnceKey, '1');
      return true;
    } catch {
      return true;
    }
  }

  private clearPromptNoneOnce(): void {
    try {
      sessionStorage.removeItem(this.promptNoneOnceKey);
    } catch {
      /* no-op */
    }
  }

  private canTryInteractiveOnce(): boolean {
    try {
      if (sessionStorage.getItem(this.interactiveOnceKey) === '1') return false;
      sessionStorage.setItem(this.interactiveOnceKey, '1');
      return true;
    } catch {
      return true;
    }
  }

  private clearInteractiveOnce(): void {
    try {
      sessionStorage.removeItem(this.interactiveOnceKey);
    } catch {
      /* no-op */
    }
  }

  private isLogoutDisabled(): boolean {
    try {
      return sessionStorage.getItem(this.logoutDisabledKey) === '1';
    } catch {
      return false;
    }
  }

  private setLogoutDisabled(): void {
    try {
      sessionStorage.setItem(this.logoutDisabledKey, '1');
    } catch {
      /* no-op */
    }
  }

  private clearLogoutDisabled(): void {
    try {
      sessionStorage.removeItem(this.logoutDisabledKey);
    } catch {
      /* no-op */
    }
  }

  // -----------------------------
  // Logging
  // -----------------------------

  private async getConfiguredLogLevel(): Promise<SimpleLogLevel> {
    try {
      const cfg: any = await firstValueFrom(this.opts.oidc.getConfiguration().pipe(take(1)));
      const raw = cfg?.logLevel;

      if (typeof raw === 'number') return this.clampLogLevel(raw);

      if (typeof raw === 'string') {
        const s = raw.toLowerCase();
        if (s.includes('debug')) return SimpleLogLevel.Debug;
        if (s.includes('info')) return SimpleLogLevel.Info;
        if (s.includes('warn')) return SimpleLogLevel.Warn;
        if (s.includes('error')) return SimpleLogLevel.Error;
        if (s.includes('none') || s.includes('off')) return SimpleLogLevel.None;
      }

      return this.opts.defaultLogLevel;
    } catch {
      return this.opts.defaultLogLevel;
    }
  }

  private clampLogLevel(v: number): SimpleLogLevel {
    if (v <= 0) return SimpleLogLevel.None;
    if (v === 1) return SimpleLogLevel.Error;
    if (v === 2) return SimpleLogLevel.Warn;
    if (v === 3) return SimpleLogLevel.Info;
    return SimpleLogLevel.Debug;
  }

  private async logAt(level: SimpleLogLevel, msg: string, err?: any): Promise<void> {
    const cfgLevel = await this.getConfiguredLogLevel();
    if (cfgLevel < level) return;

    const prefix = `[${this.opts.logPrefix}]`;

    if (level === SimpleLogLevel.Error) return void console.error(prefix, msg, err ?? '');
    if (level === SimpleLogLevel.Warn) return void console.warn(prefix, msg, err ?? '');
    if (level === SimpleLogLevel.Info) return void console.info(prefix, msg, err ?? '');
    if (level === SimpleLogLevel.Debug) return void console.log(prefix, msg, err ?? '');
  }

  private logDebug(msg: string, err?: any) {
    void this.logAt(SimpleLogLevel.Debug, msg, err);
  }
  private logWarn(msg: string, err?: any) {
    void this.logAt(SimpleLogLevel.Warn, msg, err);
  }
  private logError(msg: string, err?: any) {
    void this.logAt(SimpleLogLevel.Error, msg, err);
  }
}
