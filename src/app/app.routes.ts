import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Logout } from './pages/logout/logout';
import { Habilitaciones } from './pages/habilitaciones/habilitaciones';
import { ShieldGuard } from './auth/guards';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'logout', component: Logout },
    { path: 'habilitaciones', component: Habilitaciones },
    // 👇 ESTA es la que te preocupa
    {
        path: 'datos/:sujeto/:cuenta',
        loadComponent: () =>
            import('./pages/datos/datos').then(m => m.Datos),
        canMatch: [ShieldGuard]   // ⭐ clave
    },
    { path: '**', redirectTo: '/' },
];
