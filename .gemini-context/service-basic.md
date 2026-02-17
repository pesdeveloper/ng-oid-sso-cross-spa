# Service: BasicService

**Path**: `src/app/core/services/basic.service.ts`

## Description
Servicio encargado de recuperar información básica de sujetos y bienes desde la API de backend.

## Dependencies
- `HttpClient`: Para realizar peticiones HTTP.
- `BasicResponse`: Modelo de datos para la respuesta.

## Configuration
- `baseUrl`: `https://sb-comon-api.malvinasargentinas.gob.ar` (Hardcoded)

## Methods

### `getBasic(id_suj: number, id_bie: number): Observable<BasicResponse>`
Realiza una petición GET a `/Basic/Get`.

**Parameters:**
- `id_suj`: ID del sujeto.
- `id_bie`: ID del bien.

**Returns:**
- Observable con la respuesta `BasicResponse`.

## Models
### `BasicResponse`
Interfaz que define la estructura de datos retornada por el servicio.
- `id_Suj`, `id_Bie`: Identificadores principales.
- `sujDeno`: Denominación del sujeto.
- Flags booleanos: `siBloqueOperativo`, `siBaja`, `enVerificacion`, `siComTipoGrande`, `esMoto`.
- Datos bancarios/extra: `cbu`, `observacion`, `cuentaBco`, `tipoCtaBco`, `bco_Deno`, `codBanco`.