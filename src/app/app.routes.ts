import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    title: 'Discover Research — CORE Research Explorer',
    loadComponent: () =>
      import('./features/research-search/research-explorer-page.component').then(
        (m) => m.ResearchExplorerPageComponent
      ),
  },
  {
    path: 'analytics',
    title: 'Research Analytics — CORE Research Explorer',
    loadComponent: () =>
      import('./features/research-analytics/analytics-page.component').then(
        (m) => m.AnalyticsPageComponent
      ),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
