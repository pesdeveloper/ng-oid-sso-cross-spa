# Prompt de continuidad — Angular BOD / Habilitaciones / Cementerio / Cuenta Corriente / RC / PDF

## Contexto general

Estamos trabajando en el frontend Angular standalone `ng-oid-sso-cross-spa-main`, usado para pruebas reales de IDP/SSO/BOD/MASPagos.

La app usa:

- Angular standalone.
- `angular-auth-oidc-client`.
- Cliente IDP municipal: `js_bod_hab_client`.
- Guard/custom session guard: `mma-sso-session-guard`.
- BOD API sandbox:
  `https://sb-bod-api.malvinasargentinas.gob.ar`
- IDP sandbox:
  `https://sb-idp.malvinasargentinas.gob.ar/`

El objetivo de esta etapa fue dejar una app Angular operativa para probar flujos BOD reales:

1. Habilitaciones.
2. Cementerio.
3. Cuenta corriente genérica BOD.
4. Generación de RC desde comprobantes seleccionados.
5. Link a MASPagos.
6. Descarga de PDF del RC.
7. Reutilización del mismo componente de cuenta para distintos destinos.

No usamos Cursor para backend .NET 9. Para backend .NET 9, Byte/ChatGPT genera archivos completos o ZIP descargables, y Pablo integra manualmente. Para Angular sí usamos Cursor con prompts chicos y reglas estrictas.

---

## Regla de trabajo

### Backend .NET 9

No usar Cursor.

Modo correcto:

- Byte genera archivo completo copy-paste o ZIP.
- Pablo integra manualmente.
- Pablo compila/testea.
- Si falla, Pablo pasa error/log/request/response.
- Byte corrige quirúrgicamente.

### Angular

Sí usamos Cursor.

Modo correcto:

1. Prompt chico.
2. Revisar diff.
3. `npm run build`.
4. Probar flujo manual.
5. Commit manual.
6. Siguiente slice.

---

## Reglas críticas Angular

No tocar auth salvo slice explícito de auth.

No tocar salvo pedido explícito:

- `src/app/auth/*`
- `auth.config.ts`
- `app.config.ts`
- guards
- `mma-sso-session-guard`
- `clientId`
- `authority`
- `scope`
- `redirectUri`
- silent renew / refresh token
- storage
- callback handling

Toda pantalla interna nueva debe tener acción visible:

- `Volver al inicio`

Los paneles técnicos de auth/debug:

- access token
- id token
- user info
- decoded tokens
- configuration loaded
- claims

deben mostrarse **solo en Home** y **solo si hay sesión iniciada**.

Después de logout no debe quedar visible ningún panel técnico vacío.

---

## Estado funcional Angular actual

### Home

La Home funciona como tablero BOD.

Debe tener accesos a:

- Flujo Habilitaciones.
- Consultar cuenta corriente BOD.
- Consultar por ValueId.
- Consultar por Id_Bie.
- Flujo Cementerio.
- Cementerio por ValueId.
- Cementerio por Id_Bie.

Con sesión iniciada:

- Muestra tablero BOD.
- Puede mostrar debug auth técnico.

Sin sesión:

- Muestra app bar con login.
- Puede mostrar mensaje “Iniciá sesión para acceder a los flujos BOD.”
- No muestra paneles técnicos vacíos.

---

## Rutas Angular relevantes

### Habilitaciones

```txt
/habilitaciones
```

Flujo real:

1. Generar datos mock.
2. Alta comercio/persona en BOD.
3. Emisión tasa Habilitaciones.
4. Ver cuenta corriente.
5. Link MASPagos del flujo principal.
6. Cuenta corriente / RC / PDF / MASPagos vía `/bod/cuenta`.

La ruta vieja de cuenta de habilitaciones sigue funcionando por compatibilidad:

```txt
/habilitaciones/cuenta
/habilitaciones/cuenta/:idSuj/:idBie
```

pero internamente la pantalla genérica es:

```txt
/bod/cuenta
/bod/cuenta/:idSuj/:idBie
```

### BOD Cuenta genérica

```txt
/bod/cuenta
/bod/cuenta/:idSuj/:idBie
```

Esta pantalla reemplaza conceptualmente a `HabilitacionesCuenta`.

Componente actual esperado:

```txt
src/app/bod-cuenta.ts
src/app/bod-cuenta.html
src/app/bod-cuenta.scss
```

Nombre de clase:

```ts
export class BodCuenta
```

Soporta:

- Consulta por destino + idBie.
- Consulta por destino + valueId.
- Referencias por destino + valueId.
- Cuentas relacionadas.
- Comprobantes relacionados.
- Tabla operativa de comprobantes.
- Selección de comprobantes pagables.
- Generación de RC.
- Link MASPagos.
- Descarga PDF del RC.
- JSON técnico.
- returnTo para volver al flujo origen.

Destinos soportados por BOD.Cuentas:

```txt
habilitaciones
faltas
cementerio
```

### Cementerio

```txt
/cementerio
```

Flujo actual esperado:

1. Preparar caso demo cementerio.
2. Crear registro Cementerio real en BOD.
3. Emitir tasa Cementerio real.
4. Navegar a `/bod/cuenta` con destino `cementerio`.
5. Reutilizar cuenta corriente genérica:
   - consultar cuenta
   - seleccionar comprobante
   - generar RC
   - descargar PDF
   - continuar a MASPagos.

---

## Endpoints BOD API usados por Angular

### BOD.Cuentas

```http
GET /api/bod/cuentas/{destino}/{idBie}/cc
GET /api/bod/cuentas/{destino}/{valueId}/cc
GET /api/bod/cuentas/{destino}/{valueId}/refs
POST /api/bod/cuentas/{destino}/cc
POST /api/bod/cuentas/{destino}/{valueId}/rc
GET /api/bod/cuentas/{destino}/{valueId}/rc/{cmte}/{pref}/{nro}/pdf
```

Valores válidos documentados de `destino`:

```txt
habilitaciones
faltas
cementerio
```

### Habilitaciones

```http
POST /api/bod/habilitaciones/comercios
POST /api/bod/emitir/HABILITACIONES/2/{idBie}
```

Habilitaciones comercio usa:

```txt
id_Suj = 2
destino cuenta = habilitaciones
```

### Cementerio

```http
POST /api/bod/cementerio/registros
POST /api/bod/cementerio/cuentas/{idBie}/emisiones
```

Cementerio usa:

```txt
destino cuenta = cementerio
id_Suj cementerio esperado = 18
```

---

## Backend implementado en BOD API

Se agregó en backend BOD API:

```http
POST /api/bod/cuentas/{destino}/{valueId}/rc
```

Este endpoint:

- Valida destino.
- Valida valueId.
- Valida id_Suj / id_Bie.
- Valida que la cuenta esté relacionada al valueId.
- Valida que el comprobante EM esté relacionado al valueId.
- Genera RC usando `ICC_RcService.BuildCancelacionAndSaveAsync(...)`.
- Devuelve RC generado.
- Devuelve `Link_To_MasPagos`.

Response esperado:

```json
{
  "ok": true,
  "data": {
    "valueId": "CEM-DEMO-20260517-085534",
    "id_Suj": 18,
    "id_Bie": 123456,
    "rc": {
      "cmte": "RC",
      "pref": 4,
      "nro": 76331
    },
    "Link_To_MasPagos": "https://..."
  },
  "error": null
}
```

Regla física importante:

```txt
cccmte_refers → Persona / Cuenta / EM del trámite
cccmte_pp     → RC / prepago
```

Los RC **NO** deben insertarse en `cccmte_refers`.

Esto fue confirmado por FK:

```sql
foreign key (cmte, pref, nro)
references cccmte (cmte, pref, nro)
```

Como los RC viven en `cccmte_pp`, intentar insertar `RC` en `cccmte_refers` falla.

El test backend corregido valida:

- el endpoint `/rc` genera RC OK.
- devuelve `Link_To_MasPagos`.
- el EM origen sigue referenciado al valueId.
- el RC no aparece en `/refs`.

---

## Backend PDF RC

Se agregó endpoint:

```http
GET /api/bod/cuentas/{destino}/{valueId}/rc/{cmte}/{pref}/{nro}/pdf
```

Ejemplo:

```http
GET /api/bod/cuentas/cementerio/CEM-DEMO-20260517-085534/rc/RC/4/76331/pdf
```

Regla correcta de validación PDF:

- El RC vive en `cccmte_pp`.
- El RC no se busca en `cccmte_refers`.
- Para validar seguridad/trazabilidad:
  - cargar RC desde `ICC_PrepagoService.GetRcAsync(...)`.
  - obtener `id_Suj` / `id_Bie` del RC.
  - verificar que la cuenta del RC esté referenciada al `destino + valueId`.
  - generar PDF con `ICmtePdfRenderService`.

No validar:

```txt
RC en refs
```

Tampoco depender obligatoriamente de:

```txt
EM origen en refs
```

porque la validación fuerte suficiente para este endpoint es:

```txt
RC existente en cccmte_pp
+
Cuenta del RC vinculada al valueId
```

En `Program.cs` BOD API debe existir:

```csharp
app.MapCuentasRcEndpoints(enabled: true);
app.MapCuentasRcPdfEndpoints(enabled: true);
```

También debe estar registrado PDF services:

```csharp
using Malvinas.Pdf.Services.DependencyInjection;

builder.Services
    .AddMalvinasDataServices(builder.Configuration)
    .AddCalculo()
    .AddCcuentaCorriente()
    .AddPdfServices();
```

Y el proyecto BOD API debe referenciar `Malvinas.Pdf.Services`.

---

## Angular BOD Cuenta — generación RC

En `BodCuenta`, para generar RC se necesita:

```txt
currentDestino
currentValueId
currentIdSuj
currentIdBie
selectedComprobantes()
```

El request Angular al backend:

```json
{
  "id_Suj": 18,
  "id_Bie": 123456,
  "returnUrl": "https://localhost:4205/bod/cuenta/18/123456?destino=cementerio&valueId=CEM-DEMO-...",
  "cmtes": [
    {
      "cmte": "EM",
      "pref": 17,
      "nro": 5188845
    }
  ]
}
```

Al generar RC:

- mostrar `RC-pref-nro`.
- mostrar `Link_To_MasPagos`.
- mostrar botón `Continuar a MASPagos`.
- mostrar botón `Descargar PDF del RC`.
- mantener JSON técnico.

Para MASPagos:

```ts
window.location.href = rcLinkToMasPagos;
```

No usar `window.open`.

---

## Angular BOD Cuenta — descarga PDF

Método esperado en `BodApiService`:

```ts
descargarRcPdf(
  destino: BodCuentaDestino,
  valueId: string,
  cmte: string,
  pref: number,
  nro: number
): Observable<Blob> {
  return this.http.get(
    `${this.baseUrl}/api/bod/cuentas/${destino}/${encodeURIComponent(valueId)}/rc/${encodeURIComponent(cmte)}/${pref}/${nro}/pdf`,
    { responseType: 'blob' }
  );
}
```

La llamada de Angular ya fue verificada con Bearer:

```txt
'https://sb-bod-api.malvinasargentinas.gob.ar/api/bod/cuentas/cementerio/.../pdf'
matches configured route
adding token
```

Si devuelve 404, no es auth.

Posibles causas:

- endpoint PDF no desplegado.
- validación backend PDF demasiado estricta.
- RC no existe en `cccmte_pp`.
- cuenta del RC no está referenciada al valueId.

La validación backend fue corregida conceptualmente para validar por cuenta, no por RC en refs.

---

## Cementerio — estado y problemas resueltos

### Problema 1: enum `SepulturaONicho`

Error original:

```txt
The JSON value could not be converted to Malvinas.Data.Models.Enums.SepulturaONicho.
Path: $.registro.sepulturaONicho
```

Causa:

Angular enviaba abreviaturas o números inválidos como:

```json
"sepulturaONicho": "S"
```

o:

```json
"sepulturaONicho": 0
```

Corrección:

Enviar nombres de enum válidos:

```json
{
  "tipoDeFallecido": "Restos",
  "claseFallecido": "Normal",
  "sepulturaONicho": "Sepultura",
  "tipoDocumento": "DNI",
  "sexo": "Masculino"
}
```

No enviar abreviaturas.

### Problema 2: DB2 error en `CemRegistroFallecidoStore`

Después de corregir JSON, si aparece:

```txt
400: 3) Malvinas.Bod.Infra.Stores.CemRegistroFallecidoStore.WithConnection() DB2 error
```

ya no es error de JSON. Es insert Informix.

Revisar request body exacto y comparar contra longitudes/obligatorios de `cem_registrofallecido`.

Medidas defensivas Angular:

- truncar textos:
  - ubicacion max 36
  - sec max 10
  - mza max 10
  - tbl max 10
  - sepultura max 10
  - macizo max 10
  - fila max 10
  - nicho max 10
  - apellido max 35
  - nombre max 35
- enviar enums como nombres reales.

---

## Angular auth / secureRoutes

Para que Angular adjunte Bearer a BOD API, `auth.config.ts` debe tener:

```ts
secureRoutes: [
  environment.apis.bodBaseUrl
]
```

El log confirmó:

```txt
matches configured route
adding token
```

Para refresh token automático sin iframe:

```ts
silentRenew: true,
useRefreshToken: true,
renewTimeBeforeTokenExpiresInSeconds: 60
```

No usar:

```ts
silentRenewUrl
silent-renew.html
```

Para que haya refresh token, el cliente IDP debe permitir `offline_access` y el scope debe incluirlo si corresponde.

---

## Último ajuste pendiente antes de deploy

La Home debe ocultar paneles técnicos de auth cuando no hay sesión.

Después de logout:

- no mostrar access token vacío.
- no mostrar id token vacío.
- no mostrar user info vacío.
- no mostrar decoded tokens.
- no mostrar configuration loaded vacío.
- no mostrar claims vacíos.

Solo mostrar:

- app bar con login.
- mensaje simple “Iniciá sesión para acceder a los flujos BOD.”

Con sesión iniciada:

- mostrar tablero BOD.
- mostrar debug auth si ya existía.

---

## Checklist de pruebas antes de deploy sandbox

### Habilitaciones

```txt
/habilitaciones
→ Generar datos mock
→ Enviar alta
→ Emitir tasa
→ Ver cuenta corriente
→ seleccionar EM
→ Generar RC
→ Descargar PDF
→ Continuar MASPagos
```

### Cuenta manual por valueId

```txt
/bod/cuenta?destino=habilitaciones&modo=valueId
→ ingresar valueId
→ consultar cuenta
→ consultar referencias
→ elegir cuenta si hace falta
→ seleccionar EM
→ generar RC
→ descargar PDF
```

### Cementerio

```txt
/cementerio
→ Preparar caso demo
→ Crear registro Cementerio
→ Emitir tasa Cementerio
→ Ver cuenta por valueId o idBie
→ seleccionar EM
→ generar RC
→ descargar PDF
→ continuar MASPagos
```

### Logout

```txt
login
→ Home muestra tablero + debug auth
logout
→ Home limpia, sin paneles técnicos vacíos
login de nuevo
→ Home vuelve a mostrar tablero
```

---

## Próximos pasos posibles

1. Cerrar bug PDF de Cementerio si vuelve a aparecer 404.
   - Revisar backend `CuentasRcPdfEndpoints`.
   - Validar por cuenta del RC asociada al valueId.
   - No validar RC en refs.

2. Terminar UX de Cementerio si falta:
   - mostrar mejor datos del registro.
   - mejorar formulario.
   - selector real de tasas.
   - cocherías/servicio fúnebre en otro slice.

3. Deploy sandbox final:
   - BOD API actualizado.
   - Angular actualizado.
   - IDP scopes/secure routes OK.
   - PdfServices configurado.
   - Probar Habilitaciones + Cementerio punta a punta.

---

## Frases clave para retomar

- Backend .NET 9 no se trabaja con Cursor.
- Angular sí se trabaja con Cursor.
- BOD Cuenta es genérica y vive en `/bod/cuenta`.
- Las rutas viejas `/habilitaciones/cuenta` deben seguir funcionando.
- Los RC no se insertan en `cccmte_refers`.
- Los RC viven en `cccmte_pp`.
- Para PDF RC validar cuenta del RC relacionada al `valueId`.
- Para generar RC se necesita `destino + valueId + id_Suj + id_Bie + cmtes`.
- `id_Des` no es cuenta.
- `id_Bie` es la cuenta.
- `valueId` es el trámite/correlativo BOD.
