export interface BodHabilitacionAltaRequest {
  razonSocial: string;
  nombreFantasia: string;
  cuit: string;
  email: string;
  telefono: string;
  domicilioComercio: string;
  domicilioPostal: string;
  origen: 'habilitaciones-spa';
}

export interface BodHabilitacionAltaResponse {
  id_Des?: number;
  idDes?: number;
  valueId?: number;
  id_Suj?: number;
  idSuj?: number;
  id_Bie?: number;
  idBie?: number;
  message?: string;
  raw?: unknown;
}

export interface BodHabilitacionEmisionRequest {
  valueId: number;
  returnUrl: string;
}

export interface BodHabilitacionEmisionResponse {
  link_To_MasPagos?: string;
  linkToMasPagos?: string;
  valueId?: number;
  message?: string;
  raw?: unknown;
}

export interface BodCuentaCorrienteResponse {
  valueId?: number;
  id_Suj?: number;
  idSuj?: number;
  id_Bie?: number;
  idBie?: number;
  items?: unknown[];
  raw?: unknown;
}

export function resolveBodValueId(response: BodHabilitacionAltaResponse): number | null {
  return response.id_Des ?? response.idDes ?? response.valueId ?? null;
}

export function resolveLinkToMasPagos(response: BodHabilitacionEmisionResponse): string | null {
  return response.link_To_MasPagos ?? response.linkToMasPagos ?? null;
}
