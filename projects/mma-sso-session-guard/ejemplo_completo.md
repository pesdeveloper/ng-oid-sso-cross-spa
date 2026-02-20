## EJEMPLO completo de `app.config.ts`

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

// ✅ Si lo consumís desde npm:
// import { provideSsoSessionGuard, SimpleLogLevel } from 'mma-sso-session-guard';

// ✅ Si lo consumís desde workspace (como en tu repo):
import { provideSsoSessionGuard } from '../../projects/mma-sso-session-guard/src/lib/sso-session-guard.providers';
import { SimpleLogLevel } from '../../projects/mma-sso-session-guard/src/lib/sso-session-guard.service';

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
      pingPath: '/api/session/ping',
      minIntervalMs: 5000,

      // Recomendado:
      // events: ['pageshow', 'focus'],
      events: ['pageshow'],

      // Office365-like (opcional)
      forceLoginIfNoIdpSession: false,

      // Recover si hay cookie IdP pero auth local no:
      recoverMode: 'promptNone',

      // Hacer ping incluso sin token local
      onlyWhenAuthenticated: false,

      logPrefix: 'BOD-SSO',
      defaultLogLevel: SimpleLogLevel.Debug,

      antiforgery: {
        enabled: true,
        path: '/antiforgery/token',
        run: 'beforePing', // 'beforePing' | 'beforeRecover' | 'bootstrap'
      },

      // deep-links permitidos
      allowedReturnUrlPrefixes: ['/datos'],
    }),
  ],
};
```

---

## EJEMPLO completo de `app.ts`

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
import { Subscription } from 'rxjs';

import { AuthSessionFacade } from 'mma-sso-session-guard';
import { AuthSessionState } from 'mma-sso-session-guard';

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
    // 1) bootstrap (incluye /logout handling, checkAuth y guard bootstrap)
    this.auth.bootstrap();

    // 2) hooks opcionales para lógica del dev
    this.subs.push(
      this.auth.onLogin$.subscribe(() => {
        console.log('✅ login completado (state=true)');
      })
    );

    this.subs.push(
      this.auth.onLogout$.subscribe(() => {
        console.log('✅ logout completado (state=false)');
      })
    );

    this.subs.push(
      this.auth.onLogoutRequested$.subscribe(() => {
        console.log('🟡 logout iniciado (siempre se ejecuta)');
      })
    );

    // 3) estado global
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

  mostrarAccessToken(): void {
    this.auth.getAccessToken().subscribe(at => {
      console.clear();
      console.log(`AccessToken = ${at}`);
    });
  }

  // UserInfo (si el facade lo expone)
  loadUserInfo(): void {
    (this.auth as any).loadUserInfo?.();
  }

  refreshUserInfo(): void {
    (this.auth as any).refreshUserInfo?.();
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

---

## EJEMPLO completo de `app.html`

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
