import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-datos',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  templateUrl: './datos.html',
  styleUrl: './datos.scss'
})
export class Datos implements OnInit {
  private readonly route = inject(ActivatedRoute);

  sujeto = signal<string | null>(null);
  cuenta = signal<string | null>(null);
  valor = signal<string | null>(null);

  ngOnInit() {
    console.log('BOD: Datos.ngOnInit() <<<<<');

    this.route.paramMap.subscribe(params => {
      this.sujeto.set(params.get('sujeto'));
      this.cuenta.set(params.get('cuenta'));
    });

    this.route.queryParamMap.subscribe(params => {
      this.valor.set(params.get('v'));
    });
  }
}
