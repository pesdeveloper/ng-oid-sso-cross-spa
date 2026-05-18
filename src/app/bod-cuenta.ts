import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { combineLatest, finalize, Observable } from 'rxjs';
import { BodApiService } from './bod-api/bod-api.service';
import {
  BodCmteRefRequest,
  BodCuentaConcepto,
  BodCuentaCorrienteResumen,
  BodCuentaCorrienteResponse,
  BodCuentaDestino,
  BodCuentaRcData,
  BodCuentaRcResponse,
  BodCuentaReferencia,
  BodCuentaReferenciaResponse,
  resolveCuentaRcLink,
} from './bod-api/bod-api.models';

interface DestinoOption {
  label: string;
  value: BodCuentaDestino;
}

interface CuentaComprobanteRow {
  concepto: string;
  cmte: string;
  pref: number | null;
  nro: number | null;
  eje: number | null;
  idTri: number | null;
  cuotaInfoDeno: string;
  cuotaInfoDenoExtra: string;
  vto1: string | null;
  vto2: string | null;
  estado: string;
  saldo: number;
  seleccionable: boolean;
  conPagoPendiente: boolean;
  selectionKey: string;
}

@Component({
  selector: 'app-bod-cuenta',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './bod-cuenta.html',
  styleUrl: './bod-cuenta.scss',
})
export class BodCuenta implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly bodApi = inject(BodApiService);

  readonly destinos: DestinoOption[] = [
    { label: 'Habilitaciones', value: 'habilitaciones' },
    { label: 'Faltas', value: 'faltas' },
    { label: 'Cementerio', value: 'cementerio' },
  ];

  routeDestino: BodCuentaDestino = 'habilitaciones';

  readonly idSuj = signal<string | null>(null);
  readonly idBie = signal<string | null>(null);

  returnTo: string | null = null;

  modoConsulta: 'idBie' | 'valueId' = 'idBie';
  manualDestino: BodCuentaDestino = 'habilitaciones';
  manualIdBie: number | null = null;
  manualValueId = '';

  cargando = false;
  error: string | null = null;
  cuenta: BodCuentaCorrienteResponse | null = null;

  referenciasCargando = false;
  referenciasError: string | null = null;
  referenciasResponse: BodCuentaReferenciaResponse | null = null;

  ultimaConsultaTipo: 'idBie' | 'valueId' | null = null;
  ultimaConsultaDestino: BodCuentaDestino | null = null;
  ultimaConsultaIdBie: number | null = null;
  ultimaConsultaValueId: string | null = null;

  currentValueId = '';
  selectedCmteKeys: string[] = [];

  rcGenerando = false;
  rcError: string | null = null;
  rcMensaje: string | null = null;
  rcResponse: BodCuentaRcResponse | null = null;
  rcData: BodCuentaRcData | null = null;
  rcLinkToMasPagos: string | null = null;
  rcPdfDescargando = false;
  rcPdfError: string | null = null;

  private activeDestino: BodCuentaDestino | null = null;
  private activeModo: 'idBie' | 'valueId' | null = null;
  private activeIdBie: number | null = null;
  private activeValueId: string | null = null;

  ngOnInit(): void {
    combineLatest([this.route.paramMap, this.route.queryParamMap]).subscribe(
      ([params, query]) => {
        this.returnTo = query.get('returnTo');
        this.idSuj.set(params.get('idSuj'));
        this.idBie.set(params.get('idBie'));
        this.applyRouteDestinoFromQuery(query);

        const valueIdQuery = query.get('valueId')?.trim() ?? '';
        if (valueIdQuery) {
          this.currentValueId = valueIdQuery;
        }

        this.resetConsultaActiva();
        this.limpiarRcYSeleccion();
        this.cuenta = null;
        this.referenciasResponse = null;
        this.referenciasError = null;

        if (this.tieneParametrosRutaValidos()) {
          this.error = null;
          this.establecerUltimaConsultaRuta();
          this.cargarCuenta();
          return;
        }

        this.cargando = false;
        this.error = null;
        this.initManualFromQuery(query);
      },
    );
  }

  volverAlInicio(): void {
    void this.router.navigate(['/']);
  }

  volverAlOrigen(): void {
    if (this.returnTo?.startsWith('/')) {
      void this.router.navigateByUrl(this.returnTo);
    }
  }

  tieneReturnTo(): boolean {
    return !!this.returnTo?.startsWith('/');
  }

  destinoActualLabel(): string {
    const found = this.destinos.find((d) => d.value === this.destinoUsado());
    return found?.label ?? this.destinoUsado();
  }

  textoVolverAlFlujo(): string {
    if (this.returnTo === '/habilitaciones') {
      return 'Volver al flujo de Habilitaciones';
    }
    if (this.returnTo === '/cementerio') {
      return 'Volver al flujo de Cementerio';
    }
    return `Volver al flujo de ${this.destinoActualLabel()}`;
  }

  recargarCuenta(): void {
    this.limpiarRcYSeleccion();
    this.cargarCuenta();
  }

  get currentDestino(): BodCuentaDestino {
    return this.destinoUsado();
  }

  get currentIdSuj(): number | null {
    return this.parseRouteId(this.idSuj());
  }

  get currentIdBie(): number | null {
    return this.parseRouteId(this.idBie());
  }

  get cantidadComprobantesSeleccionados(): number {
    return this.selectedCmteKeys.length;
  }

  get puedeGenerarRc(): boolean {
    return (
      !!this.currentDestino &&
      !!this.currentValueId.trim() &&
      this.currentIdSuj != null &&
      this.currentIdBie != null &&
      this.selectedComprobantes().length > 0 &&
      !this.rcGenerando
    );
  }

  get mensajeEstadoGenerarRc(): string | null {
    if (this.puedeGenerarRc || this.rcGenerando) {
      return null;
    }
    if (!this.currentValueId.trim()) {
      return 'Para generar RC necesitás un valueId.';
    }
    if (this.currentIdSuj == null || this.currentIdBie == null) {
      if (this.cuentasRelacionadas.length > 1) {
        return 'Este valueId tiene más de una cuenta relacionada. Elegí una cuenta para poder generar RC.';
      }
      return 'Para generar RC necesitás elegir una cuenta relacionada al valueId.';
    }
    if (this.selectedComprobantes().length === 0) {
      return 'Seleccioná al menos un comprobante pagable.';
    }
    return null;
  }

  get advertenciaSinCuentaRelacionada(): string | null {
    if (!this.currentValueId.trim() || this.referenciasCargando) {
      return null;
    }
    if (!this.referenciasResponse || this.currentIdSuj != null) {
      return null;
    }
    if (this.cuentasRelacionadas.length === 0) {
      return 'No se encontró una cuenta relacionada para este valueId. Consultá referencias o revisá el trámite.';
    }
    return null;
  }

  get rcEtiqueta(): string | null {
    const rc = this.rcData?.rc;
    if (!rc) {
      return null;
    }
    return `${rc.cmte}-${rc.pref}-${rc.nro}`;
  }

  modoManual(): boolean {
    return !this.tieneParametrosRutaValidos();
  }

  esModoValueId(): boolean {
    return this.modoConsulta === 'valueId';
  }

  get valueIdConsultado(): string | null {
    if (this.currentValueId.trim()) {
      return this.currentValueId.trim();
    }
    if (this.tieneParametrosRutaValidos()) {
      return null;
    }
    return this.activeValueId ?? this.ultimaConsultaValueId;
  }

  get tieneConsultaManualActiva(): boolean {
    return this.activeModo != null && this.activeDestino != null;
  }

  destinoUsado(): BodCuentaDestino {
    if (this.tieneParametrosRutaValidos()) {
      return this.routeDestino;
    }
    return this.activeDestino ?? this.manualDestino;
  }

  puedeRecargarCuenta(): boolean {
    if (this.tieneParametrosRutaValidos()) {
      return true;
    }
    if (this.ultimaConsultaTipo === 'idBie') {
      return this.ultimaConsultaDestino != null && this.ultimaConsultaIdBie != null;
    }
    if (this.ultimaConsultaTipo === 'valueId') {
      return this.ultimaConsultaDestino != null && !!this.ultimaConsultaValueId;
    }
    return false;
  }

  consultarManual(): void {
    this.referenciasResponse = null;
    this.referenciasError = null;

    if (this.modoConsulta === 'idBie') {
      const idBie = this.manualIdBie;
      if (idBie == null || !Number.isFinite(idBie) || idBie <= 0) {
        this.error = 'Ingresá un id_Bie numérico mayor a 0.';
        return;
      }

      this.activeDestino = this.manualDestino;
      this.activeModo = 'idBie';
      this.activeIdBie = idBie;
      this.activeValueId = null;
      this.idBie.set(String(idBie));
      this.idSuj.set(null);
      this.establecerUltimaConsulta('idBie', this.manualDestino, idBie, null);
    } else {
      const valueId = this.manualValueId.trim();
      if (!valueId) {
        this.error = 'Ingresá un valueId para consultar la cuenta.';
        return;
      }

      this.activeDestino = this.manualDestino;
      this.activeModo = 'valueId';
      this.activeValueId = valueId;
      this.activeIdBie = null;
      this.idSuj.set(null);
      this.idBie.set(null);
      this.currentValueId = valueId;
      this.establecerUltimaConsulta('valueId', this.manualDestino, null, valueId);
    }

    this.limpiarRcYSeleccion();
    this.error = null;
    this.cargarCuenta();
  }

  consultarReferencias(): void {
    const valueId = this.resolveValueIdParaReferencias();
    if (!valueId) {
      this.referenciasError = 'Ingresá un valueId para consultar referencias.';
      this.referenciasResponse = null;
      return;
    }

    this.cargarReferenciasPorValueId(this.destinoUsado(), valueId);
  }

  verCuentaRelacionada(ref: BodCuentaReferencia): void {
    this.asignarCuentaRelacionada(ref, true);
  }

  esCuentaRelacionadaSeleccionada(ref: BodCuentaReferencia): boolean {
    return ref.idSuj === this.currentIdSuj && ref.idBie === this.currentIdBie;
  }

  comprobanteKey(c: CuentaComprobanteRow): string {
    return c.selectionKey;
  }

  isComprobantePagable(c: CuentaComprobanteRow): boolean {
    if (!c.seleccionable || c.conPagoPendiente || c.estado === 'Bloqueado') {
      return false;
    }
    if (c.saldo <= 0) {
      return false;
    }
    if (!c.cmte || c.pref == null || c.nro == null) {
      return false;
    }
    if (!Number.isFinite(c.pref) || !Number.isFinite(c.nro)) {
      return false;
    }
    return true;
  }

  isComprobanteSelected(c: CuentaComprobanteRow): boolean {
    return this.selectedCmteKeys.includes(this.comprobanteKey(c));
  }

  motivoNoSeleccionable(c: CuentaComprobanteRow): string | null {
    if (this.isComprobantePagable(c)) {
      return null;
    }
    if (!c.seleccionable) {
      return 'No seleccionable';
    }
    if (c.conPagoPendiente) {
      return 'Pago pendiente';
    }
    if (c.estado === 'Bloqueado') {
      return 'Bloqueado';
    }
    if (c.saldo <= 0) {
      return 'Sin saldo';
    }
    return 'No seleccionable';
  }

  toggleComprobante(c: CuentaComprobanteRow): void {
    if (!this.isComprobantePagable(c)) {
      return;
    }
    const key = this.comprobanteKey(c);
    if (this.selectedCmteKeys.includes(key)) {
      this.selectedCmteKeys = this.selectedCmteKeys.filter((k) => k !== key);
    } else {
      this.selectedCmteKeys = [...this.selectedCmteKeys, key];
    }
  }

  selectedComprobantes(): BodCmteRefRequest[] {
    return this.comprobantes
      .filter((c) => this.isComprobanteSelected(c) && this.isComprobantePagable(c))
      .map((c) => ({
        cmte: c.cmte,
        pref: c.pref!,
        nro: c.nro!,
      }));
  }

  generarRc(): void {
    const destino = this.currentDestino;
    const valueId = this.currentValueId.trim();
    const idSuj = this.currentIdSuj;
    const idBie = this.currentIdBie;
    const cmtes = this.selectedComprobantes();

    if (!valueId) {
      this.rcError =
        'Para generar RC necesitás consultar la cuenta desde un valueId o abrirla desde un flujo que informe valueId.';
      return;
    }

    if (idSuj == null || idBie == null) {
      this.rcError = 'No se pudo resolver id_Suj o id_Bie para generar el RC.';
      return;
    }

    if (cmtes.length === 0) {
      this.rcError = 'Seleccioná al menos un comprobante pagable.';
      return;
    }

    let returnUrl =
      `${window.location.origin}/bod/cuenta/${idSuj}/${idBie}` +
      `?destino=${encodeURIComponent(destino)}` +
      `&valueId=${encodeURIComponent(valueId)}`;
    if (this.returnTo?.startsWith('/')) {
      returnUrl += `&returnTo=${encodeURIComponent(this.returnTo)}`;
    }

    this.rcGenerando = true;
    this.rcError = null;
    this.rcMensaje = null;
    this.rcResponse = null;
    this.rcData = null;
    this.rcLinkToMasPagos = null;
    this.rcPdfError = null;

    this.bodApi
      .generarRcCuenta(destino, valueId, {
        id_Suj: idSuj,
        id_Bie: idBie,
        returnUrl,
        cmtes,
      })
      .pipe(
        finalize(() => {
          this.rcGenerando = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.rcResponse = response;
          this.rcData = response.data ?? null;
          this.rcLinkToMasPagos = resolveCuentaRcLink(response);
          this.rcMensaje = 'RC generado correctamente.';
          this.rcError = null;
        },
        error: (err: unknown) => {
          this.rcError = this.formatHttpError(err, 'generar el RC');
          this.rcMensaje = null;
        },
      });
  }

  continuarMasPagosRc(): void {
    if (!this.rcLinkToMasPagos) {
      this.rcError = 'No hay link de MASPagos disponible.';
      return;
    }
    this.rcError = null;
    window.location.href = this.rcLinkToMasPagos;
  }

  descargarRcPdf(): void {
    const destino = this.currentDestino;
    const valueId = this.currentValueId.trim();
    const rc = this.rcData?.rc;

    if (!valueId) {
      this.rcPdfError = 'No hay valueId para descargar el PDF del RC.';
      return;
    }

    if (!rc?.cmte || rc.pref == null || rc.nro == null) {
      this.rcPdfError = 'No hay datos del RC generado para descargar el PDF.';
      return;
    }

    this.rcPdfDescargando = true;
    this.rcPdfError = null;

    this.bodApi
      .descargarRcPdf(destino, valueId, rc.cmte, rc.pref, rc.nro)
      .pipe(
        finalize(() => {
          this.rcPdfDescargando = false;
        }),
      )
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `RC-${rc.pref}-${rc.nro}.pdf`;
          a.click();
          URL.revokeObjectURL(url);
          this.rcPdfError = null;
        },
        error: (err: unknown) => {
          this.rcPdfError = this.formatHttpError(err, 'descargar el PDF del RC');
        },
      });
  }

  get referencias(): BodCuentaReferencia[] {
    if (!this.referenciasResponse?.data || !Array.isArray(this.referenciasResponse.data)) {
      return [];
    }
    return this.referenciasResponse.data;
  }

  get cuentasRelacionadas(): BodCuentaReferencia[] {
    return this.referencias.filter((ref) => {
      const kind = (ref.kind ?? '').toLowerCase();
      return (
        kind === 'cuenta' &&
        ref.idSuj != null &&
        ref.idBie != null &&
        Number.isFinite(ref.idSuj) &&
        Number.isFinite(ref.idBie)
      );
    });
  }

  get comprobantesReferenciados(): BodCuentaReferencia[] {
    return this.referencias.filter((ref) => {
      const kind = (ref.kind ?? '').toLowerCase();
      return (
        kind === 'comprobante' &&
        ref.cmte != null &&
        ref.pref != null &&
        ref.nro != null
      );
    });
  }

  get totalVencido(): number {
    const data = this.getCuentaData();
    return Number(data?.sven_Total ?? 0);
  }

  get totalAVencer(): number {
    const data = this.getCuentaData();
    return Number(data?.saven_Total ?? 0);
  }

  get totalBloqueado(): number {
    const data = this.getCuentaData();
    return Number(data?.sbloq_Total ?? 0);
  }

  get conceptos(): BodCuentaConcepto[] {
    if (!this.cuenta) {
      return [];
    }

    const data = this.getCuentaData();
    if (Array.isArray(data?.conceptos)) {
      return data.conceptos;
    }

    if (Array.isArray(this.cuenta.conceptos)) {
      return this.cuenta.conceptos;
    }

    return [];
  }

  get comprobantes(): CuentaComprobanteRow[] {
    const filas: CuentaComprobanteRow[] = [];

    for (const concepto of this.conceptos) {
      const conceptoLabel = concepto.tipoDeno ?? concepto.tipo ?? '';
      const cmtes = concepto.cmtes ?? [];

      for (const cmte of cmtes) {
        const cmteCod = cmte.c_CmteO ?? '';
        const pref = cmte.c_PrefO ?? null;
        const nro = cmte.c_NroO ?? null;
        filas.push({
          concepto: conceptoLabel,
          cmte: cmteCod,
          pref,
          nro,
          eje: cmte.eje ?? null,
          idTri: cmte.id_Tri ?? null,
          cuotaInfoDeno: cmte.cuotaInfoDeno ?? '',
          cuotaInfoDenoExtra: cmte.cuotaInfoDenoExtra ?? '',
          vto1: cmte.vto1 ?? null,
          vto2: cmte.vto2 ?? null,
          saldo: Number(cmte.saldo_Total ?? 0),
          seleccionable: !!cmte.siSeleccionable,
          conPagoPendiente: !!cmte.conPagoPendiente,
          estado: this.estadoComprobante(cmte),
          selectionKey: `${cmteCod}-${pref}-${nro}`,
        });
      }
    }

    return filas;
  }

  get tieneConceptos(): boolean {
    return this.conceptos.length > 0;
  }

  get tieneComprobantes(): boolean {
    return this.comprobantes.length > 0;
  }

  get estadoCuentaTexto(): string {
    if (!this.cuenta) {
      return 'Sin datos';
    }

    const vencido = this.totalVencido;
    const aVencer = this.totalAVencer;

    if (vencido > 0) {
      return 'Registra deuda vencida';
    }

    if (aVencer > 0 && vencido <= 0) {
      return 'Registra deuda a vencer';
    }

    if (vencido === 0 && aVencer === 0) {
      return 'Sin deuda informada';
    }

    return 'Cuenta consultada';
  }

  conceptoEtiqueta(concepto: BodCuentaConcepto): string {
    return concepto.tipoDeno ?? concepto.tipo ?? 'Concepto';
  }

  cantidadComprobantes(concepto: BodCuentaConcepto): number {
    return concepto.cmtes?.length ?? 0;
  }

  comprobanteEtiqueta(c: CuentaComprobanteRow): string {
    const pref = c.pref ?? '';
    const nro = c.nro ?? '';
    return `${c.cmte}-${pref}-${nro}`;
  }

  formatMoney(value: number | null | undefined): string {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
    }).format(Number(value ?? 0));
  }

  formatDate(value: string | null | undefined): string {
    if (!value) {
      return '-';
    }
    const fecha = new Date(value);
    if (Number.isNaN(fecha.getTime())) {
      return value;
    }
    return new Intl.DateTimeFormat('es-AR').format(fecha);
  }

  cargarCuenta(): void {
    const request$ = this.resolveCuentaRequest();

    if (!request$) {
      if (!this.modoManual()) {
        this.error = 'El parámetro id_Bie de la ruta no es válido.';
        this.cuenta = null;
      }
      return;
    }

    this.limpiarRcYSeleccion();
    this.cargando = true;
    this.error = null;

    request$
      .pipe(
        finalize(() => {
          this.cargando = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.cuenta = response;
          this.error = null;
          if (this.esConsultaPorValueId()) {
            const valueId = this.resolveValueIdParaReferencias();
            if (valueId) {
              this.cargarReferenciasPorValueId(this.destinoUsado(), valueId);
            }
          }
        },
        error: (err: unknown) => {
          this.error = this.formatHttpError(err, 'consultar la cuenta corriente');
          this.cuenta = null;
        },
      });
  }

  private resolveValueIdParaReferencias(): string {
    return (
      this.currentValueId.trim() ||
      this.manualValueId.trim() ||
      this.activeValueId?.trim() ||
      this.ultimaConsultaValueId?.trim() ||
      ''
    );
  }

  private esConsultaPorValueId(): boolean {
    if (this.activeModo === 'valueId') {
      return true;
    }
    return this.ultimaConsultaTipo === 'valueId';
  }

  private cargarReferenciasPorValueId(destino: BodCuentaDestino, valueId: string): void {
    this.currentValueId = valueId;
    this.referenciasCargando = true;
    this.referenciasError = null;

    this.bodApi
      .getCuentaReferenciasPorValueId(destino, valueId)
      .pipe(
        finalize(() => {
          this.referenciasCargando = false;
        }),
      )
      .subscribe({
        next: (response) => {
          this.referenciasResponse = response;
          this.referenciasError = null;
          this.aplicarCuentasRelacionadasTrasReferencias();
        },
        error: (err: unknown) => {
          this.referenciasError = this.formatHttpError(err, 'consultar referencias');
          this.referenciasResponse = null;
        },
      });
  }

  private aplicarCuentasRelacionadasTrasReferencias(): void {
    const cuentas = this.cuentasRelacionadas;

    if (cuentas.length === 1) {
      this.asignarCuentaRelacionada(cuentas[0], false);
      return;
    }

    if (cuentas.length > 1) {
      const seleccionValida = cuentas.some((ref) => this.esCuentaRelacionadaSeleccionada(ref));
      if (!seleccionValida) {
        this.idSuj.set(null);
        this.idBie.set(null);
      }
    }
  }

  private asignarCuentaRelacionada(ref: BodCuentaReferencia, recargarCuenta: boolean): void {
    const idSuj = ref.idSuj;
    const idBie = ref.idBie;
    if (
      idSuj == null ||
      idBie == null ||
      !Number.isFinite(idSuj) ||
      !Number.isFinite(idBie) ||
      idBie <= 0
    ) {
      this.error = 'La referencia de cuenta no tiene id_Suj o id_Bie válidos.';
      return;
    }

    const destino = this.destinoUsado();
    if (!this.currentValueId.trim()) {
      const valueId = this.resolveValueIdParaReferencias();
      if (valueId) {
        this.currentValueId = valueId;
      }
    }

    this.idSuj.set(String(idSuj));
    this.idBie.set(String(idBie));
    this.activeDestino = destino;
    this.activeIdBie = idBie;
    this.error = null;

    if (recargarCuenta) {
      this.activeModo = 'idBie';
      this.establecerUltimaConsulta('idBie', destino, idBie, this.currentValueId || null);
      this.limpiarRcYSeleccion();
      this.cargarCuenta();
    }
  }

  private resolveCuentaRequest(): Observable<BodCuentaCorrienteResponse> | null {
    if (this.tieneParametrosRutaValidos()) {
      const idBie = this.parseRouteId(this.idBie());
      if (idBie == null) {
        return null;
      }
      return this.bodApi.getCuentaCorrientePorIdBie(this.routeDestino, idBie);
    }

    if (this.ultimaConsultaTipo === 'idBie' && this.ultimaConsultaDestino && this.ultimaConsultaIdBie) {
      return this.bodApi.getCuentaCorrientePorIdBie(
        this.ultimaConsultaDestino,
        this.ultimaConsultaIdBie,
      );
    }

    if (this.ultimaConsultaTipo === 'valueId' && this.ultimaConsultaDestino && this.ultimaConsultaValueId) {
      return this.bodApi.getCuentaCorrientePorValueId(
        this.ultimaConsultaDestino,
        this.ultimaConsultaValueId,
      );
    }

    if (this.activeDestino == null || this.activeModo == null) {
      return null;
    }

    if (this.activeModo === 'idBie' && this.activeIdBie != null) {
      return this.bodApi.getCuentaCorrientePorIdBie(this.activeDestino, this.activeIdBie);
    }

    if (this.activeModo === 'valueId' && this.activeValueId) {
      return this.bodApi.getCuentaCorrientePorValueId(this.activeDestino, this.activeValueId);
    }

    return null;
  }

  private initManualFromQuery(query: ParamMap): void {
    this.modoConsulta = 'idBie';
    this.manualDestino = 'habilitaciones';
    this.manualIdBie = null;
    this.manualValueId = '';
    this.applyQueryParams(query);
  }

  private applyRouteDestinoFromQuery(query: ParamMap): void {
    const destino = query.get('destino');
    if (destino === 'habilitaciones' || destino === 'faltas' || destino === 'cementerio') {
      this.routeDestino = destino;
    } else {
      this.routeDestino = 'habilitaciones';
    }
  }

  private applyQueryParams(query: ParamMap): void {
    const destino = query.get('destino');
    if (destino === 'habilitaciones' || destino === 'faltas' || destino === 'cementerio') {
      this.manualDestino = destino;
      this.routeDestino = destino;
    }

    const modo = query.get('modo');
    if (modo === 'idBie' || modo === 'valueId') {
      this.modoConsulta = modo;
    }

    const valueId = query.get('valueId');
    if (valueId) {
      this.manualValueId = valueId;
      this.currentValueId = valueId.trim();
    }

    const idBie = query.get('idBie');
    if (idBie) {
      const parsed = Number(idBie);
      if (Number.isFinite(parsed) && parsed > 0) {
        this.manualIdBie = parsed;
      }
    }
  }

  private establecerUltimaConsultaRuta(): void {
    const idBie = this.parseRouteId(this.idBie());
    if (idBie == null) {
      return;
    }
    this.ultimaConsultaTipo = 'idBie';
    this.ultimaConsultaDestino = this.routeDestino;
    this.ultimaConsultaIdBie = idBie;
    this.ultimaConsultaValueId = null;
  }

  private establecerUltimaConsulta(
    tipo: 'idBie' | 'valueId',
    destino: BodCuentaDestino,
    idBie: number | null,
    valueId: string | null,
  ): void {
    this.ultimaConsultaTipo = tipo;
    this.ultimaConsultaDestino = destino;
    this.ultimaConsultaIdBie = idBie;
    this.ultimaConsultaValueId = valueId;
  }

  private limpiarRcYSeleccion(): void {
    this.selectedCmteKeys = [];
    this.rcGenerando = false;
    this.rcError = null;
    this.rcMensaje = null;
    this.rcResponse = null;
    this.rcData = null;
    this.rcLinkToMasPagos = null;
    this.rcPdfDescargando = false;
    this.rcPdfError = null;
  }

  private resetConsultaActiva(): void {
    this.activeDestino = null;
    this.activeModo = null;
    this.activeIdBie = null;
    this.activeValueId = null;
    this.ultimaConsultaTipo = null;
    this.ultimaConsultaDestino = null;
    this.ultimaConsultaIdBie = null;
    this.ultimaConsultaValueId = null;
  }

  private tieneParametrosRutaValidos(): boolean {
    const idBie = this.parseRouteId(this.idBie());
    return idBie != null && idBie > 0;
  }

  private getCuentaData(): BodCuentaCorrienteResumen | null {
    const cuentaAny = this.cuenta as Record<string, unknown> | null;
    if (!cuentaAny) {
      return null;
    }

    const data = cuentaAny['data'] ?? cuentaAny;
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as BodCuentaCorrienteResumen;
    }

    return null;
  }

  private estadoComprobante(cmte: {
    bloqueado?: boolean;
    conPagoPendiente?: boolean;
    estaVencido?: boolean;
  }): string {
    if (cmte.bloqueado) {
      return 'Bloqueado';
    }
    if (cmte.conPagoPendiente) {
      return 'Pago pendiente';
    }
    if (cmte.estaVencido) {
      return 'Vencido';
    }
    return 'A vencer';
  }

  private parseRouteId(value: string | null): number | null {
    if (value == null || value.trim() === '') {
      return null;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return null;
    }
    return parsed;
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
