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
import { environment } from '../environments/environment';

import { AuthSessionFacade, AuthSessionState } from 'mma-sso-session-guard';

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
    // 1) bootstrap del facade
    this.auth.bootstrap();

    // 2) hooks opcionales
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

    // 3) state
    this.subs.push(
      this.auth.state$.subscribe((s: AuthSessionState) => {
        this.isAuthenticated.set(!!s.isAuthenticated);

        if (s.config) {
          this.config.set(s.config);
          this.clientLabel.set(this.computeClientLabelFromState(s));
        } else {
          // por si arranca sin config aún
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

  async mostrarAccessToken(): Promise<void> {
    const at = await firstValueFrom(this.auth.getAccessToken());
    console.clear();
    console.log(`AccessToken = ${at}`);
  }

  loadUserInfo(): void {
    // Opción A: el facade hace el fetch y actualiza state.userInfo
    this.auth.refreshUserInfo();
  }

  refreshUserInfo(): void {
    // Ideal si existe en el facade (recomendado)
    if ((this.auth as any).clearUserInfo) {
      (this.auth as any).clearUserInfo();
    } else {
      // fallback: si no existe, al menos vuelve a pedir userinfo
      // o podrías setear userInfo en null acá en App, pero eso rompe el patrón "solo state$"
    }

    this.auth.refreshUserInfo();
  }

  // --------------------------
  // Copy helpers
  // --------------------------

  async copy(text?: string | null): Promise<void> {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* no-op */
    }
  }

  async copyJson(obj: any): Promise<void> {
    if (!obj) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(obj, null, 2));
    } catch {
      /* no-op */
    }
  }

  // --------------------------
  // Label (desde el STATE)
  // --------------------------

  private computeClientLabelFromState(s: AuthSessionState): string {
    // 1) si hay idPayload con nombre “humano”
    const idp: any = s.idPayload ?? null;

    if (idp?.client_name) return String(idp.client_name);
    if (idp?.azp) return String(idp.azp);

    // 2) fallback: config.clientId (siempre debería estar)
    const cfg = s.config as any;
    const clientId = cfg?.clientId ?? cfg?.client_id ?? null;

    return clientId ? String(clientId) : 'No client id';
  }
}