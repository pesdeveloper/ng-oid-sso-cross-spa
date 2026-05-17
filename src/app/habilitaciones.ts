import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
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

  readonly valueId = signal<string | null>(null);

  readonly pasosPendientes = [
    'Emitir tasa de habilitaciones',
    'Continuar a MASPagos',
    'Leer cuenta corriente',
  ];

  altaFormVisible = false;
  altaForm: HabilitacionAltaLocalForm = createEmptyAltaForm();
  requestPreview: HabilitacionAltaRequestPreview | null = null;
  altaPreparada = false;

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
    this.altaPreparada = false;
    this.actualizarPreview();
  }

  cancelarAlta(): void {
    this.altaFormVisible = false;
    this.altaForm = createEmptyAltaForm();
    this.requestPreview = null;
    this.altaPreparada = false;
  }

  actualizarPreview(): void {
    this.requestPreview = {
      ...this.altaForm,
      origen: 'habilitaciones-spa',
    };
  }

  marcarAltaPreparada(): void {
    this.actualizarPreview();
    this.altaPreparada = true;
  }

  generarDatosMockAlta(): void {
    this.altaFormVisible = true;
    this.altaPreparada = false;

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

  private generarCuitMock(): string {
    const prefijos = ['20', '27', '30'];
    const prefijo = prefijos[randNumber({ min: 0, max: 2 })];
    const central = String(randNumber({ min: 0, max: 99_999_999 })).padStart(8, '0');
    const verificador = randNumber({ min: 0, max: 9 });
    return `${prefijo}-${central}-${verificador}`;
  }
}
