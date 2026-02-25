import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, OnDestroy } from '@angular/core';
import { LoginResponse, OidcSecurityService, OpenIdConfiguration } from 'angular-auth-oidc-client';
import { BehaviorSubject, Observable, Subject, Subscription, forkJoin, of, take } from 'rxjs';
import { catchError, distinctUntilChanged, filter, map, pairwise, shareReplay, switchMap } from 'rxjs/operators';

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

  private subs: Subscription[] = [];
  private started = false;

  private readonly _state$ = new BehaviorSubject<AuthSessionState>(INITIAL_STATE);
  readonly state$ = this._state$.asObservable();

  // útiles, pero la app NO tiene por qué subscribirse
  readonly onLogin$ = this.state$.pipe(
    map(s => s.isAuthenticated),
    distinctUntilChanged(),
    pairwise(),
    filter(([prev, curr]) => !prev && curr),
    map(() => void 0),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  readonly onLogout$ = this.state$.pipe(
    map(s => s.isAuthenticated),
    distinctUntilChanged(),
    pairwise(),
    filter(([prev, curr]) => prev && !curr),
    map(() => void 0),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  private readonly _logoutRequested$ = new Subject<void>();
  readonly onLogoutRequested$ = this._logoutRequested$.asObservable();

  bootstrap(): void {
    if (this.started) return;
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

        if (isAuthenticated) this.refreshTokens();
        else this.clearTokensAndUserInfo();
      })
    );

    // ✅ CLAVE: verificación al entrar SIEMPRE
    void this.guard.bootstrapAuthOnce({ doCheckAuth: true }).catch(() => {});
  }

  // -------------------------
  // ACTIONS
  // -------------------------

  login(): void {
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
    return this.oidc.forceRefreshSession().pipe(
      switchMap(r => {
        this.refreshTokens();
        return of(r);
      })
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