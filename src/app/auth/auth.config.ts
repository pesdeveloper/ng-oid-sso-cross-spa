import { LogLevel, PassedInitialConfig } from 'angular-auth-oidc-client';
import { environment } from '../../environments/environment.prod';

export const authConfig: PassedInitialConfig = {
  config: {
            //authority: 'https://idp.malvinasargentinas.gob.ar',
            //authority: 'https://sb-idp.malvinasargentinas.gob.ar',
            authority: environment.authConfig.authority,
            issValidationOff: true,
            strictIssuerValidationOnWellKnownRetrievalOff: true,
            //redirectUrl: window.location.origin,
            redirectUrl: `${window.location.origin}`,
            postLogoutRedirectUri: `${window.location.origin}/logout`,
            
            // clientId: 'js_maspagos_client', //  https://test-spa.malvinasargentinas.gob.ar/
            // scope: 'openid profile email phone offline_access ingresos tramites',
            // postLoginRoute: 'tasas',

            clientId: 'js_bod_hab_client', // https://test-spa-opendata.malvinasargentinas.gob.ar/
            scope: 'openid profile email phone offline_access tramites',
            postLoginRoute: 'habilitaciones',

            responseType: 'code',
            startCheckSession: false,
            silentRenew: false,
            useRefreshToken: true,
            ignoreNonceAfterRefresh: true,
            historyCleanupOff: false,
            triggerRefreshWhenIdTokenExpired: true,
            autoUserInfo: true, 
            renewUserInfoAfterTokenRenew: true,
            silentRenewUrl: `${window.location.origin}/silent-renew.html`,
            renewTimeBeforeTokenExpiresInSeconds: 120,
            logLevel: LogLevel.Debug,
            // 🔑 Muy importante: el interceptor solo agrega el token si la URL empieza con uno de estos prefijos
            secureRoutes: [
              'https://sb-comon-api.malvinasargentinas.gob.ar',
              'https://sb-pagosonline.malvinasargentinas.gob.ar/tasas'
            ],            
        }
}
