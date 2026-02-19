import { ApplicationConfig, inject, Injectable, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { HttpClient, provideHttpClient, withFetch, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { authConfig } from './auth/auth.config';
import { authInterceptor, provideAuth } from 'angular-auth-oidc-client';
import { xsrfCrossSiteInterceptor } from './auth/xsrf-cross-site.interceptor';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { provideSsoSessionGuard } from '../../projects/mma-sso-session-guard/src/lib/sso-session-guard.providers';
import { SimpleLogLevel } from '../../projects/mma-sso-session-guard/src/lib/sso-session-guard.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAuth(authConfig),
    provideHttpClient(
      withFetch(),
      withXsrfConfiguration({
        cookieName: 'XSRF-TOKEN',
        headerName: 'X-XSRF-TOKEN',
      }),  
      withInterceptors([authInterceptor(), xsrfCrossSiteInterceptor]),
    ), 
    provideSsoSessionGuard({
      appNs: 'bod',
      pingPath: '/api/session/ping',
      minIntervalMs: 5000,
      //events: ['visibilitychange', 'focus'],
      //events: ['pageshow', 'focus'],
      events: ['pageshow'],
      // Office365-like (opcional):
      forceLoginIfNoIdpSession: false,
      // Recover si hay cookie IdP pero auth local no:
      recoverMode: 'promptNone',
      onlyWhenAuthenticated: false,
      logPrefix: 'BOD-SSO',
      defaultLogLevel: SimpleLogLevel.Debug,
      antiforgery: {
        enabled: true,
        path: '/antiforgery/token',
        run: 'beforePing', // o 'beforeRecover' o 'bootstrap' o 'beforePing'
      },
    }),
  ]
};


