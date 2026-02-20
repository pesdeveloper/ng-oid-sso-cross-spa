import { OpenIdConfiguration } from "angular-auth-oidc-client";

export interface AuthSessionState {
  isAuthenticated: boolean;
  config: OpenIdConfiguration | null;

  // tokens + payloads
  accessToken: string;
  accessPayload: any | null;

  idToken: string;
  idPayload: any | null;

  // userinfo
  userInfo: any | null;
  userInfoLoadedAt: Date | null;
}