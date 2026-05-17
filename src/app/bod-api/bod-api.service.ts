import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BodCuentaCorrienteResponse,
  BodHabilitacionAltaRequest,
  BodHabilitacionAltaResponse,
  BodHabilitacionEmisionRequest,
  BodHabilitacionEmisionResponse,
} from './bod-api.models';

@Injectable({ providedIn: 'root' })
export class BodApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = '';

  private readonly habilitacionesAltaUrl = `${this.baseUrl}/api/bod/habilitaciones/alta`;
  private readonly habilitacionesEmisionUrl = `${this.baseUrl}/api/bod/habilitaciones/emision`;

  private cuentaCorrienteUrl(valueId: number): string {
    return `${this.baseUrl}/api/bod/habilitaciones/${valueId}/cuenta-corriente`;
  }

  altaHabilitacion(request: BodHabilitacionAltaRequest): Observable<BodHabilitacionAltaResponse> {
    return this.http.post<BodHabilitacionAltaResponse>(this.habilitacionesAltaUrl, request);
  }

  emitirHabilitacion(request: BodHabilitacionEmisionRequest): Observable<BodHabilitacionEmisionResponse> {
    return this.http.post<BodHabilitacionEmisionResponse>(this.habilitacionesEmisionUrl, request);
  }

  getCuentaCorriente(valueId: number): Observable<BodCuentaCorrienteResponse> {
    return this.http.get<BodCuentaCorrienteResponse>(this.cuentaCorrienteUrl(valueId));
  }
}
