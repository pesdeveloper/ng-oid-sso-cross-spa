import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-habilitaciones',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './habilitaciones.html',
  styleUrl: './habilitaciones.scss'
})
export class Habilitaciones {

  goToExternal() {
    window.location.href = 'https://localhost:4203/tasas';
  }

}
