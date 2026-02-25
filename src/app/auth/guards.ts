import { inject } from '@angular/core';
import { CanMatchFn, Router } from '@angular/router';
import { from } from 'rxjs';
import { map, switchMap, take } from 'rxjs/operators';
import { AuthSessionFacade, SsoSessionGuardService } from 'mma-sso-session-guard';

function isOidcCallbackHref(href: string): boolean {
  // code flow callback / error callback / session_state, etc.
  return /[?&](code|state|error|iss|session_state)=/i.test(href);
}

export const ShieldGuard: CanMatchFn = (_route, segments) => {
  const auth = inject(AuthSessionFacade);
  const sso = inject(SsoSessionGuardService);
  const router = inject(Router);

  return from(auth.bootstrapOnce()).pipe(
    switchMap(() => auth.state$.pipe(take(1))),
    map(s => {
      if (s.isAuthenticated) return true;

      // ✅ NO capturar durante el callback OIDC (evita pisar deep-link)
      const href = window.location.href;
      if (isOidcCallbackHref(href)) return false;

      // ✅ Obtener URL intentada sin usar getCurrentNavigation() (está deprecated)
      // - CanMatch recibe "segments": reconstruimos el path.
      // - Querystring no viene acá; para deep-links con ?rc=... recomendamos capturar
      //   en el AuthSessionFacade.login() (cuando sea login manual) o en el propio SSO service
      //   con captureReturnUrlIfNeeded().
      const path = '/' + segments.map(x => x.path).filter(Boolean).join('/');

      // ✅ No guardar root ni vacío
      if (!path || path === '/') return false;

      // ✅ Guardar "first wins" (NO overwrite)
      // Requisito: que setReturnUrl NO pise si ya existe (o que exista setReturnUrlIfEmpty).
      sso.setReturnUrl(path);

      return false;
    })
  );
};