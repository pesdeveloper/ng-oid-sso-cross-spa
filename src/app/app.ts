import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { environment } from '../environments/environment';

import { AuthSessionFacade, SsoSessionGuardService } from 'mma-sso-session-guard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    CommonModule,
    MatToolbarModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit, OnDestroy {
  readonly auth = inject(AuthSessionFacade);
  private readonly ssoGuard = inject(SsoSessionGuardService);
  private subs: Subscription[] = [];

  ngOnInit(): void {
    void this.auth.bootstrapOnce().catch(() => {});
  }

  ngOnDestroy(): void {
    for (const s of this.subs) s.unsubscribe();
    this.subs = [];
  }

  login(): void {
    this.auth.login();
  }

  logout(): void {
    this.auth.logout();
  }

  get urlConDeepLink(): string {
    return environment.externalSites.urlConDeepLink;
  }
  get urlConDeepLinkInvalido(): string {
    return environment.externalSites.urlConDeepLinkInvalido;
  }
  get urlSinDeepLink(): string {
    return environment.externalSites.urlSinDeepLink;
  }
  get urlSbMasPagosConDeepLink(): string {
    return environment.externalSites.urlSbMasPagosConDeepLink;
  }

  goUrlConDeepLink(): void {
    window.location.href = environment.externalSites.urlConDeepLink;
  }

  goUrlConDeepLinkInvalido(): void {
    window.location.href = environment.externalSites.urlConDeepLinkInvalido;
  }

  goUrlSinDeepLink(): void {
    window.location.href = environment.externalSites.urlSinDeepLink;
  }

  goUrlSbMasPagosConDeepLink(): void {
    window.location.href = environment.externalSites.urlSbMasPagosConDeepLink;
  }
}
