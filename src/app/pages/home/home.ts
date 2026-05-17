import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthSessionFacade } from 'mma-sso-session-guard';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatExpansionModule,
    MatIconModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  readonly auth = inject(AuthSessionFacade);
  private readonly router = inject(Router);

  refreshSession(): void {
    this.auth.refresh().subscribe();
  }

  goUserProfile(): void {
    this.auth.goUserProfile();
  }

  goHabilitaciones(): void {
    void this.router.navigate(['/habilitaciones']);
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
}
