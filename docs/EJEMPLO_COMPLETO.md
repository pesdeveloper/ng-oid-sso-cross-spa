## EJEMPLO completo (ACTUALIZADO) – BOD Demo App + `mma-sso-session-guard`

Este documento está alineado al estado actual (hoy):
- `AuthSessionFacade.bootstrapOnce()` controla **todo el bootstrap** (incluye guard + OIDC + deep-link restore).
- Deep-link restore **NO** se hace en el `App` con `setTimeout`, ni desde el `ShieldGuard`.
- El `ShieldGuard` **no** captura returnUrl (para evitar overwrite durante callback/postLoginRoute).
- La captura del deep-link se hace en el **SSO guard** con política **first-wins** y evitando callback URLs.
- La restauración se realiza **después** de `onLogin$` (autenticación confirmada), de forma determinística (microtask), evitando que el guard lo bloquee.
- Se recomienda `events: ['pageshow']` y `recoverMode: 'promptNone'`.
- `autoBootstrap: false` para no duplicar bootstrap desde provider (lo hace el facade).

---

## 1) `app.config.ts` (COMPLETO)

```ts
import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  provideHttpClient,
  withFetch,
  withInterceptors,
  withXsrfConfiguration,
} from '@angular/common/http';

import { routes } from './app.routes';
import { authConfig } from './auth/auth.config';
import { authInterceptor, provideAuth } from 'angular-auth-oidc-client';
import { xsrfCrossSiteInterceptor } from './auth/xsrf-cross-site.interceptor';

import { provideSsoSessionGuard, SimpleLogLevel } from 'mma-sso-session-guard';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),

    // OIDC
    provideAuth(authConfig),

    // HTTP (fetch + XSRF + interceptors)
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),
      withInterceptors([authInterceptor(), xsrfCrossSiteInterceptor]),
    ),

    // SSO Session Guard
    provideSsoSessionGuard({
      appNs: 'bod',
      logPrefix: 'BOD-SSO',

      // ✅ recomendación actual: SOLO pageshow (BFCache/back-forward)
      events: ['pageshow'],

      // throttle ping
      minIntervalMs: 5000,

      // ✅ minimiza tráfico: solo ping si la SPA cree que está auth (tiene token local)
      onlyWhenAuthenticated: true,

      // ping cookie IdP
      pingPath: '/api/session/ping',

      // recover si hay cookie IdP pero no auth local
      recoverMode: 'promptNone',

      // opcional modo Office365-like:
      forceLoginIfNoIdpSession: false,

      // logs
      defaultLogLevel: SimpleLogLevel.Debug,

      // antiforgery warm-up (best effort)
      antiforgery: {
        enabled: true,
        path: '/antiforgery/token',
        run: 'beforePing',
        // loader: se provee internamente por la lib o por tu interceptor, según tu implementación real
      },

      // ✅ NO auto bootstrap desde provider (evita duplicar)
      autoBootstrap: false,

      // ✅ deep-links permitidos (seguridad / anti open-redirect)
      allowedReturnUrlPrefixes: ['/datos'],
    }),
  ],
};
```
## 2) auth/auth.config.ts (COMPLETO)

Nota importante: redirectUrl debe estar registrado exacto en el IdP.
Si usás “sin callback dedicado”, redirectUrl suele ser window.location.origin.

```ts
import { LogLevel, PassedInitialConfig } from 'angular-auth-oidc-client';
import { environment } from '../../environments/environment';

export const authConfig: PassedInitialConfig = {
  config: {
    authority: environment.authConfig.authority,

    // Validaciones (según tu IdP/entorno)
    issValidationOff: true,
    strictIssuerValidationOnWellKnownRetrievalOff: true,

    // URLs
    redirectUrl: `${window.location.origin}`,
    postLogoutRedirectUri: `${window.location.origin}/logout`,

    // Client
    clientId: 'js_bod_hab_client',
    scope: 'openid profile email phone offline_access tramites',

    // ⚠️ No forzar postLoginRoute a una ruta que rompa deep-links.
    // Mantenerlo simple:
    postLoginRoute: '/',

    // Code flow + refresh tokens
    responseType: 'code',
    useRefreshToken: true,

    // Session check / silent renew
    startCheckSession: false,
    silentRenew: false,

    // Refresh behavior
    ignoreNonceAfterRefresh: true,
    triggerRefreshWhenIdTokenExpired: true,
    renewTimeBeforeTokenExpiresInSeconds: 120,

    // UserInfo
    autoUserInfo: true,
    renewUserInfoAfterTokenRenew: true,

    // Logs
    logLevel: LogLevel.Debug,

    // secureRoutes: si lo necesitás, agregalo (cuando uses authInterceptor para APIs)
    // secureRoutes: ['https://localhost:7301', 'https://sb-bod-api.malvinasargentinas.gob.ar'],
  },
};
```

## 3) app.routes.ts (COMPLETO)

La ruta /datos/:sujeto/:cuenta queda protegida por ShieldGuard.
Si el usuario no está autenticado, el guard devuelve false (NO redirige a /),
permitiendo que el deep-link quede “en el navegador” mientras se dispara el login/recover desde el bootstrap.

```ts
import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Logout } from './pages/logout/logout';
import { ShieldGuard } from './auth/guards';

export const routes: Routes = [
  { path: '', component: Home },
  { path: 'logout', component: Logout },

  {
    path: 'datos/:sujeto/:cuenta',
    loadComponent: () => import('./pages/datos/datos').then(m => m.Datos),
    canMatch: [ShieldGuard],
  },

  { path: '**', redirectTo: '/' },
];
```
## 4) auth/guards.ts (ShieldGuard FINAL)

✅ No captura returnUrl (para evitar overwrite durante callback / postLoginRoute)
✅ Solo bloquea si no está auth
✅ Se asegura de que el bootstrap corrió (incluye checkAuth + ping + recover)

```ts
import { inject } from '@angular/core';
import { CanMatchFn } from '@angular/router';
import { from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthSessionFacade } from 'mma-sso-session-guard';

export const ShieldGuard: CanMatchFn = () => {
  const auth = inject(AuthSessionFacade);

  return from(auth.bootstrapOnce()).pipe(
    switchMap(() => auth.state$.pipe(take(1))),
    map(s => {
      if (s.isAuthenticated) return true;

      // ✅ no redirigir a '/', no destruir deep-link
      return false;
    })
  );
};
```

## 5) app.ts (COMPLETO)

Importante: el deep-link restore ya lo hace el AuthSessionFacade internamente.
Tu app solo:

- "se subscribe al estado"
- "llama a bootstrapOnce() una sola vez (al final del ngOnInit)"

```ts
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';
import { OpenIdConfiguration } from 'angular-auth-oidc-client';
import { Subscription, firstValueFrom } from 'rxjs';

import { AuthSessionFacade, AuthSessionState } from 'mma-sso-session-guard';
import { environment } from '../environments/environment';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatDividerModule,
    MatExpansionModule,
    MatCardModule,
    MatIconModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  clientLabel = signal('...');

  isAuthenticated = signal(false);
  config = signal<Partial<OpenIdConfiguration>>({});

  accessToken = signal<string>('');
  accessPayload = signal<any | null>(null);

  idToken = signal<string>('');
  idPayload = signal<any | null>(null);

  userInfo = signal<any | null>(null);
  userInfoLoadedAt = signal<Date | null>(null);

  refreshing = signal(false);

  private readonly auth = inject(AuthSessionFacade);
  private subs: Subscription[] = [];

  ngOnInit(): void {
    // 1) estado global
    this.subs.push(
      this.auth.state$.subscribe((s: AuthSessionState) => {
        this.isAuthenticated.set(!!s.isAuthenticated);

        if (s.config) {
          this.config.set(s.config);
          this.clientLabel.set(this.computeClientLabelFromState(s));
        } else {
          this.clientLabel.set('...');
        }

        this.accessToken.set(s.accessToken ?? '');
        this.accessPayload.set(s.accessPayload ?? null);

        this.idToken.set(s.idToken ?? '');
        this.idPayload.set(s.idPayload ?? null);

        this.userInfo.set(s.userInfo ?? null);
        this.userInfoLoadedAt.set(s.userInfoLoadedAt ?? null);
      })
    );

    // 2) hooks opcionales para logs
    this.subs.push(this.auth.onLogin$.subscribe(() => console.log('✅ login completado')));
    this.subs.push(this.auth.onLogout$.subscribe(() => console.log('✅ logout completado')));
    this.subs.push(this.auth.onLogoutRequested$.subscribe(() => console.log('🟡 logout solicitado')));

    // 3) ✅ bootstrap al final (incluye checkAuth + ping + recover + deep-link restore)
    void this.auth.bootstrapOnce().catch(() => {});
  }

  ngOnDestroy(): void {
    for (const s of this.subs) s.unsubscribe();
    this.subs = [];
  }

  // --------------------------
  // UI actions
  // --------------------------
  login(): void {
    this.auth.login();
  }

  logout(): void {
    this.auth.logout();
  }

  refreshSession(): void {
    if (this.refreshing()) return;
    this.refreshing.set(true);

    this.auth.refresh().subscribe({
      next: _ => this.refreshing.set(false),
      error: _ => this.refreshing.set(false),
    });
  }

  goUserProfile(): void {
    this.auth.goUserProfile();
  }

  goToMasPagos(): void {
    window.location.href = environment.externalSites.masPagos;
  }

  async mostrarAccessToken(): Promise<void> {
    const at = await firstValueFrom(this.auth.getAccessToken());
    console.clear();
    console.log(`AccessToken = ${at}`);
  }

  loadUserInfo(): void {
    this.auth.refreshUserInfo();
  }

  refreshUserInfo(): void {
    // Si querés forzar reload visual:
    (this.auth as any).clearUserInfo?.();
    this.auth.refreshUserInfo();
  }

  // --------------------------
  // Copy helpers
  // --------------------------
  async copy(text?: string | null): Promise<void> {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch {}
  }

  async copyJson(obj: any): Promise<void> {
    if (!obj) return;
    try { await navigator.clipboard.writeText(JSON.stringify(obj, null, 2)); } catch {}
  }

  // --------------------------
  // Label
  // --------------------------
  private computeClientLabelFromState(s: AuthSessionState): string {
    const idp: any = s.idPayload ?? null;

    if (idp?.client_name) return String(idp.client_name);
    if (idp?.azp) return String(idp.azp);

    const cfg: any = s.config ?? null;
    const clientId = cfg?.clientId ?? cfg?.client_id ?? null;

    return clientId ? String(clientId) : 'No client id';
  }
}
```

## 6) app.html (COMPLETO)

```html
<mat-toolbar color="primary">
  <span>{{ clientLabel() }}</span>
</mat-toolbar>

<mat-divider></mat-divider>

<div class="main-container">
  @if (isAuthenticated(); as auth) {
    <mat-card>
      <div style="display: flex; gap: 12px; flex-wrap: wrap;">
        <button mat-raised-button color="warn" (click)="logout()">
          <mat-icon fontSet="material-icons">logout</mat-icon>
          Logout
        </button>

        <button mat-raised-button color="accent" (click)="mostrarAccessToken()">
          <mat-icon fontSet="material-icons">visibility</mat-icon>
          Ver Access Token &gt; consola
        </button>

        <button mat-raised-button color="primary" (click)="goUserProfile()">
          <mat-icon fontSet="material-icons">person</mat-icon>
          Perfil de usuario
        </button>

        <button
          mat-raised-button
          color="primary"
          (click)="refreshSession()"
          [disabled]="refreshing()"
        >
          <mat-icon fontSet="material-icons" [class.spin]="refreshing()">autorenew</mat-icon>
          {{ refreshing() ? 'Refreshing…' : 'Refresh session' }}
        </button>
      </div>

      <div style="margin-top: 12px;">
        <button mat-raised-button color="accent" (click)="goToMasPagos()">
          <mat-icon fontSet="material-icons">payments</mat-icon>
          Ir a Más Pagos
        </button>
      </div>

      <br />
      <p>Is Authenticated:<strong> {{ auth }}</strong></p>
    </mat-card>
  } @else {
    <mat-card>
      <button mat-raised-button class="btn-success" (click)="login()">
        <mat-icon fontSet="material-icons">login</mat-icon>
        Iniciar sesión
      </button>
    </mat-card>
  }

  <mat-divider></mat-divider>
  <br />

  <mat-expansion-panel>
    <mat-expansion-panel-header>
      <mat-panel-title>
        <mat-icon fontSet="material-icons">settings</mat-icon>
        Configuration loaded
      </mat-panel-title>
    </mat-expansion-panel-header>
    <pre>{{ config() | json }}</pre>
  </mat-expansion-panel>

  <br />

  <mat-expansion-panel class="panel-info">
    @let atp = accessPayload();

    <mat-expansion-panel-header>
      <mat-panel-title>
        <mat-icon fontSet="material-icons">vpn_key</mat-icon>
        Access Token (decoded)
      </mat-panel-title>
      <mat-panel-description>
        @if (atp?.exp) { exp: {{ (atp.exp * 1000) | date:'medium' }} } @else { &nbsp; }
      </mat-panel-description>
    </mat-expansion-panel-header>

    @if (atp) {
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
        <button mat-stroked-button (click)="copy(accessToken())" [disabled]="!accessToken()">
          <mat-icon fontSet="material-icons">content_copy</mat-icon>
          Copiar JWT
        </button>
        <button mat-stroked-button (click)="copyJson(atp)">
          <mat-icon fontSet="material-icons">content_copy</mat-icon>
          Copiar payload
        </button>
      </div>
      <pre>{{ atp | json }}</pre>
    } @else {
      <p style="opacity:.7">Logueate para ver el payload del access token.</p>
    }
  </mat-expansion-panel>

  <br />

  <mat-expansion-panel class="panel-info">
    @let pid = idPayload();

    <mat-expansion-panel-header>
      <mat-panel-title>
        <mat-icon fontSet="material-icons">verified_user</mat-icon>
        ID Token (decoded)
      </mat-panel-title>
      <mat-panel-description>
        @if (pid?.exp) { exp: {{ (pid.exp * 1000) | date:'medium' }} } @else { &nbsp; }
      </mat-panel-description>
    </mat-expansion-panel-header>

    @if (pid) {
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
        <button mat-stroked-button (click)="copy(idToken())" [disabled]="!idToken()">
          <mat-icon fontSet="material-icons">content_copy</mat-icon>
          Copiar JWT
        </button>
        <button mat-stroked-button (click)="copyJson(pid)">
          <mat-icon fontSet="material-icons">content_copy</mat-icon>
          Copiar payload
        </button>
      </div>
      <pre>{{ pid | json }}</pre>
    } @else {
      <p style="opacity:.7">Logueate para ver el payload del ID token.</p>
    }
  </mat-expansion-panel>

  <br />

  <mat-expansion-panel class="panel-info" (opened)="loadUserInfo()">
    <mat-expansion-panel-header>
      <mat-panel-title class="title-with-icon">
        <mat-icon fontSet="material-icons">badge</mat-icon>
        UserInfo
      </mat-panel-title>
      <mat-panel-description>
        @if (userInfo()) { actualizado: {{ userInfoLoadedAt() | date:'mediumTime' }} } @else { &nbsp; }
      </mat-panel-description>
    </mat-expansion-panel-header>

    @if (userInfo()) {
      <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:8px;">
        <button mat-stroked-button (click)="refreshUserInfo()">
          <mat-icon fontSet="material-icons">refresh</mat-icon>
          Actualizar
        </button>
        <button mat-stroked-button (click)="copyJson(userInfo())">
          <mat-icon fontSet="material-icons">content_copy</mat-icon>
          Copiar JSON
        </button>
      </div>
      <pre>{{ userInfo() | json }}</pre>
    } @else {
      <p style="opacity:.7">Abrí el panel (y logueate) para consultar /connect/userinfo.</p>
    }
  </mat-expansion-panel>

  <router-outlet></router-outlet>
</div>
```


