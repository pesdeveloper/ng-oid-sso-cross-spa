import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterOutlet } from '@angular/router';
import { LoginResponse, OidcSecurityService, OpenIdConfiguration } from 'angular-auth-oidc-client';
import { forkJoin, Subscription, take } from 'rxjs';

// ✅ Guard/infra SSO
import { SsoSessionGuardService } from './auth/sso-session-guard.service';

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
  title = signal('...');

  isAuthenticated = signal(false);
  config = signal<Partial<OpenIdConfiguration>>({});
  accessToken = signal<string>('');
  accessPayload = signal<any | null>(null);
  idToken = signal<string>('');
  idPayload = signal<any | null>(null);
  userInfo = signal<any | null>(null);
  userInfoLoadedAt = signal<Date | null>(null);

  refreshing = signal(false);

  private router = inject(Router);
  private http = inject(HttpClient);
  private readonly oidcSecurityService = inject(OidcSecurityService);

  // ✅ SSO guard
  private readonly ssoGuard = inject(SsoSessionGuardService);

  private subs: Subscription[] = [];

  ngOnInit(): void {
    const path = window.location.pathname || '';
    console.log('BOD: App.ngOnInit() path=', path);

    // 0) Estado reactivo (primero)
    this.subs.push(
      this.oidcSecurityService.isAuthenticated$.subscribe(({ isAuthenticated }) => {
        this.isAuthenticated.set(isAuthenticated);

        // Siempre cargar config (incluso sin sesión)
        this.oidcSecurityService.getConfiguration().pipe(take(1)).subscribe(cfg => {
          this.config.set(cfg as OpenIdConfiguration);
          this.updateClientLabel();
        });

        if (isAuthenticated) {
          // ✅ Si autenticó, permitir recover futuro (por si venías de un logout previo)
          this.ssoGuard.clearLogoutDisabledFlag();

          this.loadAccessTokenPayload();
          this.loadIdTokenPayload();
        } else {
          this.updateClientLabel();
        }
      })
    );

    // 1) Si estoy en /logout, corto todo y limpio local
    if (path.startsWith('/logout')) {
      this.isAuthenticated.set(false);

      // ✅ Marcar logout para que el guard no intente recover
      this.ssoGuard.markLogoutFromThisApp();

      this.oidcSecurityService.logoffLocal();
      return;
    }

    // 2) checkAuth SIEMPRE al iniciar (procesa code/state si venís del IdP)
    this.oidcSecurityService.checkAuth().pipe(take(1)).subscribe((loginResponse: LoginResponse) => {
      console.log('BOD: checkAuth isAuthenticated=', loginResponse?.isAuthenticated);

      // ✅ Con la “nueva modalidad”:
      // - App.ts solo hace checkAuth
      // - El guard se ocupa del ping/resume y del recover(prompt=none) cuando corresponda
      //
      // Opcional (recomendado si querés que AL ENTRAR a BOD, sin interacción, intente SSO):
      // hace 1 ping inicial y, si hay cookie IdP pero no auth local, dispara prompt=none.
      void this.ssoGuard.bootstrapAuthOnce({ doCheckAuth: true })
        .catch(err => console.warn('SSO bootstrap failed (ignored)', err));
    });
  }

  ngOnDestroy() {
    for (const s of this.subs) s.unsubscribe();
    this.subs = [];
  }

  // --------------------------
  // UI actions
  // --------------------------
  login() {
    this.oidcSecurityService.authorize();
  }

  logout() {
    // ✅ Clave: marcar logout para evitar recover automático
    this.ssoGuard.markLogoutFromThisApp();
    this.oidcSecurityService.logoff().subscribe(result => console.log(result));
  }

  mostrarAccessToken() {
    this.oidcSecurityService.getAccessToken().subscribe(at => {
      console.clear();
      console.log(`AccessToken = ${at}`);
    });
  }

  goUserProfile() {
    this.oidcSecurityService.getConfiguration().pipe(take(1)).subscribe(s => {
      const authority = (s as OpenIdConfiguration).authority;
      const clientId = (s as OpenIdConfiguration).clientId;
      const currentUrl = window.location.origin + window.location.pathname;
      const returnUrl = encodeURIComponent(currentUrl);

      const idpUrl = `${authority}/account/profile?client_id=${clientId}&returnUrl=${returnUrl}`;
      window.location.href = idpUrl;
    });
  }

  goToMasPagos() {
    window.location.href = 'https://localhost:4203/?from=bod';
  }

  refreshSession() {
    if (this.refreshing()) return;
    this.refreshing.set(true);

    this.oidcSecurityService.forceRefreshSession().pipe(take(1)).subscribe({
      next: _ => {
        this.refreshing.set(false);
        this.loadAccessTokenPayload();
        this.loadIdTokenPayload();
      },
      error: err => {
        this.refreshing.set(false);
        console.error('Refresh ERROR', err);
      },
    });
  }

  // --------------------------
  // Panels loaders
  // --------------------------
  loadAccessTokenPayload() {
    if (!this.isAuthenticated()) {
      this.accessToken.set('');
      this.accessPayload.set(null);
      return;
    }

    this.oidcSecurityService.getAccessToken().pipe(take(1)).subscribe(at => this.accessToken.set(at ?? ''));
    this.oidcSecurityService.getPayloadFromAccessToken().pipe(take(1)).subscribe(p => this.accessPayload.set(p ?? null));
  }

  loadIdTokenPayload() {
    if (!this.isAuthenticated()) {
      this.idToken.set('');
      this.idPayload.set(null);
      return;
    }

    this.oidcSecurityService.getIdToken().pipe(take(1)).subscribe(it => this.idToken.set(it ?? ''));
    this.oidcSecurityService.getPayloadFromIdToken().pipe(take(1)).subscribe(p => this.idPayload.set(p ?? null));
  }

  loadUserInfo() {
    if (!this.isAuthenticated()) {
      this.userInfo.set(null);
      this.userInfoLoadedAt.set(null);
      return;
    }

    forkJoin([
      this.oidcSecurityService.getAccessToken().pipe(take(1)),
      this.oidcSecurityService.getConfiguration().pipe(take(1)),
    ]).subscribe({
      next: ([token, cfg]) => {
        const authority = (cfg as OpenIdConfiguration)?.authority ?? '';
        if (!token || !authority) {
          this.userInfo.set({ error: 'missing token/authority' });
          return;
        }

        const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
        this.http.get(`${authority}/connect/userinfo`, { headers }).subscribe({
          next: (data) => {
            this.userInfo.set(data);
            this.userInfoLoadedAt.set(new Date());
          },
          error: (err) => {
            this.userInfo.set({
              error: err?.message ?? 'UserInfo error',
              status: err?.status,
            });
          },
        });
      },
      error: (e) => this.userInfo.set({ error: e?.message ?? 'config/token error' }),
    });
  }

  refreshUserInfo() {
    this.userInfo.set(null);
    this.userInfoLoadedAt.set(null);
    this.loadUserInfo();
  }

  // --------------------------
  // Copy helpers
  // --------------------------
  async copy(text?: string | null) {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); } catch { /* no-op */ }
  }

  async copyJson(obj: any) {
    if (!obj) return;
    try { await navigator.clipboard.writeText(JSON.stringify(obj, null, 2)); } catch { /* no-op */ }
  }

  // --------------------------
  // Label
  // --------------------------
  private updateClientLabel() {
    if (!this.isAuthenticated()) {
      this.oidcSecurityService.getConfiguration().pipe(take(1)).subscribe(cfg => {
        this.title.set((cfg as OpenIdConfiguration).clientId ?? '');
      });
      return;
    }

    this.oidcSecurityService.getPayloadFromIdToken().pipe(take(1)).subscribe(idp => {
      const claimName = (idp as any)?.client_name || (idp as any)?.azp || (idp as any)?.client_id;
      if (claimName) {
        this.title.set(claimName);
        return;
      }
      this.oidcSecurityService.getConfiguration().pipe(take(1)).subscribe(cfg => {
        this.title.set((cfg as OpenIdConfiguration).clientId ?? '');
      });
    });
  }
}
