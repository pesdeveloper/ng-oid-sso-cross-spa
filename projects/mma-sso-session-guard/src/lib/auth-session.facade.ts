import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
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
  private readonly router = inject(Router);
  private readonly http = inject(HttpClient);

  private subs: Subscription[] = [];
  private started = false;

  private readonly _state$ = new BehaviorSubject<AuthSessionState>(INITIAL_STATE);
  readonly state$ = this._state$.asObservable();

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

  // -------------------------
  // BOOTSTRAP
  // -------------------------

  bootstrap(): void {
    if (this.started) return;
    this.started = true;

    const path = window.location.pathname || '';

    // ✅ cargar config 1 vez al iniciar (aunque no haya sesión)
    this.oidc.getConfiguration().pipe(take(1)).subscribe(cfg => {
      const cur = this._state$.value;
      this._state$.next({
        ...cur,
        config: cfg as OpenIdConfiguration,
      });
    });

    // ruta /logout
    if (path.startsWith('/logout')) {
      this.guard.markLogoutFromThisApp();
      this.oidc.logoffLocal();
      // dejar state consistente
      this._state$.next({ ...this._state$.value, isAuthenticated: false });
      return;
    }

    // escuchar cambios de auth del oidc
    this.subs.push(
      this.oidc.isAuthenticated$.subscribe(({ isAuthenticated }) => {
        if (isAuthenticated) {
          this.guard.clearLogoutDisabledFlag();
        }

        // refrescar state base (auth + config)
        this.oidc.getConfiguration().pipe(take(1)).subscribe(cfg => {
          const cur = this._state$.value;
          this._state$.next({
            ...cur,
            isAuthenticated,
            config: cfg as OpenIdConfiguration,
          });

          // ✅ si autenticó, refrescar tokens/payloads en el state
          if (isAuthenticated) {
            this.refreshTokens();
          } else {
            // limpiar tokens/payloads/userinfo
            this._state$.next({
              ...this._state$.value,
              accessToken: '',
              accessPayload: null,
              idToken: '',
              idPayload: null,
              userInfo: null,
              userInfoLoadedAt: null,
            });
          }
        });
      })
    );

    // bootstrap SSO
    void this.guard
      .bootstrapAuthOnce({ doCheckAuth: true, router: this.router })
      .catch(() => {});
  }

  // -------------------------
  // ACTIONS
  // -------------------------

  login(): void {
    this.guard.rememberReturnUrl();
    this.oidc.authorize();
  }

  logout(): void {
    this._logoutRequested$.next();

    // ✅ forzar transición local inmediata para que onLogout$ dispare siempre
    const cur = this._state$.value;
    if (cur.isAuthenticated) {
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

    this.guard.markLogoutFromThisApp();
    this.oidc.logoff().subscribe();
  }

  refresh(): Observable<LoginResponse> {
    return this.oidc.forceRefreshSession().pipe(
      switchMap(r => {
        // cuando refresca, actualizamos tokens/payloads en state
        this.refreshTokens();
        return of(r);
      })
    );
  }

  goUserProfile(): void {
    this.oidc.getConfiguration().pipe(take(1)).subscribe(cfg => {
      const authority = (cfg as OpenIdConfiguration).authority;
      const clientId = (cfg as OpenIdConfiguration).clientId;
      const currentUrl = window.location.origin + window.location.pathname;
      const returnUrl = encodeURIComponent(currentUrl);

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
        const cur = this._state$.value;
        this._state$.next({
          ...cur,
          accessToken: at ?? '',
          accessPayload: atp ?? null,
          idToken: it ?? '',
          idPayload: itp ?? null,
        });
      },
      error: _ => {
        // no matamos el flujo si falla algo de payload
      }
    });
  }

  refreshUserInfo(): void {
    const cur = this._state$.value;
    if (!cur.isAuthenticated || !cur.config?.authority) {
      this._state$.next({ ...cur, userInfo: null, userInfoLoadedAt: null });
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
            catchError(err => of({
              error: err?.message ?? 'UserInfo error',
              status: err?.status,
            }))
          );
        })
      )
      .subscribe(data => {
        const now = new Date();
        const cur2 = this._state$.value;
        this._state$.next({
          ...cur2,
          userInfo: data ?? null,
          userInfoLoadedAt: now,
        });
      });
  }

  clearUserInfo(): void {
    const cur = this._state$.value;
    this._state$.next({ ...cur, userInfo: null, userInfoLoadedAt: null });
  }

  // -------------------------
  // CLEANUP
  // -------------------------

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }
}