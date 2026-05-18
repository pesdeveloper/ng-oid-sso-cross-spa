import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  BodCuentaCorrienteResponse,
  BodCuentaDestino,
  BodCuentaRcRequest,
  BodCuentaRcResponse,
  BodCuentaReferenciaResponse,
  BodHabilitacionAltaRequest,
  BodHabilitacionAltaResponse,
  BodHabilitacionEmisionRequest,
  BodHabilitacionEmisionResponse,
  CementerioAltaInicialRequest,
  CementerioAltaInicialResponse,
  CementerioEmisionRequest,
  CementerioEmisionResponse,
} from './bod-api.models';

@Injectable({ providedIn: 'root' })
export class BodApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apis.bodBaseUrl;

  private readonly habilitacionesAltaUrl = `${this.baseUrl}/api/bod/habilitaciones/comercios`;

  private habilitacionesEmisionUrl(idBie: number): string {
    return `${this.baseUrl}/api/bod/emitir/HABILITACIONES/2/${idBie}`;
  }

  altaHabilitacion(request: BodHabilitacionAltaRequest): Observable<BodHabilitacionAltaResponse> {
    return this.http.post<BodHabilitacionAltaResponse>(this.habilitacionesAltaUrl, request);
  }

  emitirHabilitacion(
    idBie: number,
    request: BodHabilitacionEmisionRequest,
  ): Observable<BodHabilitacionEmisionResponse> {
    return this.http.post<BodHabilitacionEmisionResponse>(
      this.habilitacionesEmisionUrl(idBie),
      request,
    );
  }

  altaCementerioRegistro(
    request: CementerioAltaInicialRequest,
  ): Observable<CementerioAltaInicialResponse> {
    return this.http.post<CementerioAltaInicialResponse>(
      `${this.baseUrl}/api/bod/cementerio/registros`,
      request,
    );
  }

  emitirCementerioTasas(
    idBie: number,
    request: CementerioEmisionRequest,
  ): Observable<CementerioEmisionResponse> {
    return this.http.post<CementerioEmisionResponse>(
      `${this.baseUrl}/api/bod/cementerio/cuentas/${idBie}/emisiones`,
      request,
    );
  }

  getCuentaCorriente(_idSuj: number, idBie: number): Observable<BodCuentaCorrienteResponse> {
    return this.getCuentaCorrientePorIdBie('habilitaciones', idBie);
  }

  getCuentaCorrientePorIdBie(
    destino: BodCuentaDestino,
    idBie: number,
  ): Observable<BodCuentaCorrienteResponse> {
    return this.http.get<BodCuentaCorrienteResponse>(
      `${this.baseUrl}/api/bod/cuentas/${destino}/${idBie}/cc`,
    );
  }

  getCuentaCorrientePorValueId(
    destino: BodCuentaDestino,
    valueId: string,
  ): Observable<BodCuentaCorrienteResponse> {
    return this.http.get<BodCuentaCorrienteResponse>(
      `${this.baseUrl}/api/bod/cuentas/${destino}/${encodeURIComponent(valueId)}/cc`,
    );
  }

  getCuentaReferenciasPorValueId(
    destino: BodCuentaDestino,
    valueId: string,
  ): Observable<BodCuentaReferenciaResponse> {
    return this.http.get<BodCuentaReferenciaResponse>(
      `${this.baseUrl}/api/bod/cuentas/${destino}/${encodeURIComponent(valueId)}/refs`,
    );
  }

  generarRcCuenta(
    destino: BodCuentaDestino,
    valueId: string,
    request: BodCuentaRcRequest,
  ): Observable<BodCuentaRcResponse> {
    return this.http.post<BodCuentaRcResponse>(
      `${this.baseUrl}/api/bod/cuentas/${destino}/${encodeURIComponent(valueId)}/rc`,
      request,
    );
  }

  descargarRcPdf(
    destino: BodCuentaDestino,
    valueId: string,
    cmte: string,
    pref: number,
    nro: number,
  ): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/api/bod/cuentas/${destino}/${encodeURIComponent(valueId)}/rc/${encodeURIComponent(cmte)}/${pref}/${nro}/pdf`,
      { responseType: 'blob' },
    );
  }
}
