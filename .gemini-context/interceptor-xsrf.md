# Interceptor: XsrfCrossSiteInterceptor

**Path**: `src/app/auth/xsrf-cross-site.interceptor.ts`

## Description
Interceptor HTTP funcional diseñado para manejar tokens anti-falsificación (XSRF/CSRF) en escenarios de autenticación cross-site con el Identity Provider (IdP).

## Problem Solved
Angular maneja automáticamente XSRF para el mismo dominio, pero cuando la SPA y el IdP están en orígenes diferentes (e.g., `localhost:4200` vs `localhost:5141`), el mecanismo estándar puede no enviar el token o la cookie necesaria. Este interceptor asegura que las peticiones "inseguras" (POST, PUT, DELETE, etc.) hacia el IdP incluyan las credenciales y cabeceras correctas.

## Logic Flow
1.  **Filter**: Intercepta solo peticiones con métodos inseguros (`POST`, `PUT`, `PATCH`, `DELETE`).
2.  **Target Check**: Verifica si la petición está dirigida al origen del IdP (`https://localhost:5141`).
3.  **Credential Injection**:
    -   Asegura que `withCredentials: true` esté establecido en la request para enviar cookies cross-site.
4.  **Header Injection**:
    -   Busca manualmente la cookie `XSRF-TOKEN`.
    -   Si la header `X-XSRF-TOKEN` no está presente en la request original, la inyecta con el valor leído de la cookie.

## Dependencies
- `HttpInterceptorFn`: Función interceptora de Angular (modern functional interceptor).
- `document.cookie`: Acceso directo para leer el token XSRF.
