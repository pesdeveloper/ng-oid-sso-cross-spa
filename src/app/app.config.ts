import { ApplicationConfig, inject, Injectable, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { HttpClient, provideHttpClient, withFetch, withInterceptors, withXsrfConfiguration } from '@angular/common/http';
import { authConfig } from './auth/auth.config';
import { authInterceptor, provideAuth } from 'angular-auth-oidc-client';
import { xsrfCrossSiteInterceptor } from './auth/xsrf-cross-site.interceptor';
import { catchError, firstValueFrom, map, of } from 'rxjs';
import { provideSsoSessionGuard, SimpleLogLevel } from 'mma-sso-session-guard';


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
      logPrefix: 'BOD-SSO',
      events: ['pageshow'],
      minIntervalMs: 5000,
      onlyWhenAuthenticated: true,
      recoverMode: 'promptNone',
      pingPath: '/api/session/ping',
      antiforgery: { enabled: true, path: '/antiforgery/token', run: 'beforePing' },
      autoBootstrap: false, // ✅ así NO duplicás
    })
  ]
};


