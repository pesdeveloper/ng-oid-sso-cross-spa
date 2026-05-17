# BOD API real para app Angular de prueba

Este documento es contexto operativo para implementar la integración Angular contra BOD API **sin crear endpoints demo ni mock en backend**. Cursor debe usarlo como fuente de verdad de endpoints y payloads.

La app Angular debe consumir las APIs reales existentes de `Malvinas.Bod.Api` usando Bearer token del login IDP.

## Instrucción fija para Cursor

Usar al inicio de cada slice si se trabaja en modo agente:

```txt
Trabajá sobre el repo local abierto en Cursor. Hacé cambios chicos, revisables y limitados al slice pedido. No toques autenticación, rutas no relacionadas ni documentación salvo instrucción explícita. Si hay ambigüedad, elegí la opción más conservadora y resumila al final.
```

## Reglas generales Angular

- No crear endpoints backend nuevos.
- No crear endpoints especiales de demo.
- Consumir BOD API real.
- Usar `Authorization: Bearer` mediante `authInterceptor()` de `angular-auth-oidc-client`.
- Configurar `secureRoutes` con la base URL de BOD API para que el interceptor adjunte el token.
- No hardcodear URLs dentro de servicios Angular.
- Usar `environment.apis.bodBaseUrl`.
- Usar `environment.externalSites.defaultReturnUrl` para enviar `returnUrl` en las emisiones.
- El `returnUrl` de test/dev debe ser exactamente:

```txt
https://test-spa-opendata.malvinasargentinas.gob.ar
```

- El botón para ir a MASPagos **no debe abrir pestaña nueva**. Debe navegar en la misma pestaña:

```ts
window.location.href = linkToMasPagos;
```

## Configuración esperada en Angular

Agregar, si no existe:

```ts
export const environment = {
  // ...config existente...
  apis: {
    bodBaseUrl: 'https://sb-bod-api.malvinasargentinas.gob.ar'
  },
  externalSites: {
    // ...valores existentes...
    defaultReturnUrl: 'https://test-spa-opendata.malvinasargentinas.gob.ar'
  }
};
```

En `auth.config.ts`, agregar `secureRoutes` apuntando a BOD API:

```ts
secureRoutes: [environment.apis.bodBaseUrl]
```

No tocar el flujo OIDC/SSO existente ni `mma-sso-session-guard` salvo que sea estrictamente necesario.

---

# Endpoints principales

## 1. Habilitaciones: alta comercio/persona

### Endpoint

```http
POST /api/bod/habilitaciones/comercios
```

### URL Angular

```ts
`${environment.apis.bodBaseUrl}/api/bod/habilitaciones/comercios`
```

### Qué hace

Crea una cuenta de Comercio/Habilitaciones:

```txt
Id_Suj = 2
Id_Bie = generado por BOD
```

Puede crear una persona nueva si `id_Per = 0` y se envía `datos_persona`.

### Request mock mínimo recomendado para Angular

> Nota: `id_Bie_Inm` debe ser un inmueble real existente en el ambiente. Para pruebas actuales se venía usando `195796`.

```json
{
  "valueId": "HAB-DEMO-20260517-000001",
  "fecha": "2026-05-17T00:00:00",
  "id_Rub": 198,
  "nomFantacia": "COMERCIO DEMO ANGULAR",
  "fechaIniAct": "2026-05-17T00:00:00",
  "calleYnro": "ALDEA CATALINA 589",
  "eCalle1": "BROWN, ALMIRANTE",
  "eCalle2": "LYNCH, BENITO",
  "pisoDpto": "PB",
  "galeria": null,
  "localGaleria": null,
  "id_Pais": 32,
  "id_Pvc": "BA",
  "mts2Superf": 80.0,
  "zonificacion": 0,
  "tcontribMun": 0,
  "si_Mayorista": false,
  "si_Deposito": false,
  "si_Tasa_Especial": false,
  "ingBr": "30-12345678-9",
  "cantSocios": 1,
  "cantEmpleados": 2,
  "estadoHabilit": "T",
  "tipo": "C",
  "id_Bie_Inm": 195796,
  "id_Per": 0,
  "datos_persona": {
    "razonSocial": "PERSONA DEMO ANGULAR",
    "tipoPersona": "Juridica",
    "tipoDocumento": "CUIT",
    "prefCUIT": 30,
    "nroDocumento": 30123456,
    "fechaNac": "1990-01-01T00:00:00",
    "id_Pais": 32,
    "estadoCivil": "Soltero",
    "sexo": "Masculino",
    "profesion": "Comerciante",
    "estadoDocumento": "Documentado",
    "email1": "demo.angular@correo.com",
    "email2": null,
    "webPage": null,
    "nroPuerta": 589,
    "calleYNro": "ALDEA CATALINA 589",
    "pisoDpto": "PB",
    "eCalle1": "BROWN, ALMIRANTE",
    "eCalle2": "LYNCH, BENITO",
    "localidad": "GRAND BOURG",
    "cp": 1615,
    "tel1": "11-4444-4444",
    "tel2": null,
    "id_Dom": 0
  }
}
```

### Response útil

El endpoint devuelve un `ComercioDto`. Campos importantes para Angular:

```json
{
  "id_Suj": 2,
  "id_Bie": 997485,
  "id_Des": 972673,
  "nomFantacia": "COMERCIO DEMO ANGULAR",
  "id_Rub": 198,
  "rub_Deno": "...",
  "calleYnro": "...",
  "domicilioDelBienAsString": "..."
}
```

Guardar:

```txt
id_Suj = response.id_Suj
id_Bie = response.id_Bie
id_Des = response.id_Des
valueId = el mismo usado en el request
```

---

## 2. Habilitaciones: emisión de tasas

### Endpoint genérico

```http
POST /api/bod/emitir/HABILITACIONES/{idSuj}/{idBie}
```

Para comercio:

```txt
idSuj = 2
idBie = id_Bie devuelto por alta comercio
```

### URL Angular

```ts
`${environment.apis.bodBaseUrl}/api/bod/emitir/HABILITACIONES/2/${idBie}`
```

### Request recomendado

```json
{
  "valueId": "HAB-DEMO-20260517-000001",
  "fecha": "2026-05-17T00:00:00",
  "generarQr": true,
  "returnUrl": "https://test-spa-opendata.malvinasargentinas.gob.ar",
  "tasas": [
    { "id_Tri": 72, "id_Tas": 3, "importe": 10000 },
    { "id_Tri": 72, "id_Tas": 4 },
    { "id_Tri": 72, "id_Tas": 5, "importe": 5000 },
    { "id_Tri": 72, "id_Tas": 6 },
    { "id_Tri": 72, "id_Tas": 7 },
    { "id_Tri": 72, "id_Tas": 8 },
    { "id_Tri": 72, "id_Tas": 9 }
  ]
}
```

### Response útil

```json
{
  "ok": true,
  "data": {
    "id_Suj": 2,
    "id_Bie": 997485,
    "cmte_Rc": "RC",
    "pref_Rc": 4,
    "nro_Rc": 76285,
    "id_Cmte_Rc": 16,
    "iVto1": 127800,
    "fVto1": "2026-05-30T00:00:00",
    "iVto2": 130356,
    "fVto2": "2026-06-05T00:00:00",
    "cmtes_Em": [
      {
        "cmte": "EM",
        "pref": 17,
        "nro": 5188826,
        "iVto1": 127800,
        "fVto1": "2026-05-30T00:00:00"
      }
    ],
    "qrPayload": "...",
    "mensaje": "Emisión OK (HABILITACIONES)",
    "Link_To_MasPagos": "https://localhost:4201/checkout-external/hab/2/997485?rec=RC,4,76285,EM,17,5188826&return_url=https%3A%2F%2Ftest-spa-opendata.malvinasargentinas.gob.ar"
  }
}
```

Campo importante:

```txt
response.data.Link_To_MasPagos
```

Regla del link Habilitaciones:

```txt
/checkout-external/hab/2/{idBieComercio}
```

---

## 3. Habilitaciones: resumen cuenta corriente

### Endpoint

```http
GET /api/bod/cuentas/HABILITACIONES/{idBie}/cc
```

### URL Angular

```ts
`${environment.apis.bodBaseUrl}/api/bod/cuentas/HABILITACIONES/${idBie}/cc`
```

### Uso

Luego de emitir tasas, consultar CC para mostrar resumen.

### Response orientativa

El contrato exacto viene de servicios de cuenta corriente. Angular no debe sobre-modelar todo. Usar `unknown`/modelo parcial para los campos visibles.

Campos esperables:

```json
{
  "sven_Total": 0,
  "saven_Total": 127800,
  "sbloq_Total": 0,
  "conceptos": [
    {
      "tipo": "...",
      "tipoDeno": "...",
      "sven_Total": 0,
      "saven_Total": 127800,
      "sbloq_Total": 0,
      "cmtes": [
        {
          "c_CmteO": "EM",
          "c_PrefO": 17,
          "c_NroO": 5188826,
          "saldo_Total": 127800,
          "siSeleccionable": true,
          "conPagoPendiente": false
        }
      ]
    }
  ]
}
```

---

# Cementerio

## Reglas funcionales

### Cementerio común / fallecido

Se crea y emite contra:

```txt
Id_Suj = 18
Id_Bie = id_Bie del registro Cementerio/fallecido
```

Link MASPagos esperado:

```txt
/checkout-external/cem/18/{idBieFallecido}
```

### Servicio Fúnebre / Cochería

Aunque nace desde Cementerio, se emite contra cuenta Comercio/Cochería:

```txt
Id_Suj = 2
Id_Bie = id_Bie de la cochería
```

Link MASPagos esperado:

```txt
/checkout-external/hab/2/{idBieCocheria}
```

Esto es correcto y no debe cambiarse.

---

## 4. Cementerio: alta registro fallecido

### Endpoint

```http
POST /api/bod/cementerio/registros
```

### URL Angular

```ts
`${environment.apis.bodBaseUrl}/api/bod/cementerio/registros`
```

### Request mock recomendado

```json
{
  "valueId": "CEM-DEMO-20260517-000001",
  "fecha": "2026-05-17T00:00:00",
  "titular": {
    "valueId": "CEM-DEMO-20260517-000001-TIT",
    "id_Per": 0,
    "datos_persona": {
      "razonSocial": "TITULAR CEMENTERIO DEMO",
      "tipoPersona": "Fisica",
      "tipoDocumento": "DNI",
      "nroDocumento": 30123456,
      "fechaNac": "1970-01-01T00:00:00",
      "id_Pais": 32,
      "estadoCivil": "Soltero",
      "sexo": "Masculino",
      "profesion": "No informa",
      "estadoDocumento": "Documentado",
      "email1": "cementerio.demo@correo.com",
      "email2": null,
      "webPage": null,
      "nroPuerta": 123,
      "calleYNro": "CALLE CEMENTERIO 123",
      "pisoDpto": null,
      "eCalle1": "ENTRE 1",
      "eCalle2": "Y 2",
      "localidad": "GRAND BOURG",
      "cp": 1615,
      "tel1": "11-4444-4444",
      "tel2": null,
      "id_Dom": 0
    }
  },
  "destinatario": {
    "esMismaPersonaQueTitular": true,
    "persona": null
  },
  "registro": {
    "tipoDeFallecido": "Restos",
    "claseFallecido": "Normal",
    "ubicacion": "SECTOR A TEST",
    "sepulturaONicho": "Sepultura",
    "sec": "A",
    "mza": "01",
    "tbl": "T1",
    "sepultura": "0001",
    "macizo": "M1",
    "fila": "F1",
    "nicho": null,
    "apellido": "FALLECIDO_DEMO",
    "nombre": "ANGULAR_TEST",
    "tipoDocumento": "DNI",
    "nroDocumento": 12345678,
    "edad": 80,
    "siAdulto": true,
    "sexo": "Masculino",
    "siNativo": true,
    "siDePartido": true,
    "fechaIngreso": "2026-05-17T00:00:00",
    "siTraumatico": false,
    "siNN": false,
    "siIndigente": false,
    "fg_Baja": false,
    "siAlPie": false
  }
}
```

### Response útil

```json
{
  "ok": true,
  "data": {
    "id_Suj": 18,
    "id_Bie": 12345,
    "id_Per_Titular": 965403,
    "id_Des": 965403,
    "valueId": "CEM-DEMO-20260517-000001",
    "registro": { }
  },
  "cuenta": {
    "id_Suj": 18,
    "id_Bie": 12345
  }
}
```

Guardar:

```txt
idBieFallecido = response.cuenta.id_Bie
idSujFallecido = 18
```

---

## 5. Cementerio: emisión común del fallecido

### Endpoint específico

```http
POST /api/bod/cementerio/cuentas/{idBie}/emisiones
```

### URL Angular

```ts
`${environment.apis.bodBaseUrl}/api/bod/cementerio/cuentas/${idBieFallecido}/emisiones`
```

### Request recomendado

```json
{
  "valueId": "CEM-DEMO-20260517-000001",
  "fecha": "2026-05-17T00:00:00",
  "generarQr": true,
  "returnUrl": "https://test-spa-opendata.malvinasargentinas.gob.ar",
  "tasas": [
    { "id_Tri": 76, "id_Tas": 1, "importe": 0 }
  ]
}
```

Este endpoint lee el registro real del fallecido y completa internamente parámetros de cálculo.

### Response útil

```json
{
  "ok": true,
  "data": {
    "id_Suj": 18,
    "id_Bie": 12345,
    "cmte_Rc": "RC",
    "pref_Rc": 4,
    "nro_Rc": 76286,
    "cmtes_Em": [
      { "cmte": "EM", "pref": 17, "nro": 5188827 }
    ],
    "qrPayload": "...",
    "mensaje": "...",
    "Link_To_MasPagos": "https://localhost:4201/checkout-external/cem/18/12345?rec=RC,4,76286,EM,17,5188827&return_url=https%3A%2F%2Ftest-spa-opendata.malvinasargentinas.gob.ar"
  },
  "cuenta": {
    "id_Suj": 18,
    "id_Bie": 12345
  }
}
```

---

## 6. Cementerio: resumen cuenta corriente del fallecido

### Endpoint

```http
GET /api/bod/cuentas/CEMENTERIO/{idBieFallecido}/cc
```

### URL Angular

```ts
`${environment.apis.bodBaseUrl}/api/bod/cuentas/CEMENTERIO/${idBieFallecido}/cc`
```

---

## 7. Cementerio: buscar cocherías disponibles

### Endpoint

```http
GET /api/bod/cementerio/cocherias?q={texto}&skip=0&take=20
```

### URL Angular

```ts
`${environment.apis.bodBaseUrl}/api/bod/cementerio/cocherias?q=${encodeURIComponent(q)}&skip=0&take=20`
```

### Qué devuelve

Lista de comercios/cocherías disponibles. Solo cocherías con:

```txt
id_Rub = 276
```

Campos importantes esperables:

```json
{
  "ok": true,
  "count": 1,
  "data": [
    {
      "id_Suj": 2,
      "id_Bie": 29181,
      "nomFantacia": "CASA OVIEDO",
      "id_Rub": 276
    }
  ]
}
```

Si la forma exacta difiere, Angular debe adaptarse de manera defensiva y usar los campos reales disponibles. Para demo alcanza con obtener `id_Suj` e `id_Bie`.

---

## 8. Cementerio: alta cochería nueva

Usar solo si no se quiere depender de una cochería existente.

### Endpoint

```http
POST /api/bod/cementerio/cocherias
```

### Qué hace

Crea una cuenta Comercio/Cochería. BOD fuerza internamente:

```txt
id_Rub = 276
```

### Request

Es el mismo shape base que alta comercio, pero no hace falta confiar en `id_Rub`; el backend fuerza cochería.

```json
{
  "valueId": "COCH-DEMO-20260517-000001",
  "fecha": "2026-05-17T00:00:00",
  "id_Rub": 276,
  "nomFantacia": "COCHERIA DEMO ANGULAR",
  "fechaIniAct": "2026-05-17T00:00:00",
  "calleYnro": "CALLE COCHERIA 123",
  "eCalle1": "ENTRE 1",
  "eCalle2": "Y 2",
  "pisoDpto": null,
  "galeria": null,
  "localGaleria": null,
  "id_Pais": 32,
  "id_Pvc": "BA",
  "mts2Superf": 80.0,
  "zonificacion": 0,
  "tcontribMun": 0,
  "si_Mayorista": false,
  "si_Deposito": false,
  "si_Tasa_Especial": false,
  "ingBr": "30-87654321-9",
  "cantSocios": 1,
  "cantEmpleados": 2,
  "estadoHabilit": "T",
  "tipo": "C",
  "id_Bie_Inm": 195796,
  "id_Per": 0,
  "datos_persona": {
    "razonSocial": "TITULAR COCHERIA DEMO",
    "tipoPersona": "Juridica",
    "tipoDocumento": "CUIT",
    "prefCUIT": 30,
    "nroDocumento": 30876543,
    "fechaNac": "1990-01-01T00:00:00",
    "id_Pais": 32,
    "estadoCivil": "Soltero",
    "sexo": "Masculino",
    "profesion": "Comerciante",
    "estadoDocumento": "Documentado",
    "email1": "cocheria.demo@correo.com",
    "nroPuerta": 123,
    "calleYNro": "CALLE COCHERIA 123",
    "localidad": "GRAND BOURG",
    "cp": 1615,
    "id_Dom": 0
  }
}
```

### Response útil

Devuelve `ComercioDto`; guardar:

```txt
idSujCocheria = response.id_Suj    // normalmente 2
idBieCocheria = response.id_Bie
```

---

## 9. Cementerio: emisión Servicio Fúnebre contra cochería

### Endpoint

```http
POST /api/bod/cementerio/servicio-funebre/emisiones
```

### URL Angular

```ts
`${environment.apis.bodBaseUrl}/api/bod/cementerio/servicio-funebre/emisiones`
```

### Request recomendado

```json
{
  "valueId": "SF-DEMO-20260517-000001",
  "fecha": "2026-05-17T00:00:00",
  "generarQr": true,
  "returnUrl": "https://test-spa-opendata.malvinasargentinas.gob.ar",
  "id_Suj_Cocheria": 2,
  "id_Bie_Cocheria": 29181,
  "id_Suj_RegistroFallecido": 18,
  "id_Bie_RegistroFallecido": 12345,
  "importe": 0
}
```

Notas:

- `importe = 0` fuerza cálculo por reglas internas con datos del fallecido y cochería.
- Si se quiere importe manual, enviar `importe > 0`.
- El comprobante queda emitido contra la cochería, no contra el fallecido.

### Response útil

```json
{
  "ok": true,
  "data": {
    "id_Suj": 2,
    "id_Bie": 29181,
    "cmte_Rc": "RC",
    "pref_Rc": 4,
    "nro_Rc": 76287,
    "cmtes_Em": [
      { "cmte": "EM", "pref": 17, "nro": 5188828 }
    ],
    "qrPayload": "...",
    "mensaje": "...",
    "Link_To_MasPagos": "https://localhost:4201/checkout-external/hab/2/29181?rec=RC,4,76287,EM,17,5188828&return_url=https%3A%2F%2Ftest-spa-opendata.malvinasargentinas.gob.ar"
  },
  "cuentaCocheria": {
    "id_Suj": 2,
    "id_Bie": 29181
  },
  "registroFallecido": {
    "id_Suj": 18,
    "id_Bie": 12345
  },
  "concepto": "51/33 ..."
}
```

---

## 10. Cementerio: resumen cuenta corriente de cochería

Como Servicio Fúnebre queda emitido contra Comercio/Cochería, consultar CC como Habilitaciones:

```http
GET /api/bod/cuentas/HABILITACIONES/{idBieCocheria}/cc
```

### URL Angular

```ts
`${environment.apis.bodBaseUrl}/api/bod/cuentas/HABILITACIONES/${idBieCocheria}/cc`
```

---

# Modelos TypeScript mínimos sugeridos

No sobre-modelar todo. Para demo alcanza con modelos parciales.

```ts
export interface ApiOk<T> {
  ok: boolean;
  data: T;
  error?: string;
}

export interface ComercioDtoLite {
  id_Suj: number;
  id_Bie: number;
  id_Des?: number;
  nomFantacia?: string;
  id_Rub?: number;
  rub_Deno?: string;
  domicilioDelBienAsString?: string;
}

export interface CmteXDataLite {
  cmte?: string;
  pref?: number;
  nro?: number;
  iVto1?: number;
  fVto1?: string;
  iVto2?: number | null;
  fVto2?: string | null;
}

export interface EmitirTasasResultLite {
  id_Suj: number;
  id_Bie: number;
  cmte_Rc?: string | null;
  pref_Rc?: number | null;
  nro_Rc?: number | null;
  id_Cmte_Rc?: number | null;
  iVto1?: number | null;
  fVto1?: string | null;
  iVto2?: number | null;
  fVto2?: string | null;
  cmtes_Em?: CmteXDataLite[] | null;
  qrPayload?: string | null;
  mensaje?: string | null;
  Link_To_MasPagos?: string | null;
}

export interface CementerioCuentaResponseLite {
  id_Suj: number;
  id_Bie: number;
}

export interface CementerioAltaInicialResponseLite {
  ok: boolean;
  data: {
    id_Suj: number;
    id_Bie: number;
    id_Per_Titular: number;
    id_Des: number;
    valueId: string;
    registro?: unknown;
  };
  cuenta: CementerioCuentaResponseLite;
}

export interface CementerioEmisionResponseLite {
  ok: boolean;
  data: EmitirTasasResultLite;
  cuenta: CementerioCuentaResponseLite;
}

export interface CementerioServicioFunebreResponseLite {
  ok: boolean;
  data: EmitirTasasResultLite;
  cuentaCocheria: CementerioCuentaResponseLite;
  registroFallecido: CementerioCuentaResponseLite;
  concepto?: string;
}

export type CuentaCorrienteResumenLite = unknown;
```

---

# Slice 2 reescrito para Gemini: Service Angular para BOD API real

```txt
Trabajá sobre el repo local abierto en Cursor. Hacé cambios chicos, revisables y limitados al slice pedido. No toques autenticación, rutas no relacionadas ni documentación salvo instrucción explícita. Si hay ambigüedad, elegí la opción más conservadora y resumila al final.

Objetivo:
Crear un service Angular para consumir las APIs reales existentes de BOD API, usando este documento como fuente de verdad de endpoints y contratos.

Reglas:
- No crear endpoints mock.
- No crear endpoints demo.
- No modificar backend.
- No llamar URLs hardcodeadas.
- Usar environment.apis.bodBaseUrl.
- Usar environment.externalSites.defaultReturnUrl para el returnUrl de emisiones.
- Usar HttpClient con inject().
- Mantener modelos mínimos y prácticos.
- No sobre-modelar todo el backend; modelar solo los campos que usa la pantalla.
- El campo del link se llama exactamente Link_To_MasPagos. Respetar ese nombre exacto en TypeScript.
- El botón MASPagos se implementará en otro slice y debe navegar en la misma pestaña.

Crear o actualizar:
- src/app/core/services/bod-api.service.ts
- src/app/core/models/bod-api.models.ts

Métodos mínimos del service:

Habilitaciones:
1. crearComercioHabilitacionesMock(valueId: string): Observable<ComercioDtoLite>
   POST /api/bod/habilitaciones/comercios

2. emitirTasasHabilitaciones(idBie: number, valueId: string): Observable<ApiOk<EmitirTasasResultLite>>
   POST /api/bod/emitir/HABILITACIONES/2/{idBie}

3. getCuentaCorrienteHabilitaciones(idBie: number): Observable<CuentaCorrienteResumenLite>
   GET /api/bod/cuentas/HABILITACIONES/{idBie}/cc

Cementerio:
4. crearRegistroCementerioMock(valueId: string): Observable<CementerioAltaInicialResponseLite>
   POST /api/bod/cementerio/registros

5. emitirTasasCementerio(idBieFallecido: number, valueId: string): Observable<CementerioEmisionResponseLite>
   POST /api/bod/cementerio/cuentas/{idBieFallecido}/emisiones

6. getCuentaCorrienteCementerio(idBieFallecido: number): Observable<CuentaCorrienteResumenLite>
   GET /api/bod/cuentas/CEMENTERIO/{idBieFallecido}/cc

7. buscarCocherias(q: string, skip?: number, take?: number): Observable<unknown>
   GET /api/bod/cementerio/cocherias?q={q}&skip={skip}&take={take}

8. crearCocheriaMock(valueId: string): Observable<ComercioDtoLite>
   POST /api/bod/cementerio/cocherias

9. emitirServicioFunebre(params): Observable<CementerioServicioFunebreResponseLite>
   POST /api/bod/cementerio/servicio-funebre/emisiones
   params debe incluir idBieFallecido, idSujCocheria, idBieCocheria y valueId.

10. getCuentaCorrienteCocheria(idBieCocheria: number): Observable<CuentaCorrienteResumenLite>
    GET /api/bod/cuentas/HABILITACIONES/{idBieCocheria}/cc

Implementación:
- Construir payloads mock dentro del service o en helpers privados del mismo service.
- Generar fechas con new Date().toISOString() o fecha fija si resulta más estable.
- No agregar formularios todavía.
- No agregar UI compleja todavía.
- Dejar el service listo para que el próximo slice conecte botones/componentes.

Resultado esperado:
- Service compilable.
- Modelos compilables.
- Métodos preparados para consumo desde componente.
- Sin cambios visuales grandes todavía.
```

---

# Checklist para validar después del Slice 2

- `ng build` compila.
- `auth.config.ts` ya tiene `secureRoutes` desde Slice 1.
- El service no contiene URLs hardcodeadas.
- El service usa `environment.apis.bodBaseUrl`.
- Las emisiones envían `returnUrl` con `environment.externalSites.defaultReturnUrl`.
- Los modelos preservan `Link_To_MasPagos` exactamente con ese nombre.
