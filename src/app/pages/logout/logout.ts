import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { OidcSecurityService } from 'angular-auth-oidc-client';

const RECOVER_REFRESH_TRIED_KEY = 'oidc:recover:refresh:tried';
const RECOVER_PROMPTNONE_TRIED_KEY = 'oidc:recover:promptnone:tried';
const RECOVER_DISABLED_KEY = 'oidc:recover:disabled'; 

@Component({
  selector: 'app-logout',
  imports: [],
  templateUrl: './logout.html',
  styleUrl: './logout.scss'
})
export class Logout implements OnInit {

  private oidcSecurityService = inject(OidcSecurityService);
  private router = inject(Router);
  
  ngOnInit(): void {
    // Deshabilito cualquier intento de recuperación silenciosa
    // setRecoverDisabled();
    // clearRecoverFlags();

    // // Limpio tokens/estado local del cliente (no llama al OP)
    // // NOTA: venís desde /connect/logout del OP, así que el servidor ya cerró sesión.
    // this.oidcSecurityService.logoffLocal(); 

    // Navego al home
    this.router.navigateByUrl('/');
  }

}

// helpers
function wasTried(key: string) {
  try { return sessionStorage.getItem(key) === '1'; } catch { return false; }
}
function markTried(key: string) {
  try { sessionStorage.setItem(key, '1'); } catch {}
}
function clearRecoverFlags() {
  try {
    sessionStorage.removeItem(RECOVER_REFRESH_TRIED_KEY);
    sessionStorage.removeItem(RECOVER_PROMPTNONE_TRIED_KEY);
  } catch {}
}

function isRecoverDisabled() {
  try { return localStorage.getItem(RECOVER_DISABLED_KEY) === '1'; } catch { return false; }
}
function setRecoverDisabled() {
  try { localStorage.setItem(RECOVER_DISABLED_KEY, '1'); } catch {}
}
function clearRecoverDisabled() {
  try { localStorage.removeItem(RECOVER_DISABLED_KEY); } catch {}
}