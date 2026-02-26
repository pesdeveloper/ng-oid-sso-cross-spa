// sso-session-guard.service.ts
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
 * - Hay cookie en IdP (ping OK o inconcluso)
 * - Pero checkAuth/isAuthenticated local da false
 */
export type RecoverMode = 'none' | 'promptNone' | 'interactive';

export interface SsoSessionGuardOptions {
  /** Namespace para sessionStorage keys */
  appNs: string;

  /** OidcSecurityService (inyectado en tu app) */
  oidc: OidcSecurityService;

  /** Obtiene el authority actual desde config OIDC */
  authority$: () => Observable<string>;

  /** Path del ping en el IdP (default: '/api/session/ping') */
  pingPath?: string;

  /** Agregar ?ts=Date.now() (default: true) */
  cacheBuster?: boolean;

  /** Mínimo intervalo entre pings (default: 5000ms) */
  minIntervalMs?: number;

  /** Solo ping si la SPA cree que está autenticada (default: false) */
  onlyWhenAuthenticated?: boolean;

  /** Office365-like: si NO hay sesión IdP => authorize() interactivo 1 vez por pestaña. (default false) */
  forceLoginIfNoIdpSession?: boolean;

  /** Recuperación si hay cookie IdP pero no auth local (default 'promptNone') */
  recoverMode?: RecoverMode;

  /** Eventos que disparan revalidación. Default: ['pageshow','visibilitychange','focus'] */
  events?: Array<'pageshow' | 'focus' | 'visibilitychange'>;

  /** Prefijo de logs (default 'SSO') */
  logPrefix?: string;

  /** Si no puedo leer cfg.logLevel, uso este (default Debug) */
  defaultLogLevel?: SimpleLogLevel;

  /** Antiforgery warm-up (best effort) */
  antiforgery?: {
    enabled?: boolean;
    path?: string; // default '/antiforgery/token'
    run?: 'beforePing' | 'beforeRecover' | 'bootstrap';
    loader: (url: string) => Promise<void>;
  };

  /** ✅ Deep-links permitidos (prefijos). Ej: ['/datos','/checkout'] */
  allowedReturnUrlPrefixes?: string[];

  /** ✅ Paths a ignorar SIEMPRE (además de callbacks OIDC). Ej: ['/logout','/signin-oidc'] */
  ignoredReturnUrlPrefixes?: string[];

}

@Injectable({ providedIn: 'root' })
export class SsoSessionGuardService {
  private started = false;

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
      | 'allowedReturnUrlPrefixes'
      | 'ignoredReturnUrlPrefixes'
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

  private isResuming = false;

  start(options: SsoSessionGuardOptions): void {
    if (this.started) return;
    this.started = true;

    const pingPath = options.pingPath ?? '/api/session/ping';
    const cacheBuster = options.cacheBuster ?? true;
    const minIntervalMs = options.minIntervalMs ?? 5000;
    const onlyWhenAuthenticated = options.onlyWhenAuthenticated ?? false;
    const forceLoginIfNoIdpSession = options.forceLoginIfNoIdpSession ?? false;
    const recoverMode = options.recoverMode ?? 'promptNone';
    const events = options.events ?? ['pageshow', 'visibilitychange', 'focus'];
    const logPrefix = options.logPrefix ?? 'SSO';
    const defaultLogLevel = options.defaultLogLevel ?? SimpleLogLevel.Debug;

    const allowedReturnUrlPrefixes = options.allowedReturnUrlPrefixes ?? [];
    const ignoredReturnUrlPrefixes = options.ignoredReturnUrlPrefixes ?? [
      '/logout',
      '/silent-renew',
      '/assets',
    ];
    
    
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
      allowedReturnUrlPrefixes,
      ignoredReturnUrlPrefixes,      
    };

    // SessionStorage keys namespaced
    this.promptNoneOnceKey = `${this.opts.appNs}:oidc:promptnone:once`;
    this.interactiveOnceKey = `${this.opts.appNs}:oidc:interactive:once`;
    this.logoutDisabledKey = `${this.opts.appNs}:oidc:recover:disabled`;

    this.logDebug(
      `antiforgery enabled=${!!this.opts.antiforgery?.enabled} run=${this.opts.antiforgery?.run ?? 'beforePing'} path=${this.opts.antiforgery?.path ?? ''}`
    );

    this.attachHooks();
  }

  /**
   * ✅ Verificación inicial "de verdad" al entrar a la app.
   * - antiforgery (si enabled) -> ping -> si no IdP => logoffLocal
   * - si doCheckAuth: checkAuth y, si hay cookie IdP pero no auth local => recover según recoverMode
   */
  async bootstrapAuthOnce(params?: { doCheckAuth?: boolean }): Promise<void> {
    const doCheckAuth = params?.doCheckAuth ?? false;

    // ✅ 0) Capturar deep-link ANTES de cualquier cosa (si aplica)
    this.captureReturnUrlIfNeeded('bootstrap');

    if (this.opts.antiforgery?.enabled) {
      await this.ensureAntiforgeryOnce('bootstrap');
    }

    const ping = await this.safePing('bootstrap');
    this.logDebug(`bootstrap: ping=${ping} (true=hasIdp, false=noIdp, null=unknown)`);

    if (ping === false) {
      await this.handleNoIdpSession('bootstrap');
      return;
    }

    if (!doCheckAuth) return;

    const resp = await firstValueFrom(this.opts.oidc.checkAuth().pipe(take(1)));
    this.logDebug(`bootstrap: checkAuth isAuthenticated=${resp?.isAuthenticated}`);

    if (!resp?.isAuthenticated) {
      await this.handleHasIdpButNoLocalAuth('bootstrap');
    } else {
      this.clearPromptNoneOnce();
      this.clearInteractiveOnce();
      this.clearLogoutDisabled();
    }
  }

  /** Llamalo cuando el usuario hace logout desde ESTA app */
  markLogoutFromThisApp(): void {
    this.setLogoutDisabled();
    this.clearPromptNoneOnce();
    this.clearInteractiveOnce();
  }

  clearLogoutDisabledFlag(): void {
    this.clearLogoutDisabled();
  }

  getReturnUrlKey(): string {
    const url = `${this.opts.appNs}:returnUrl`;
    this.logDebug(`>>>> getReturnUrlKey : GET url = '${url}'`);
    return url;
  }

  setReturnUrl(url: string, opts?: { overwrite?: boolean }): void {
    const key = this.getReturnUrlKey();
    const overwrite = opts?.overwrite ?? false;

    try {
      if (!overwrite) {
        const existing = sessionStorage.getItem(key);
        if (existing) {
          this.logDebug(`setReturnUrl ignored (already set). existing='${existing}' new='${url}'`);
          return;
        }
      }

      sessionStorage.setItem(key, url);
      this.logDebug(`setReturnUrl stored '${url}' overwrite=${overwrite}`);
    } catch {}
  }

  popReturnUrl(): string | null {
    try {
      const k = this.getReturnUrlKey();
      const v = sessionStorage.getItem(k);
      if (v) sessionStorage.removeItem(k);
      this.logDebug(`>>>> popReturnUrl : k = '${k}' , v = '${v}'`);      
      return v;
    } catch {
      this.logDebug(`>>>> popReturnUrl CATCH-ERROR`);      
      return null;
    }
  }

  // -----------------------------
  // Hooks
  // -----------------------------

  private attachHooks(): void {
    if (this.attached) return;
    this.attached = true;

    const { events } = this.opts;

    if (events.includes('pageshow')) {
      const fn = (ev: PageTransitionEvent) => {
        const persisted = (ev as any)?.persisted === true;

        // BFCache/back-forward
        if (!persisted) {
          this.logDebug(`pageshow ignored (persisted=false)`);
          return;
        }

        this.onResume(`pageshow persisted=true`);
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

  private isOidcCallbackUrl(url: string): boolean {
    try {
      const u = new URL(url, window.location.origin);
      const p = u.searchParams;
      return p.has('code') || p.has('state') || p.has('error') || p.has('iss') || p.has('session_state');
    } catch {
      return /[?&](code|state|error|iss|session_state)=/i.test(url);
    }
  }

  private async onResume(reason: string): Promise<void> {
    if (!this.started) return;

    const url = window.location.href;

    // callback => no tocar nada
    if (this.isOidcCallbackUrl(url)) {
      this.logDebug(`onResume(${reason}) ignored: OIDC callback URL`);
      return;
    }

    // logout desde esta app => no recuperar
    if (this.isLogoutDisabled()) {
      this.logDebug(`resume ignored (logoutDisabled=true). reason=${reason}`);
      return;
    }

    if (this.isResuming) {
      this.logDebug(`onResume(${reason}) ignored: already running`);
      return;
    }

    this.isResuming = true;
    try {
      // onlyWhenAuthenticated: si no hay accessToken local, no ping
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

      // throttle
      const now = Date.now();
      if (now - this.lastPingAt < this.opts.minIntervalMs) {
        this.logDebug(`resume throttled (${now - this.lastPingAt}ms < ${this.opts.minIntervalMs}ms). reason=${reason}`);
        return;
      }

      // in-flight
      if (this.pingInFlight) {
        this.logDebug(`resume ignored (pingInFlight=true). reason=${reason}`);
        return;
      }

      this.lastPingAt = now;
      this.pingInFlight = true;

      try {
        if (this.opts.antiforgery?.enabled) {
          await this.ensureAntiforgeryOnce(`resume:${reason}`);
        }

        this.logDebug(`resume -> ping IdP session... reason=${reason}`);
        const ping = await this.safePing(`resume:${reason}`);
        this.logDebug(`resume ping result=${ping} (true=hasIdp, false=noIdp, null=unknown)`);

        if (ping === false) {
          await this.handleNoIdpSession(`resume:${reason}`);
          return;
        }

        const isLocalAuth = await this.isLocallyAuthenticated();
        this.logDebug(`resume local isAuthenticated=${isLocalAuth}`);

        if (!isLocalAuth) {
          await this.handleHasIdpButNoLocalAuth(`resume:${reason}`);
        } else {
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

    // refresh state (best effort)
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
          this.captureReturnUrlIfNeeded(`forceLogin:${context}`);
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

      if (this.opts.antiforgery?.enabled && (this.opts.antiforgery.run ?? 'beforePing') === 'beforeRecover') {
        await this.ensureAntiforgeryOnce(`recover:${context}`);
      }

      try {
        this.captureReturnUrlIfNeeded(`recover:promptNone:${context}`);
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
        this.captureReturnUrlIfNeeded(`recover:interactive:${context}`);
        this.opts.oidc.authorize();
      } catch (e) {
        this.logError(`authorize() failed. ctx=${context}`, e);
      }
      return;
    }
  }

  // -----------------------------
  // Antiforgery
  // -----------------------------

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
      this.logWarn(`antiforgery warm-up failed (ignored). ctx=${context}`, e);
    } finally {
      this.antiforgeryDone = true;
      this.antiforgeryInFlight = false;
    }
  }

  // -----------------------------
  // Ping
  // -----------------------------

  private async safePing(context: string): Promise<boolean | null> {
    try {
      const authority = await this.getAuthorityOnce();
      if (!authority) {
        this.logWarn(`safePing: missing authority. ctx=${context}`);
        return true; // best-effort
      }

      // Safari cross-site: ping inconcluso (no romper UX)
      if (this.isSafari() && this.isCrossSite(authority)) {
        this.logWarn(`safePing: skipped on Safari (cross-site). ctx=${context}`);
        return null;
      }

      const url = this.buildPingUrl(authority);

      const resp = await fetch(url, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        cache: 'no-store',
      });

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

  private isSafari(): boolean {
    const ua = navigator.userAgent;
    const isApple = /Macintosh|iPhone|iPad|iPod/.test(ua);
    const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Edg|EdgiOS|OPR|FxiOS/.test(ua);
    return isApple && isSafari;
  }

  private isCrossSite(authority: string): boolean {
    try {
      const a = new URL(authority);
      const here = window.location;
      return a.host.toLowerCase() !== here.host.toLowerCase();
    } catch {
      return true;
    }
  }

  private captureReturnUrlIfNeeded(context: string): void {
    try {
      const href = window.location.href;
      this.logDebug(`>>> captureReturnUrl START: href=${href}`);

      // 1️⃣ nunca capturar callback OIDC
      if (this.isOidcCallbackUrl(href)) {
        this.logDebug(`captureReturnUrl ignored: OIDC callback. ctx=${context}`);
        return;
      }

      // 2️⃣ path + query
      const pathname = window.location.pathname || '';
      const rel = pathname + (window.location.search || '');

      // 3️⃣ aplicar filtro whitelist/ignore/assets sobre el PATH
      if (!this.isReturnUrlAllowed(pathname)) {
        this.logDebug(`captureReturnUrl ignored: not allowed pathname='${pathname}'. ctx=${context}`);
        return;
      }

      // 4️⃣ first-wins (no pisar)
      const key = this.getReturnUrlKey();
      if (sessionStorage.getItem(key)) {
        this.logDebug(`captureReturnUrl ignored: already stored. ctx=${context}`);
        return;
      }

      sessionStorage.setItem(key, rel);
      this.logDebug(`>>>> captureReturnUrl stored '${rel}'. ctx=${context}`);
    } catch (e) {
      this.logWarn(`>>>> captureReturnUrl failed (ignored). ctx=${context}`, e);
    }
  }

  // -----------------------------
  // Flags anti-loop
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
    } catch {}
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
    } catch {}
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
    } catch {}
  }

  private clearLogoutDisabled(): void {
    try {
      sessionStorage.removeItem(this.logoutDisabledKey);
    } catch {}
  }

  // --------------------------
  // Helpers  Normlizacion urls
  // --------------------------

  private normalizePath(p: string): string {
    if (!p) return '';
    // asegura leading slash y saca trailing slashes (excepto '/')
    let x = p.startsWith('/') ? p : '/' + p;
    x = x.length > 1 ? x.replace(/\/+$/, '') : x;
    return x;
  }

  private isPrefixMatch(pathname: string, prefix: string): boolean {
    const p = this.normalizePath(pathname);
    const pref = this.normalizePath(prefix);
    return p === pref || p.startsWith(pref + '/');
  }

  private isAssetPath(pathname: string): boolean {
    const p = (pathname ?? '').toLowerCase();

    // /assets/... o /favicon.ico
    if (p.startsWith('/assets/')) return true;
    if (p === '/favicon.ico') return true;

    // archivos estáticos típicos
    return (
      p.endsWith('.js') ||
      p.endsWith('.css') ||
      p.endsWith('.map') ||
      p.endsWith('.ico') ||
      p.endsWith('.png') ||
      p.endsWith('.jpg') ||
      p.endsWith('.jpeg') ||
      p.endsWith('.webp') ||
      p.endsWith('.svg') ||
      p.endsWith('.woff') ||
      p.endsWith('.woff2') ||
      p.endsWith('.ttf')
    );
  }

  private isReturnUrlAllowed(pathname: string): boolean {
    const p = this.normalizePath(pathname);

    // 0) root nunca
    if (!p || p === '/') return false;

    // 1) assets nunca
    if (this.isAssetPath(p)) return false;

    // 2) ignore list (técnicos)
    const ignored = this.opts.ignoredReturnUrlPrefixes ?? [];
    if (ignored.some(x => this.isPrefixMatch(p, x))) return false;

    // 3) whitelist: si está vacía => NO capturar nada (seguro)
    const allowed = this.opts.allowedReturnUrlPrefixes ?? [];
    if (!allowed.length) return false;

    // 4) debe matchear algún prefijo permitido
    return allowed.some(x => this.isPrefixMatch(p, x));
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