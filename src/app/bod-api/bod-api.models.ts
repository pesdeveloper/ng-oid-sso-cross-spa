export interface BodHabilitacionDatosPersona {
  razonSocial: string;
  tipoPersona: string;
  tipoDocumento: string;
  prefCUIT?: number;
  nroDocumento: number;
  fechaNac: string;
  id_Pais: number;
  estadoCivil: string;
  sexo: string;
  profesion: string;
  estadoDocumento: string;
  email1: string;
  email2?: string | null;
  webPage?: string | null;
  nroPuerta: number;
  calleYNro: string;
  pisoDpto?: string | null;
  eCalle1: string;
  eCalle2: string;
  localidad: string;
  cp: number;
  tel1: string;
  tel2?: string | null;
  id_Dom: number;
}

/** POST /api/bod/habilitaciones/comercios */
export interface BodHabilitacionAltaRequest {
  valueId: string;
  fecha: string;
  id_Rub: number;
  nomFantacia: string;
  fechaIniAct: string;
  calleYnro: string;
  eCalle1: string;
  eCalle2: string;
  pisoDpto?: string | null;
  galeria?: string | null;
  localGaleria?: string | null;
  id_Pais: number;
  id_Pvc: string;
  mts2Superf: number;
  zonificacion: number;
  tcontribMun: number;
  si_Mayorista: boolean;
  si_Deposito: boolean;
  si_Tasa_Especial: boolean;
  ingBr: string;
  cantSocios: number;
  cantEmpleados: number;
  estadoHabilit: string;
  tipo: string;
  id_Bie_Inm: number;
  id_Per: number;
  datos_persona: BodHabilitacionDatosPersona;
}

export interface BodHabilitacionAltaResponse {
  id_Suj?: number;
  idSuj?: number;
  id_Bie?: number;
  idBie?: number;
  id_Des?: number;
  idDes?: number;
  valueId?: string | number;
  nomFantacia?: string;
  id_Rub?: number;
  rub_Deno?: string;
  calleYnro?: string;
  domicilioDelBienAsString?: string;
  message?: string;
  raw?: unknown;
}

export interface BodHabilitacionEmisionTasa {
  id_Tri: number;
  id_Tas: number;
  importe?: number;
}

/** POST /api/bod/emitir/HABILITACIONES/{idSuj}/{idBie} */
export interface BodHabilitacionEmisionRequest {
  valueId: string;
  fecha: string;
  generarQr: boolean;
  returnUrl: string;
  tasas: BodHabilitacionEmisionTasa[];
}

export interface BodHabilitacionEmisionData {
  id_Suj?: number;
  id_Bie?: number;
  cmte_Rc?: string | null;
  pref_Rc?: number | null;
  nro_Rc?: number | null;
  id_Cmte_Rc?: number | null;
  iVto1?: number | null;
  fVto1?: string | null;
  iVto2?: number | null;
  fVto2?: string | null;
  cmtes_Em?: unknown[] | null;
  qrPayload?: string | null;
  mensaje?: string | null;
  Link_To_MasPagos?: string | null;
  link_To_MasPagos?: string | null;
  linkToMasPagos?: string | null;
}

export interface BodHabilitacionEmisionResponse {
  ok?: boolean;
  data?: BodHabilitacionEmisionData;
  link_To_MasPagos?: string;
  linkToMasPagos?: string;
  Link_To_MasPagos?: string;
  LinkToMasPagos?: string;
  valueId?: string | number;
  message?: string;
  mensaje?: string;
  raw?: unknown;
}

export type BodCuentaDestino = 'habilitaciones' | 'faltas' | 'cementerio';

/** GET /api/bod/cuentas/{destino}/{idBie|valueId}/cc */
export interface BodCuentaCorrienteResponse {
  ok?: boolean;
  data?: BodCuentaCorrienteResumen | unknown;
  sven_Total?: number;
  saven_Total?: number;
  sbloq_Total?: number;
  conceptos?: BodCuentaConcepto[];
  message?: string;
  raw?: unknown;
}

export interface BodCuentaCorrienteResumen {
  sven_Total?: number;
  saven_Total?: number;
  sbloq_Total?: number;
  conceptos?: BodCuentaConcepto[];
}

export interface BodCuentaConcepto {
  tipo?: string;
  tipoDeno?: string;
  esTributo?: boolean;
  esDeCalendario?: boolean;
  esPlan?: boolean;
  sven_Total?: number;
  saven_Total?: number;
  sbloq_Total?: number;
  cmtes?: BodCuentaCmte[];
}

export interface BodCuentaCmte {
  c_CmteO?: string;
  c_PrefO?: number;
  c_NroO?: number;
  eje?: number;
  id_Tri?: number;
  cuotaInfoDeno?: string | null;
  cuotaInfoDenoExtra?: string | null;
  vto1?: string | null;
  vto2?: string | null;
  siVto2?: boolean;
  intimado?: boolean;
  bloqueado?: boolean;
  estaVencido?: boolean;
  saldo_Total?: number;
  siSeleccionable?: boolean;
  conPagoPendiente?: boolean;
}

/** GET /api/bod/cuentas/{destino}/{valueId}/refs */
export interface BodCuentaReferenciaResponse {
  ok?: boolean;
  data?: BodCuentaReferencia[];
  message?: string;
  raw?: unknown;
}

export interface BodCuentaReferencia {
  kind?: string;
  idPer?: number;
  idSuj?: number;
  idBie?: number;
  cmte?: string;
  pref?: number;
  nro?: number;
}

/** POST /api/bod/cuentas/{destino}/{valueId}/rc */
export interface BodCuentaRcRequest {
  id_Suj: number;
  id_Bie: number;
  returnUrl?: string;
  cmtes: BodCmteRefRequest[];
}

export interface BodCmteRefRequest {
  cmte: string;
  pref: number;
  nro: number;
}

export interface BodCuentaRcResponse {
  ok?: boolean;
  data?: BodCuentaRcData;
  error?: string | null;
}

export interface BodCuentaRcData {
  valueId?: string;
  id_Suj?: number;
  id_Bie?: number;
  rc?: BodCmteRefResponse;
  Link_To_MasPagos?: string;
  link_To_MasPagos?: string;
  linkToMasPagos?: string;
}

export interface BodCmteRefResponse {
  cmte: string;
  pref: number;
  nro: number;
}

export function resolveCuentaRcLink(
  resp: BodCuentaRcResponse | BodCuentaRcData | null | undefined,
): string | null {
  const anyResp = resp as Record<string, unknown> | null | undefined;
  const data = (anyResp?.['data'] ?? anyResp) as BodCuentaRcData | undefined;
  return data?.Link_To_MasPagos ?? data?.link_To_MasPagos ?? data?.linkToMasPagos ?? null;
}

/** @deprecated Usar BodCuentaConcepto */
export type BodCuentaCorrienteConcepto = BodCuentaConcepto;

export function resolveBodValueId(response: BodHabilitacionAltaResponse): number | null {
  if (response.id_Des != null) {
    return response.id_Des;
  }
  if (response.idDes != null) {
    return response.idDes;
  }
  const valueId = response.valueId;
  if (typeof valueId === 'number') {
    return valueId;
  }
  return null;
}

export function resolveBodIdSuj(response: BodHabilitacionAltaResponse): number | null {
  if (response.id_Suj != null) {
    return response.id_Suj;
  }
  if (response.idSuj != null) {
    return response.idSuj;
  }
  return null;
}

export function resolveBodIdBie(response: BodHabilitacionAltaResponse): number | null {
  if (response.id_Bie != null) {
    return response.id_Bie;
  }
  if (response.idBie != null) {
    return response.idBie;
  }
  return null;
}

export function resolveLinkToMasPagos(response: BodHabilitacionEmisionResponse): string | null {
  const data = response.data;
  return (
    response.Link_To_MasPagos ??
    response.link_To_MasPagos ??
    response.linkToMasPagos ??
    response.LinkToMasPagos ??
    data?.Link_To_MasPagos ??
    data?.link_To_MasPagos ??
    data?.linkToMasPagos ??
    null
  );
}

export interface CementerioAltaInicialRequest {
  valueId: string;
  fecha?: string;
  titular: CementerioPersonaRefRequest;
  destinatario: CementerioDestinatarioRequest;
  registro: CementerioRegistroFallecidoRequest;
}

export interface CementerioPersonaRefRequest {
  valueId?: string;
  id_Per?: number;
  datos_persona?: BodHabilitacionDatosPersona | Record<string, unknown>;
}

export interface CementerioDestinatarioRequest {
  esMismaPersonaQueTitular: boolean;
  persona?: CementerioPersonaRefRequest;
}

export type CementerioTipoDeFallecido =
  | 'Restos'
  | 'RestosReducidos'
  | 'Cenizas'
  | 'Bolsa'
  | 'Feto';

export type CementerioClaseFallecido =
  | 'Indeterminado'
  | 'Normal'
  | 'Angelito'
  | 'Policial'
  | 'Gratuita';

export type CementerioSepulturaONicho = 'Sepultura' | 'Nicho' | 'Deposito' | 'Osario';

export type CementerioTipoDocumento = 'DNI' | 'LC' | 'LE' | 'PAS' | 'CUIT' | 'NN';

export type CementerioSexo = 'Masculino' | 'Femenino' | 'Otro' | 'NN';

export interface CementerioRegistroFallecidoRequest {
  tipoDeFallecido: CementerioTipoDeFallecido;
  claseFallecido?: CementerioClaseFallecido;
  ubicacion?: string;
  sepulturaONicho: CementerioSepulturaONicho;
  sec?: string;
  mza?: string;
  tbl?: string;
  sepultura?: string;
  macizo?: string;
  fila?: string;
  nicho?: string;
  apellido: string;
  nombre: string;
  tipoDocumento: CementerioTipoDocumento;
  nroDocumento?: number;
  edad?: number;
  siAdulto?: boolean;
  sexo?: CementerioSexo;
  siNativo?: boolean;
  siDePartido?: boolean;
  fechaIngreso: string;
  siTraumatico?: boolean;
  siNN?: boolean;
  siIndigente?: boolean;
  fg_Baja?: boolean;
  siAlPie?: boolean;
}

export interface CementerioCuentaResponse {
  id_Suj?: number;
  idSuj?: number;
  id_Bie?: number;
  idBie?: number;
}

export interface CementerioAltaInicialResponse {
  ok?: boolean;
  data?: unknown;
  cuenta?: CementerioCuentaResponse;
  error?: string;
}

export interface CementerioEmisionRequest {
  valueId: string;
  fecha?: string;
  generarQr: boolean;
  returnUrl?: string;
  tasas: CementerioEmisionTasaRequest[];
  parametrosCalculo?: unknown;
}

export interface CementerioEmisionTasaRequest {
  id_Tri: number;
  id_Tas: number;
  importe?: number;
}

export interface CementerioEmisionResponse {
  ok?: boolean;
  data?: unknown;
  cuenta?: CementerioCuentaResponse;
  error?: string;
}

export function resolveCementerioIdSuj(
  resp: CementerioAltaInicialResponse | CementerioEmisionResponse | null | undefined,
): number | null {
  const c: CementerioCuentaResponse | undefined =
    (resp as { cuenta?: CementerioCuentaResponse; Cuenta?: CementerioCuentaResponse })?.cuenta ??
    (resp as { Cuenta?: CementerioCuentaResponse })?.Cuenta;
  return c?.id_Suj ?? c?.idSuj ?? null;
}

export function resolveCementerioIdBie(
  resp: CementerioAltaInicialResponse | CementerioEmisionResponse | null | undefined,
): number | null {
  const c: CementerioCuentaResponse | undefined =
    (resp as { cuenta?: CementerioCuentaResponse; Cuenta?: CementerioCuentaResponse })?.cuenta ??
    (resp as { Cuenta?: CementerioCuentaResponse })?.Cuenta;
  return c?.id_Bie ?? c?.idBie ?? null;
}

export function resolveCementerioLinkToMasPagos(
  resp: CementerioEmisionResponse | null | undefined,
): string | null {
  const anyResp = resp as Record<string, unknown> | null | undefined;
  const data = (anyResp?.['data'] ?? anyResp?.['Data']) as Record<string, unknown> | undefined;
  return (
    (data?.['Link_To_MasPagos'] as string | undefined) ??
    (data?.['link_To_MasPagos'] as string | undefined) ??
    (data?.['linkToMasPagos'] as string | undefined) ??
    null
  );
}
