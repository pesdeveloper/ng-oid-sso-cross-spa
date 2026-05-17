import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-habilitaciones',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './habilitaciones.html',
  styleUrl: './habilitaciones.scss',
})
export class Habilitaciones implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly valueId = signal<string | null>(null);

  readonly pasos = [
    'Alta cuenta comercio/persona',
    'Emitir tasa de habilitaciones',
    'Continuar a MASPagos',
    'Leer cuenta corriente',
  ];

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.valueId.set(params.get('valueId'));
    });
  }

  volverAlInicio(): void {
    void this.router.navigate(['/']);
  }
}
