import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-footer',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="app-footer">
      <div class="app-footer__inner">
        <div class="app-footer__primary">
          <p class="app-footer__brand">CORE Research Explorer</p>
          <p class="app-footer__copy">
            Scientific discovery &amp; publication analytics interface · Built with Angular 20
          </p>
        </div>
        <div class="app-footer__attribution">
          <p>
            Research metadata sourced from
            <a href="https://core.ac.uk/" target="_blank" rel="noopener noreferrer">
              CORE (Connecting Repositories)
            </a>
            via the
            <a href="https://api.core.ac.uk/docs/v3" target="_blank" rel="noopener noreferrer">
              CORE API v3
            </a>
            .
          </p>
        </div>
      </div>
    </footer>
  `,
  styles: `
    @use '../../../../styles/mixins' as *;

    .app-footer {
      border-top: 1px solid var(--color-border);
      background-color: var(--color-surface);
      padding-block: var(--space-6);
      margin-top: var(--space-10);
    }

    .app-footer__inner {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      font-size: 0.875rem;
      color: var(--color-text-muted);
      @include container;

      @include respond-above($bp-tablet) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .app-footer__primary {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .app-footer__brand {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .app-footer__copy {
      font-size: 0.8125rem;
    }

    .app-footer__attribution {
      font-size: 0.8125rem;
    }
  `,
})
export class AppFooterComponent {}
