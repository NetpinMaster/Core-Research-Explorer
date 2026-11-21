import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppFooterComponent } from './shared/components/app-footer/app-footer.component';
import { AppHeaderComponent } from './shared/components/app-header/app-header.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AppHeaderComponent, AppFooterComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip-link" href="#main-content">Skip to main content</a>
    <div class="app-shell">
      <app-header />

      <main id="main-content" class="app-main" tabindex="-1">
        <router-outlet />
      </main>

      <app-footer />
    </div>
  `,
  styles: `
    .app-shell {
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
    }

    .app-main {
      flex: 1 0 auto;
    }
  `,
})
export class AppComponent {}
