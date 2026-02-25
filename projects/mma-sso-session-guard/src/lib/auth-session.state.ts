import { OpenIdConfiguration } from 'angular-auth-oidc-client';

export interface AuthSessionState {
  isAuthenticated: boolean;
  config: OpenIdConfiguration | null;

  accessToken: string;
  accessPayload: any | null;

  idToken: string;
  idPayload: any | null;

  userInfo: any | null;
  userInfoLoadedAt: Date | null;
}