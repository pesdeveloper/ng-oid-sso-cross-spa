import { CanMatchFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { map, take, switchMap } from 'rxjs/operators';
import { OidcSecurityService } from 'angular-auth-oidc-client';

export const ShieldGuard: CanMatchFn = () => {
  const router = inject(Router);
  const oidc = inject(OidcSecurityService);

  // Fuerza a angular-auth-oidc-client a leer storage / procesar estado
  return oidc.checkAuth().pipe(
    take(1),
    map(({ isAuthenticated }) => {
      if (isAuthenticated) return true;
      return router.createUrlTree(['/']); // Home (no /login)
    })
  );
};
