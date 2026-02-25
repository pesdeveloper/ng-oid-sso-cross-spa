import { LogLevel, PassedInitialConfig } from 'angular-auth-oidc-client';
import { environment } from '../../environments/environment';

export const authConfig: PassedInitialConfig = {
  config: {
            authority: environment.authConfig.authority,
            issValidationOff: true,
            strictIssuerValidationOnWellKnownRetrievalOff: true,
            redirectUrl: `${window.location.origin}`,
            postLogoutRedirectUri: `${window.location.origin}/logout`,
            
            clientId: 'js_bod_hab_client',
            scope: 'openid profile email phone offline_access tramites',
            postLoginRoute: '/',

            responseType: 'code',
            startCheckSession: false,
            silentRenew: false,
            useRefreshToken: true,
            ignoreNonceAfterRefresh: true,
            historyCleanupOff: false,
            triggerRefreshWhenIdTokenExpired: true,
            autoUserInfo: true, 
            renewUserInfoAfterTokenRenew: true,
            //silentRenewUrl: `${window.location.origin}/silent-renew.html`,
            renewTimeBeforeTokenExpiresInSeconds: 120,
            logLevel: LogLevel.Debug,
            // 🔑 Muy importante: el interceptor solo agrega el token si la URL empieza con uno de estos prefijos
            // secureRoutes: [
            // ],            
        }
}
