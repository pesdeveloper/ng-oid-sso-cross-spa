import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { randFirstName, randLastName, randNumber } from '@ngneat/falso';
import { finalize } from 'rxjs';
import { BodApiService } from './bod-api/bod-api.service';
import {
  CementerioAltaInicialRequest,
  CementerioAltaInicialResponse,
  CementerioEmisionRequest,
  CementerioEmisionResponse,
  resolveCementerioIdBie,
  resolveCementerioIdSuj,
  resolveCementerioLinkToMasPagos,
} from './bod-api/bod-api.models';

const CEMENTERIO_ID_SUJ = 18;

@Component({
  selector: 'app-cementerio',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './cementerio.html',
  styleUrl: './cementerio.scss',
})
export class Cementerio {
  private readonly router = inject(Router);
  private readonly bodApi = inject(BodApiService);

  valueId = '';
  idSuj: number | null = null;
  idBie: number | null = null;
  mensaje: string | null = null;
  error: string | null = null;

  altaEnviando = false;
  altaResponse: CementerioAltaInicialResponse | null = null;
  emisionEnviando = false;
  emisionResponse: CementerioEmisionResponse | null = null;
  linkToMasPagos: string | null = null;

  cementerioForm = {
    titularNombre: '',
    titularApellido: '',
    titularDocumento: '',
    fallecidoNombre: '',
    fallecidoApellido: '',
    fallecidoDocumento: '',
    edad: 72,
    ubicacion: '',
    sepulturaONicho: 'S',
    sexo: 'M',
    fila: '1',
    nicho: '',
    siDePartido: true,
  };

  volverAlInicio(): void {
    void this.router.navigate(['/']);
  }

  prepararCasoDemo(): void {
    const fecha = new Date();
    const ymd =
      `${fecha.getFullYear()}` +
      `${String(fecha.getMonth() + 1).padStart(2, '0')}` +
      `${String(fecha.getDate()).padStart(2, '0')}`;
    const suffix = Date.now().toString().slice(-6);
    this.valueId = `CEM-DEMO-${ymd}-${suffix}`;

    const titularApellido = randLastName();
    const titularNombre = randFirstName();
    const fallecidoApellido = randLastName();
    const fallecidoNombre = randFirstName();

    this.cementerioForm = {
      titularNombre,
      titularApellido,
      titularDocumento: String(randNumber({ min: 10_000_000, max: 45_000_000 })),
      fallecidoNombre,
      fallecidoApellido,
      fallecidoDocumento: String(randNumber({ min: 10_000_000, max: 45_000_000 })),
      edad: randNumber({ min: 60, max: 95 }),
      ubicacion: 'SECTOR A DEMO',
      sepulturaONicho: 'S',
      sexo: 'M',
      fila: '1',
      nicho: '',
      siDePartido: true,
    };

    this.idSuj = null;
    this.idBie = null;
    this.altaResponse = null;
    this.emisionResponse = null;
    this.linkToMasPagos = null;
    this.error = null;
    this.mensaje = `Caso demo preparado (${this.valueId}). Completá o ajustá el formulario y creá el registro.`;
  }

  enviarAltaCementerio(): void {
    const valueId = this.valueId.trim();
    if (!valueId) {
      this.error = 'Prepará un caso demo o ingresá un valueId antes de crear el registro.';
      this.mensaje = null;
      return;
    }

    this.altaEnviando = true;
    this.error = null;
    this.mensaje = null;
    this.altaResponse = null;
    this.emisionResponse = null;
    this.linkToMasPagos = null;
    this.idSuj = null;
    this.idBie = null;

    const request = this.buildAltaCementerioRequest();

    this.bodApi
      .altaCementerioRegistro(request)
      .pipe(
        finalize(() => {
          this.altaEnviando = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.altaResponse = response;
          this.idBie = resolveCementerioIdBie(response);
          this.idSuj = resolveCementerioIdSuj(response);
          if (this.idSuj == null && this.idBie != null) {
            this.idSuj = CEMENTERIO_ID_SUJ;
          }
          this.mensaje = 'Registro de Cementerio creado correctamente.';
        },
        error: (err: unknown) => {
          this.error = this.formatHttpError(err, 'crear el registro de Cementerio');
        },
      });
  }

  emitirTasaCementerio(): void {
    const valueId = this.valueId.trim();
    if (!valueId) {
      this.error = 'Prepará un caso demo o ingresá un valueId antes de emitir.';
      this.mensaje = null;
      return;
    }

    if (this.idBie == null || !Number.isFinite(this.idBie) || this.idBie <= 0) {
      this.error = 'Primero tenés que crear el registro para obtener id_Bie.';
      this.mensaje = null;
      return;
    }

    this.emisionEnviando = true;
    this.error = null;
    this.mensaje = null;
    this.emisionResponse = null;
    this.linkToMasPagos = null;

    const request = this.buildEmisionCementerioRequest();

    this.bodApi
      .emitirCementerioTasas(this.idBie, request)
      .pipe(
        finalize(() => {
          this.emisionEnviando = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.emisionResponse = response;
          this.linkToMasPagos = resolveCementerioLinkToMasPagos(response);
          const idSuj = resolveCementerioIdSuj(response);
          const idBie = resolveCementerioIdBie(response);
          if (idBie != null) {
            this.idBie = idBie;
          }
          if (idSuj != null) {
            this.idSuj = idSuj;
          } else if (this.idBie != null && this.idSuj == null) {
            this.idSuj = CEMENTERIO_ID_SUJ;
          }
          this.mensaje = 'Emisión de Cementerio realizada correctamente.';
        },
        error: (err: unknown) => {
          this.error = this.formatHttpError(err, 'emitir la tasa de Cementerio');
        },
      });
  }

  continuarMasPagos(): void {
    if (!this.linkToMasPagos) {
      this.error = 'No hay link de MASPagos. Emití la tasa primero.';
      return;
    }

    this.error = null;
    window.location.href = this.linkToMasPagos;
  }

  puedeConsultarPorIdBie(): boolean {
    return this.idBie != null && Number.isFinite(this.idBie) && this.idBie > 0;
  }

  consultarCuentaPorValueId(): void {
    const valueId = this.valueId.trim();
    if (!valueId) {
      this.error = 'Prepará un caso demo o ingresá un valueId antes de consultar.';
      this.mensaje = null;
      return;
    }

    this.error = null;
    void this.router.navigate(['/bod/cuenta'], {
      queryParams: {
        destino: 'cementerio',
        modo: 'valueId',
        valueId,
        returnTo: '/cementerio',
      },
    });
  }

  consultarCuentaPorIdBie(): void {
    if (!this.puedeConsultarPorIdBie()) {
      this.error = 'Para consultar por Id_Bie necesitás id_Bie (creá el registro primero).';
      this.mensaje = null;
      return;
    }

    const queryParams: Record<string, string> = {
      destino: 'cementerio',
      returnTo: '/cementerio',
    };
    const valueId = this.valueId.trim();
    if (valueId) {
      queryParams['valueId'] = valueId;
    }

    this.error = null;
    void this.router.navigate(['/bod/cuenta', this.idSuj ?? CEMENTERIO_ID_SUJ, this.idBie], {
      queryParams,
    });
  }

  private buildAltaCementerioRequest(): CementerioAltaInicialRequest {
    const titularApellido = this.cementerioForm.titularApellido.trim() || 'DEMO';
    const titularNombre = this.cementerioForm.titularNombre.trim() || 'TITULAR';
    const titularDoc = Number(this.cementerioForm.titularDocumento.replace(/\D/g, '') || 30123456);
    const fallecidoDoc = Number(
      this.cementerioForm.fallecidoDocumento.replace(/\D/g, '') || 12345678,
    );
    const domicilio = 'CALLE CEMENTERIO 123';

    return {
      valueId: this.valueId.trim(),
      fecha: this.fechaIsoSinHora(),
      titular: {
        valueId: `${this.valueId.trim()}-TIT`,
        id_Per: 0,
        datos_persona: {
          razonSocial: `${titularApellido} ${titularNombre}`.trim(),
          tipoPersona: 'Fisica',
          tipoDocumento: 'DNI',
          nroDocumento: titularDoc,
          fechaNac: '1970-01-01T00:00:00',
          id_Pais: 32,
          estadoCivil: 'Soltero',
          sexo: 'Masculino',
          profesion: 'No informa',
          estadoDocumento: 'Documentado',
          email1: 'cementerio.demo@correo.com',
          email2: null,
          webPage: null,
          nroPuerta: 123,
          calleYNro: domicilio,
          pisoDpto: null,
          eCalle1: 'ENTRE 1',
          eCalle2: 'Y 2',
          localidad: 'GRAND BOURG',
          cp: 1615,
          tel1: '11-4444-4444',
          tel2: null,
          id_Dom: 0,
        },
      },
      destinatario: {
        esMismaPersonaQueTitular: true,
      },
      registro: {
        tipoDeFallecido: 'Restos',
        claseFallecido: 'Normal',
        ubicacion:
          this.trimMax(this.cementerioForm.ubicacion, 36) || 'DEMO CEMENTERIO',
        sepulturaONicho: this.mapSepulturaONicho(this.cementerioForm.sepulturaONicho),
        sec: this.trimMax('A', 10),
        mza: this.trimMax('1', 10),
        tbl: this.trimMax('1', 10),
        sepultura: this.trimMax('1', 10),
        fila: this.trimMax(this.cementerioForm.fila, 10) || '1',
        nicho: this.trimMax(this.cementerioForm.nicho, 10),
        apellido:
          this.trimMax(this.cementerioForm.fallecidoApellido, 35) || 'FALLECIDO',
        nombre: this.trimMax(this.cementerioForm.fallecidoNombre, 35) || 'CEMENTERIO',
        tipoDocumento: 'DNI',
        nroDocumento: fallecidoDoc,
        edad: Number(this.cementerioForm.edad || 0),
        siAdulto: true,
        sexo: this.mapSexoCementerio(this.cementerioForm.sexo ?? 'M'),
        siNativo: true,
        siDePartido: !!this.cementerioForm.siDePartido,
        fechaIngreso: this.fechaIsoSinHora(),
        siTraumatico: false,
        siNN: false,
        siIndigente: false,
        fg_Baja: false,
        siAlPie: false,
      },
    };
  }

  private trimMax(value: string | null | undefined, max: number): string {
    return (value ?? '').trim().slice(0, max);
  }

  private mapSepulturaONicho(
    value: string,
  ): 'Sepultura' | 'Nicho' | 'Deposito' | 'Osario' {
    switch ((value || '').toUpperCase()) {
      case 'NICHO':
      case 'N':
        return 'Nicho';
      case 'DEPOSITO':
      case 'DEPÓSITO':
      case 'D':
        return 'Deposito';
      case 'OSARIO':
      case 'O':
        return 'Osario';
      case 'SEPULTURA':
      case 'S':
      default:
        return 'Sepultura';
    }
  }

  private mapSexoCementerio(
    value: string,
  ): 'Masculino' | 'Femenino' | 'Otro' | 'NN' {
    switch ((value || '').toUpperCase()) {
      case 'F':
      case 'FEMENINO':
        return 'Femenino';
      case 'O':
      case 'OTRO':
        return 'Otro';
      case 'N':
      case 'NN':
        return 'NN';
      case 'M':
      case 'MASCULINO':
      default:
        return 'Masculino';
    }
  }

  private buildEmisionCementerioRequest(): CementerioEmisionRequest {
    const valueId = this.valueId.trim();
    const idSuj = this.idSuj ?? CEMENTERIO_ID_SUJ;
    const returnUrl =
      `${window.location.origin}/bod/cuenta/${idSuj}/${this.idBie}` +
      `?destino=cementerio&valueId=${encodeURIComponent(valueId)}` +
      `&returnTo=${encodeURIComponent('/cementerio')}`;

    return {
      valueId,
      fecha: this.fechaIsoSinHora(),
      generarQr: true,
      returnUrl,
      tasas: [{ id_Tri: 76, id_Tas: 1, importe: 10000 }],
    };
  }

  private fechaIsoSinHora(): string {
    const fecha = new Date();
    return (
      `${fecha.getFullYear()}-` +
      `${String(fecha.getMonth() + 1).padStart(2, '0')}-` +
      `${String(fecha.getDate()).padStart(2, '0')}T00:00:00`
    );
  }

  private formatHttpError(error: unknown, accion: string): string {
    if (error instanceof HttpErrorResponse) {
      const body = error.error;
      if (typeof body === 'string' && body.trim()) {
        return body;
      }
      if (body && typeof body === 'object') {
        const payload = body as { message?: string; error?: string; title?: string };
        const detail = payload.message ?? payload.error ?? payload.title;
        if (detail) {
          return `${error.status}: ${detail}`;
        }
      }
      return `${error.status} ${error.statusText || `Error al ${accion}.`}`;
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return `Error inesperado al ${accion}.`;
  }
}
