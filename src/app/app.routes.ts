import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Logout } from './pages/logout/logout';
import { ShieldGuard } from './auth/guards';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'logout', component: Logout },
    // 👇 ESTA es la que te preocupa
    {
        path: 'datos/:sujeto/:cuenta',
        loadComponent: () =>
            import('./pages/datos/datos').then(m => m.Datos),
        canMatch: [ShieldGuard]   // ⭐ clave
    },
    {
        path: 'habilitaciones',
        loadComponent: () =>
            import('./habilitaciones').then(m => m.Habilitaciones),
        canMatch: [ShieldGuard],
    },
    {
        path: 'habilitaciones/:valueId',
        loadComponent: () =>
            import('./habilitaciones').then(m => m.Habilitaciones),
        canMatch: [ShieldGuard],
    },
    { path: '**', redirectTo: '/' },
];
