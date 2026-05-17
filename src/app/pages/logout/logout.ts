import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-logout',
  imports: [],
  templateUrl: './logout.html',
  styleUrl: './logout.scss',
})
export class Logout implements OnInit {
  private router = inject(Router);
  ngOnInit(): void {
    // Este componente es el postLogoutRedirectUri.
    // La limpieza de la sesión local la realiza el AuthSessionFacade.logout() ANTES de redirigir al IdP.
    // La única responsabilidad aquí es navegar al usuario a una página segura (la raíz).
    this.router.navigateByUrl('/');
  }
}
