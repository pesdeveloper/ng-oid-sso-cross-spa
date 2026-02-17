# SSO Angular IDP

- Para ejecutar en desarrollo
$env:NODE_NO_WARNINGS="1" ; cls ; ng serve --host=127.0.0.1 --ssl --port 4205 --hmr

- Build e la libreria
ng build mma-sso-session-guard

- Para poder modificar la libreria y que la aplicacion en dev vea los cambios correr en una terminal aparte o pestaña 
ng build mma-sso-session-guard --watch

esto hace que cuando se cambie algo en la lib se actualice la app en dev mode.

- Comando para generar la libreria y cada vez que se modifica antes de distribuirla
npm run dist:mma

- Instalacion de la libreria en un proyecto local 
npm install S:\Source\NET\tokenserver.angular\ng-libs-local\mma-sso-session-guard-1.0.0.tgz



