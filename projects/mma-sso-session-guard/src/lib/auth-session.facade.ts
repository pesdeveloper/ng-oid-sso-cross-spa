import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, OnDestroy, computed, signal } from '@angular/core';
import { LoginResponse, OidcSecurityService, OpenIdConfiguration } from 'angular-auth-oidc-client';
import { BehaviorSubject, Observable, Subject, Subscription, firstValueFrom, forkJoin, of, take } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, pairwise, shareReplay, switchMap } from 'rxjs/operators';
import { PublicEventsService, EventTypes } from 'angular-auth-oidc-client';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { SsoSessionGuardService } from './sso-session-guard.service';
import { AuthSessionState } from './auth-session.state';

const INITIAL_STATE: AuthSessionState = {
  isAuthenticated: false,
  config: null,

  accessToken: '',
  accessPayload: null,

  idToken: '',
  idPayload: null,

  userInfo: null,
  userInfoLoadedAt: null,
};

@Injectable({ providedIn: 'root' })
export class AuthSessionFacade implements OnDestroy {
  private readonly oidc = inject(OidcSecurityService);
  private readonly guard = inject(SsoSessionGuardService);
  private readonly http = inject(HttpClient);

  private readonly events = inject(PublicEventsService);
  private readonly router = inject(Router);

  private _bootstrapPromise: Promise<void> | null = null;
  private _bootstrapped = false;

  private subs: Subscription[] = [];
  private started = false;

  private readonly _state$ = new BehaviorSubject<AuthSessionState>(INITIAL_STATE);
  readonly state$ = this._state$.asObservable();

  private readonly _logoutRequested$ = new Subject<void>();
  readonly onLogoutRequested$ = this._logoutRequested$.asObservable();

  private _pendingReturnUrl: string | null = null;

  // útiles, pero la app NO tiene por qué subscribirse
  readonly onLogin$ = this.state$.pipe(
    map(s => s.isAuthenticated),
    distinctUntilChanged(),
    pairwise(),
    filter(([prev, curr]) => !prev && curr),
    map(() => void 0),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  readonly onLogout$ = this.state$.pipe(
    map(s => s.isAuthenticated),
    distinctUntilChanged(),
    pairwise(),
    filter(([prev, curr]) => prev && !curr),
    map(() => void 0),
    shareReplay({ bufferSize: 1, refCount: false })
  );

  // ✅ state como signal (sincronizado con state$)
  readonly state = toSignal(this.state$, { initialValue: INITIAL_STATE });

  // ✅ selectores simples (signals)
  readonly isAuthenticated = computed(() => !!this.state().isAuthenticated);
  readonly config = computed(() => this.state().config);

  readonly accessToken = computed(() => this.state().accessToken ?? '');
  readonly accessPayload = computed(() => this.state().accessPayload ?? null);

  readonly idToken = computed(() => this.state().idToken ?? '');
  readonly idPayload = computed(() => this.state().idPayload ?? null);

  readonly userInfo = computed(() => this.state().userInfo ?? null);
  readonly userInfoLoadedAt = computed(() => this.state().userInfoLoadedAt ?? null);

  // ✅ estado interno
  private readonly _refreshing = signal(false);
  // ✅ solo lectura para la UI
  readonly refreshing = this._refreshing.asReadonly()

  // ✅ clientLabel derivado (sin lógica en App)
  readonly clientLabel = computed(() => this.computeClientLabelFromState(this.state()));  

  checkAuthOnce(): Promise<boolean> {
    return firstValueFrom(this.oidc.checkAuth().pipe(take(1))).then(r => !!r.isAuthenticated).catch(() => false);
  }
  
  bootstrap(): void {
    if (this.started) return;

    this.setupDeepLinkRestore();
  
    this.started = true;

    const path = window.location.pathname || '';

    // config 1 vez
    this.oidc.getConfiguration().pipe(take(1)).subscribe(cfg => {
      this.patchState({ config: cfg as OpenIdConfiguration });
    });

    // ruta /logout
    if (path.startsWith('/logout')) {
      this.guard.markLogoutFromThisApp();
      this.oidc.logoffLocal();
      this.resetAuthState();
      return;
    }

    // escuchar cambios del oidc
    this.subs.push(
      this.oidc.isAuthenticated$.subscribe(({ isAuthenticated }) => {
        if (isAuthenticated) this.guard.clearLogoutDisabledFlag();

        this.patchState({ isAuthenticated });

        if (isAuthenticated) {
          this.refreshTokens();
          this.tryNavigatePendingReturnUrl(); // ✅ acá
        } else {
          this.clearTokensAndUserInfo();
        }
      })
    );
    
  }

  bootstrapOnce(): Promise<void> {
    if (this._bootstrapped) return Promise.resolve();

    if (!this._bootstrapPromise) {
      this._bootstrapPromise = Promise.resolve()
        .then(() => {
          this.bootstrap();

          // /logout: no ping, ya cerramos local
          if (window.location.pathname.startsWith('/logout')) return;

          return this.guard.bootstrapAuthOnce({ doCheckAuth: true });
        })
        .then(() => {
          // ✅ solo si todo salió bien
          this._bootstrapped = true;
        })
        .catch(err => {
          // ✅ permitir retry si falló
          this._bootstrapPromise = null;
          this._bootstrapped = false;
          throw err;
        });
    }

    return this._bootstrapPromise;
  }


  private setupDeepLinkRestore(): void {
    this.subs.push(
      this.events.registerForEvents().subscribe(e => {
        if (!e) return;

        if (e.type === EventTypes.NewAuthenticationResult) {
          const url = this.guard.popReturnUrl(); // consume y borra
          if (!url) return;

          this._pendingReturnUrl = url;

          // si YA está autenticado, navegá ahora
          this.tryNavigatePendingReturnUrl();
        }

        if (e.type === EventTypes.CheckingAuthFinishedWithError) {
          this.guard.popReturnUrl();
          this._pendingReturnUrl = null;
        }
      })
    );
  }


  private tryNavigatePendingReturnUrl(): void {
    const url = this._pendingReturnUrl;
    if (!url) return;

    const isAuth = this._state$.value.isAuthenticated;
    if (!isAuth) return;

    this._pendingReturnUrl = null;

    const current = window.location.pathname + window.location.search;
    if (current === url) return;

    queueMicrotask(() => {
      this.router
        .navigateByUrl(url, { replaceUrl: true })
        .then(ok => console.log(`[AuthSessionFacade] deep-link navigate ok=${ok} url=${url}`))
        .catch(err => console.error('[AuthSessionFacade] deep-link navigate error', err));
    });
  }  

  private computeClientLabelFromState(s: AuthSessionState): string {
    const idp: any = s.idPayload ?? null;

    if (idp?.client_name) return String(idp.client_name);
    if (idp?.azp) return String(idp.azp);

    const cfg = s.config as any;
    const clientId = cfg?.clientId ?? cfg?.client_id ?? null;

    return clientId ? String(clientId) : 'No client id';
  }

  // -------------------------
  // ACTIONS
  // -------------------------

  login(): void {
    // ✅ capturar deep-link ANTES de navegar al IdP
    this.guard.setReturnUrl(window.location.pathname + window.location.search);

    this.oidc.authorize();
  }

  logout(): void {
    this._logoutRequested$.next();

    // transición local inmediata
    this.resetAuthState();

    this.guard.markLogoutFromThisApp();
    this.oidc.logoff().subscribe();
  }

  refresh(): Observable<LoginResponse> {
    if (this._refreshing()) {
      return of(null as any); // evita doble refresh
    }

    this._refreshing.set(true);

    return this.oidc.forceRefreshSession().pipe(
      switchMap(r => {
        this.refreshTokens();
        return of(r);
      }),
      finalize(() => this._refreshing.set(false))
    );
  }

  goUserProfile(): void {
    this.oidc.getConfiguration().pipe(take(1)).subscribe(cfg => {
      const authority = (cfg as OpenIdConfiguration).authority;
      const clientId = (cfg as OpenIdConfiguration).clientId;
      const returnUrl = encodeURIComponent(window.location.origin + window.location.pathname);

      window.location.href =
        `${authority}/account/profile?client_id=${clientId}&returnUrl=${returnUrl}`;
    });
  }

  getAccessToken(): Observable<string> {
    return this.oidc.getAccessToken();
  }

  // -------------------------
  // LOADERS (STATE “RICO”)
  // -------------------------

  refreshTokens(): void {
    forkJoin({
      at: this.oidc.getAccessToken().pipe(take(1)),
      atp: this.oidc.getPayloadFromAccessToken().pipe(take(1)),
      it: this.oidc.getIdToken().pipe(take(1)),
      itp: this.oidc.getPayloadFromIdToken().pipe(take(1)),
    }).subscribe({
      next: ({ at, atp, it, itp }) => {
        this.patchState({
          accessToken: at ?? '',
          accessPayload: atp ?? null,
          idToken: it ?? '',
          idPayload: itp ?? null,
        });
      },
      error: _ => {}
    });
  }

  refreshUserInfo(): void {
    const cur = this._state$.value;
    if (!cur.isAuthenticated || !cur.config?.authority) {
      this.patchState({ userInfo: null, userInfoLoadedAt: null });
      return;
    }

    forkJoin([
      this.oidc.getAccessToken().pipe(take(1)),
      this.oidc.getConfiguration().pipe(take(1)),
    ])
      .pipe(
        switchMap(([token, cfg]) => {
          const authority = (cfg as OpenIdConfiguration)?.authority ?? '';
          if (!token || !authority) return of({ error: 'missing token/authority' });

          const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
          return this.http.get(`${authority}/connect/userinfo`, { headers }).pipe(
            catchError(err =>
              of({
                error: err?.message ?? 'UserInfo error',
                status: err?.status,
              })
            )
          );
        })
      )
      .subscribe(data => {
        this.patchState({
          userInfo: data ?? null,
          userInfoLoadedAt: new Date(),
        });
      });
  }

  clearUserInfo(): void {
    this.patchState({ userInfo: null, userInfoLoadedAt: null });
  }

  // -------------------------
  // HELPERS
  // -------------------------

  private patchState(p: Partial<AuthSessionState>): void {
    const cur = this._state$.value;
    this._state$.next({ ...cur, ...p });
  }

  private clearTokensAndUserInfo(): void {
    this.patchState({
      accessToken: '',
      accessPayload: null,
      idToken: '',
      idPayload: null,
      userInfo: null,
      userInfoLoadedAt: null,
    });
  }

  private resetAuthState(): void {
    const cur = this._state$.value;
    this._state$.next({
      ...cur,
      isAuthenticated: false,
      accessToken: '',
      accessPayload: null,
      idToken: '',
      idPayload: null,
      userInfo: null,
      userInfoLoadedAt: null,
    });
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
  }
}