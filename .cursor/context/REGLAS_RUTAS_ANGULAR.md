# Reglas obligatorias de rutas e imports Angular para esta app

Estas reglas son obligatorias para cualquier cambio en rutas, imports dinámicos, componentes standalone y navegación dentro de esta app Angular.

## 1. No inventar rutas de archivo

Antes de crear o modificar un import, verificar físicamente dónde existe el archivo real.

No asumir convenciones genéricas como:

src/app/pages/{feature}/{feature}.ts

si el repo no usa esa ubicación para ese componente.

La regla principal es:

- mirar la ubicación real del archivo;
- respetar la estructura existente;
- importar usando el path relativo correcto desde el archivo que importa;
- no mover componentes existentes salvo que el usuario lo pida explícitamente.

## 2. app.routes.ts debe importar según ubicación real

Si una ruta se define dentro de:

src/app/app.routes.ts

entonces el import relativo se calcula desde:

src/app/

Ejemplos correctos existentes:

Para Datos:

loadComponent: () => import('./pages/datos/datos').then(m => m.Datos)

porque el archivo real es:

src/app/pages/datos/datos.ts

Para Habilitaciones:

loadComponent: () => import('./habilitaciones').then(m => m.Habilitaciones)

porque el archivo real es:

src/app/habilitaciones.ts

## 3. Regla obligatoria para Habilitaciones

El componente Habilitaciones vive directamente bajo:

src/app/habilitaciones.ts

Debe exportar:

export class Habilitaciones

Las rutas correctas son:

{
  path: 'habilitaciones',
  loadComponent: () => import('./habilitaciones').then(m => m.Habilitaciones),
  canMatch: [ShieldGuard],
},
{
  path: 'habilitaciones/:valueId',
  loadComponent: () => import('./habilitaciones').then(m => m.Habilitaciones),
  canMatch: [ShieldGuard],
},

Está prohibido usar para Habilitaciones:

import('./pages/habilitaciones/habilitaciones')

Está prohibido crear o mover Habilitaciones a:

src/app/pages/habilitaciones/
src/app/pages/habilitaciones/habilitaciones.ts

salvo que el usuario lo pida explícitamente.

## 4. Regla para nuevos componentes de página

Si se crea una nueva página o flujo, antes de decidir su ubicación hay que revisar el patrón actual del repo.

Si el usuario especifica una ubicación concreta, esa ubicación manda.

Si el usuario no especifica ubicación, preferir seguir el patrón existente más cercano.

Pero nunca modificar una ruta existente hacia un path que no existe.

## 5. Regla para imports dinámicos loadComponent

Cada loadComponent debe cumplir estas tres condiciones:

1. El path del import debe existir físicamente.
2. El símbolo exportado debe coincidir exactamente con el .then(m => m.Nombre).
3. El componente importado debe ser standalone.

Ejemplo:

Si la ruta dice:

loadComponent: () => import('./habilitaciones').then(m => m.Habilitaciones)

entonces debe existir:

src/app/habilitaciones.ts

Y dentro debe existir:

export class Habilitaciones

Si la ruta dice:

loadComponent: () => import('./pages/datos/datos').then(m => m.Datos)

entonces debe existir:

src/app/pages/datos/datos.ts

Y dentro debe existir:

export class Datos

## 6. No normalizar nombres automáticamente

No cambiar nombres de clases, archivos o paths para “mejorar” la estructura.

No cambiar:

Habilitaciones

por:

HabilitacionesComponent

si las rutas o el repo esperan:

Habilitaciones

No cambiar:

src/app/habilitaciones.ts

por:

src/app/pages/habilitaciones/habilitaciones.ts

No cambiar:

import('./habilitaciones')

por:

import('./pages/habilitaciones/habilitaciones')

## 7. Regla para RouterLink y navegación por código

Si se usa routerLink en un componente standalone, verificar que RouterLink esté importado desde @angular/router en el array imports del componente.

Si hay duda, preferir navegación por método:

inyectar Router desde @angular/router;

crear un método que llame a:

this.router.navigate(['/habilitaciones'])

Para el botón “Flujo Habilitaciones”, la navegación esperada es:

/habilitaciones

## 8. Regla para guards

No quitar guards existentes sin autorización.

Las rutas protegidas deben mantener el guard existente si el flujo requiere usuario autenticado.

Para Habilitaciones, mantener:

canMatch: [ShieldGuard]

en ambas rutas:

/habilitaciones
/habilitaciones/:valueId

## 9. Regla para rutas de retorno

La ruta base de inicio de flujo es:

/habilitaciones

La ruta de retorno desde MASPagos es:

/habilitaciones/:valueId

Ambas rutas deben apuntar al mismo componente:

import('./habilitaciones').then(m => m.Habilitaciones)

## 10. Verificación obligatoria antes de finalizar

Antes de terminar cualquier cambio de rutas/imports:

- verificar que no haya imports a archivos inexistentes;
- verificar que app.routes.ts compile;
- verificar que cada loadComponent apunte a un archivo real;
- verificar que cada .then(m => m.X) use un export real;
- no modificar documentación salvo que el usuario lo pida;
- no modificar archivos .md durante slices de código, salvo instrucción explícita.

## 11. Regla para documentación versus código

Cuando el usuario pida cambiar comportamiento de la app, modificar código bajo:

src/app/

No responder modificando solo documentación.

No modificar:

docs/
.gemini-context/
README*
EJEMPLO_COMPLETO.md
archivos .md

salvo que el usuario pida explícitamente crear o actualizar documentación.

## 12. Regla crítica resumida

Para Habilitaciones:

Archivo real:

src/app/habilitaciones.ts

Export real esperado:

export class Habilitaciones

Import correcto desde app.routes.ts:

import('./habilitaciones').then(m => m.Habilitaciones)

Import prohibido:

import('./pages/habilitaciones/habilitaciones')
