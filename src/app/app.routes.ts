import { Routes } from '@angular/router';
import { Home } from './pages/home/home';
import { Logout } from './pages/logout/logout';
import { Habilitaciones } from './pages/habilitaciones/habilitaciones';

export const routes: Routes = [
    { path: '', component: Home },
    { path: 'logout', component: Logout },
    { path: 'habilitaciones', component: Habilitaciones },
    { path: 'tasas', redirectTo: '/habilitaciones', pathMatch: 'full' },
    { path: '**', redirectTo: '/' },
];
