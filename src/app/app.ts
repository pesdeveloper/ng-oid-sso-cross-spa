import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { Router, RouterOutlet } from '@angular/router';
import { OpenIdConfiguration } from 'angular-auth-oidc-client';
import { Subscription, firstValueFrom } from 'rxjs';
import { environment } from '../environments/environment';

import { AuthSessionFacade, AuthSessionState, SsoSessionGuardService } from 'mma-sso-session-guard';

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
  private readonly router = inject(Router);
  private readonly ssoGuard = inject(SsoSessionGuardService);
  private subs: Subscription[] = [];

  ngOnInit(): void {
    // 2) state
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

    // 3) ✅ bootstrap al final
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

  goToBod(): void {
    window.location.href = environment.externalSites.externalBod;
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
    if ((this.auth as any).clearUserInfo) {
      (this.auth as any).clearUserInfo();
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
    const idp: any = s.idPayload ?? null;

    if (idp?.client_name) return String(idp.client_name);
    if (idp?.azp) return String(idp.azp);

    const cfg = s.config as any;
    const clientId = cfg?.clientId ?? cfg?.client_id ?? null;

    return clientId ? String(clientId) : 'No client id';
  }
}