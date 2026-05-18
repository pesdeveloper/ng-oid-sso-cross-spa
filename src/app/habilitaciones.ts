import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
  randEmail,
  randNumber,
  randPhoneNumber,
  randStreetAddress,
} from '@ngneat/falso';
import { finalize } from 'rxjs';
import { BodApiService } from './bod-api/bod-api.service';
import {
  BodHabilitacionAltaRequest,
  BodHabilitacionAltaResponse,
  BodHabilitacionEmisionRequest,
  BodHabilitacionEmisionResponse,
  resolveBodIdBie,
  resolveBodIdSuj,
  resolveBodValueId,
  resolveLinkToMasPagos,
} from './bod-api/bod-api.models';

interface HabilitacionAltaLocalForm {
  razonSocial: string;
  nombreFantasia: string;
  cuit: string;
  email: string;
  telefono: string;
  domicilioComercio: string;
  domicilioPostal: string;
}

interface HabilitacionAltaRequestPreview {
  razonSocial: string;
  nombreFantasia: string;
  cuit: string;
  email: string;
  telefono: string;
  domicilioComercio: string;
  domicilioPostal: string;
  origen: 'habilitaciones-spa';
}

const BOD_ID_RUB = 198;
const BOD_ID_BIE_INM = 195796;

const BOD_EMISION_TASAS: BodHabilitacionEmisionRequest['tasas'] = [
  { id_Tri: 72, id_Tas: 3, importe: 10000 },
  { id_Tri: 72, id_Tas: 4 },
  { id_Tri: 72, id_Tas: 5, importe: 5000 },
  { id_Tri: 72, id_Tas: 6 },
  { id_Tri: 72, id_Tas: 7 },
  { id_Tri: 72, id_Tas: 8 },
  { id_Tri: 72, id_Tas: 9 },
];

function createEmptyAltaForm(): HabilitacionAltaLocalForm {
  return {
    razonSocial: '',
    nombreFantasia: '',
    cuit: '',
    email: '',
    telefono: '',
    domicilioComercio: '',
    domicilioPostal: '',
  };
}

@Component({
  selector: 'app-habilitaciones',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './habilitaciones.html',
  styleUrl: './habilitaciones.scss',
})
export class Habilitaciones implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bodApi = inject(BodApiService);

  readonly valueId = signal<string | null>(null);

  altaFormVisible = false;
  altaForm: HabilitacionAltaLocalForm = createEmptyAltaForm();
  requestPreview: HabilitacionAltaRequestPreview | null = null;
  altaPreparada = false;

  altaEnviando = false;
  altaError: string | null = null;
  altaMensaje: string | null = null;
  altaResponse: BodHabilitacionAltaResponse | null = null;
  altaValueId: number | null = null;
  altaIdSuj: number | null = null;
  altaIdBie: number | null = null;

  emisionEnviando = false;
  emisionError: string | null = null;
  emisionMensaje: string | null = null;
  emisionResponse: BodHabilitacionEmisionResponse | null = null;
  linkToMasPagos: string | null = null;
  masPagosError: string | null = null;
  cuentaCorrienteError: string | null = null;

  private altaValueIdCorrelativo: string | null = null;

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.valueId.set(params.get('valueId'));
    });
  }

  volverAlInicio(): void {
    void this.router.navigate(['/']);
  }

  prepararAlta(): void {
    this.altaForm = createEmptyAltaForm();
    this.altaFormVisible = true;
    this.resetAltaResultado();
    this.actualizarPreview();
  }

  cancelarAlta(): void {
    this.altaFormVisible = false;
    this.altaForm = createEmptyAltaForm();
    this.requestPreview = null;
    this.resetAltaResultado();
    this.altaValueIdCorrelativo = null;
  }

  actualizarPreview(): void {
    this.requestPreview = {
      ...this.altaForm,
      origen: 'habilitaciones-spa',
    };
  }

  enviarAlta(): void {
    this.actualizarPreview();

    if (!this.requestPreview) {
      this.altaError = 'Completá los datos del formulario antes de enviar.';
      return;
    }

    this.altaEnviando = true;
    this.altaError = null;
    this.altaMensaje = null;
    this.altaResponse = null;
    this.altaValueId = null;
    this.altaIdSuj = null;
    this.altaIdBie = null;
    this.altaPreparada = false;
    this.resetEmisionResultado();

    const request = this.buildAltaRequest();

    this.bodApi
      .altaHabilitacion(request)
      .pipe(finalize(() => {
        this.altaEnviando = false;
      }))
      .subscribe({
        next: (response) => {
          this.altaResponse = response;
          this.altaIdSuj = resolveBodIdSuj(response);
          this.altaIdBie = resolveBodIdBie(response);
          this.altaValueId = resolveBodValueId(response);
          this.altaPreparada = true;
          this.altaMensaje = 'Alta creada correctamente en BOD.';
          if (this.altaIdSuj == null || this.altaIdBie == null) {
            this.altaMensaje +=
              ' Advertencia: no se pudo resolver id_Suj o id_Bie desde la respuesta.';
          }
        },
        error: (error: unknown) => {
          this.altaError = this.formatAltaError(error);
          this.altaPreparada = false;
        },
      });
  }

  continuarMasPagos(): void {
    if (!this.linkToMasPagos) {
      this.masPagosError =
        'Primero tenés que emitir la tasa para obtener el link de MASPagos.';
      return;
    }

    this.masPagosError = null;
    window.location.href = this.linkToMasPagos;
  }

  puedeVerCuentaCorriente(): boolean {
    return this.altaIdSuj != null && this.altaIdBie != null;
  }

  verCuentaCorriente(): void {
    if (!this.puedeVerCuentaCorriente()) {
      this.cuentaCorrienteError =
        'Primero tenés que crear el alta para obtener id_Suj e id_Bie.';
      return;
    }

    this.cuentaCorrienteError = null;

    const queryParams: Record<string, string> = {
      destino: 'habilitaciones',
      returnTo: '/habilitaciones',
    };
    const tramiteValueId = this.altaValueIdCorrelativo;
    if (tramiteValueId) {
      queryParams['valueId'] = tramiteValueId;
    }

    void this.router.navigate(
      ['/bod/cuenta', this.altaIdSuj, this.altaIdBie],
      { queryParams },
    );
  }

  emitirTasa(): void {
    if (this.altaIdSuj == null) {
      this.emisionError = 'No se pudo obtener id_Suj de la respuesta del alta.';
      return;
    }

    if (this.altaIdBie == null) {
      this.emisionError = 'No se pudo obtener id_Bie de la respuesta del alta.';
      return;
    }

    this.emisionEnviando = true;
    this.emisionError = null;
    this.emisionMensaje = null;
    this.emisionResponse = null;
    this.linkToMasPagos = null;

    const request = this.buildEmisionRequest();

    this.bodApi
      .emitirHabilitacion(this.altaIdBie, request)
      .pipe(finalize(() => {
        this.emisionEnviando = false;
      }))
      .subscribe({
        next: (response) => {
          this.emisionResponse = response;
          this.linkToMasPagos = resolveLinkToMasPagos(response);
          this.masPagosError = null;
          if (this.linkToMasPagos) {
            this.emisionMensaje =
              'Tasa emitida correctamente. Ya se recibió el link de MASPagos.';
          } else {
            this.emisionMensaje =
              'Tasa emitida, pero la respuesta no incluyó Link_To_MasPagos.';
          }
        },
        error: (error: unknown) => {
          this.emisionError = this.formatHttpError(error, 'emitir la tasa en BOD');
        },
      });
  }

  generarDatosMockAlta(): void {
    this.altaFormVisible = true;
    this.resetAltaResultado();
    this.resetEmisionResultado();
    this.altaValueIdCorrelativo = null;

    const suffix = Date.now().toString().slice(-6);
    this.altaForm = {
      razonSocial: `Comercio Demo ${suffix}`,
      nombreFantasia: `Local Demo ${suffix}`,
      cuit: this.generarCuitMock(),
      email: randEmail(),
      telefono: randPhoneNumber(),
      domicilioComercio: randStreetAddress(),
      domicilioPostal: randStreetAddress(),
    };
    this.actualizarPreview();
  }

  private resetAltaResultado(): void {
    this.altaPreparada = false;
    this.altaEnviando = false;
    this.altaError = null;
    this.altaMensaje = null;
    this.altaResponse = null;
    this.altaValueId = null;
    this.altaIdSuj = null;
    this.altaIdBie = null;
    this.resetEmisionResultado();
  }

  private resetEmisionResultado(): void {
    this.emisionEnviando = false;
    this.emisionError = null;
    this.emisionMensaje = null;
    this.emisionResponse = null;
    this.linkToMasPagos = null;
    this.masPagosError = null;
    this.cuentaCorrienteError = null;
  }

  private buildReturnUrl(idSuj: number, idBie: number): string {
    return `${window.location.origin}/habilitaciones/cuenta/${idSuj}/${idBie}`;
  }

  private buildEmisionRequest(): BodHabilitacionEmisionRequest {
    return {
      valueId: this.resolveAltaValueIdCorrelativo(),
      fecha: this.fechaIsoSinHora(),
      generarQr: true,
      returnUrl: this.buildReturnUrl(this.altaIdSuj!, this.altaIdBie!),
      tasas: BOD_EMISION_TASAS,
    };
  }

  puedeEmitirTasa(): boolean {
    return this.altaIdSuj != null && this.altaIdBie != null;
  }

  private buildAltaRequest(): BodHabilitacionAltaRequest {
    const fecha = this.fechaIsoSinHora();
    const valueId = this.resolveAltaValueIdCorrelativo();
    const cuit = this.parseCuit(this.altaForm.cuit);
    const domicilio = this.altaForm.domicilioComercio.trim() || 'DOMICILIO DEMO';

    return {
      valueId,
      fecha,
      id_Rub: BOD_ID_RUB,
      nomFantacia: this.altaForm.nombreFantasia.trim() || `COMERCIO ${valueId}`,
      fechaIniAct: fecha,
      calleYnro: domicilio,
      eCalle1: 'BROWN, ALMIRANTE',
      eCalle2: 'LYNCH, BENITO',
      pisoDpto: 'PB',
      galeria: null,
      localGaleria: null,
      id_Pais: 32,
      id_Pvc: 'BA',
      mts2Superf: 80,
      zonificacion: 0,
      tcontribMun: 0,
      si_Mayorista: false,
      si_Deposito: false,
      si_Tasa_Especial: false,
      ingBr: this.altaForm.cuit.trim(),
      cantSocios: 1,
      cantEmpleados: 2,
      estadoHabilit: 'T',
      tipo: 'C',
      id_Bie_Inm: BOD_ID_BIE_INM,
      id_Per: 0,
      datos_persona: {
        razonSocial: this.altaForm.razonSocial.trim() || this.altaForm.nombreFantasia.trim(),
        tipoPersona: 'Juridica',
        tipoDocumento: 'CUIT',
        prefCUIT: cuit.prefijo,
        nroDocumento: cuit.numero,
        fechaNac: '1990-01-01T00:00:00',
        id_Pais: 32,
        estadoCivil: 'Soltero',
        sexo: 'Masculino',
        profesion: 'Comerciante',
        estadoDocumento: 'Documentado',
        email1: this.altaForm.email.trim() || 'demo.angular@correo.com',
        email2: null,
        webPage: null,
        nroPuerta: 589,
        calleYNro: domicilio,
        pisoDpto: 'PB',
        eCalle1: 'BROWN, ALMIRANTE',
        eCalle2: 'LYNCH, BENITO',
        localidad: 'GRAND BOURG',
        cp: 1615,
        tel1: this.altaForm.telefono.trim() || '11-4444-4444',
        tel2: null,
        id_Dom: 0,
      },
    };
  }

  private resolveAltaValueIdCorrelativo(): string {
    if (this.altaValueIdCorrelativo) {
      return this.altaValueIdCorrelativo;
    }
    const fecha = new Date();
    const ymd =
      `${fecha.getFullYear()}` +
      `${String(fecha.getMonth() + 1).padStart(2, '0')}` +
      `${String(fecha.getDate()).padStart(2, '0')}`;
    const suffix = Date.now().toString().slice(-6);
    this.altaValueIdCorrelativo = `HAB-DEMO-${ymd}-${suffix}`;
    return this.altaValueIdCorrelativo;
  }

  private fechaIsoSinHora(): string {
    const fecha = new Date();
    return (
      `${fecha.getFullYear()}-` +
      `${String(fecha.getMonth() + 1).padStart(2, '0')}-` +
      `${String(fecha.getDate()).padStart(2, '0')}T00:00:00`
    );
  }

  private parseCuit(cuit: string): { prefijo: number; numero: number } {
    const digits = cuit.replace(/\D/g, '');
    if (digits.length >= 11) {
      return {
        prefijo: Number(digits.slice(0, 2)),
        numero: Number(digits.slice(2, 10)),
      };
    }
    return { prefijo: 30, numero: 30123456 };
  }

  private formatAltaError(error: unknown): string {
    return this.formatHttpError(error, 'crear alta en BOD');
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

  private generarCuitMock(): string {
    const prefijos = ['20', '27', '30'];
    const prefijo = prefijos[randNumber({ min: 0, max: 2 })];
    const central = String(randNumber({ min: 0, max: 99_999_999 })).padStart(8, '0');
    const verificador = randNumber({ min: 0, max: 9 });
    return `${prefijo}-${central}-${verificador}`;
  }
}
