import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="top-bar">
      <div class="top-bar__inner">
        <a class="top-bar__brand" routerLink="/">
          <svg
            class="top-bar__mark"
            width="22"
            height="22"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="6" fill="#14213D" />
            <circle cx="14.5" cy="14.5" r="6.5" stroke="#FFFFFF" stroke-width="2.2" />
            <path d="M19.5 19.5L25 25" stroke="#60A5FA" stroke-width="2.6" stroke-linecap="round" />
            <circle cx="14.5" cy="14.5" r="2.1" fill="#60A5FA" />
          </svg>
          <span>CORE Research Explorer</span>
        </a>

        <nav class="top-bar__nav" aria-label="Primary">
          <a
            routerLink="/"
            routerLinkActive="is-active"
            [routerLinkActiveOptions]="{ exact: true }"
            class="top-bar__link"
          >
            Discover
          </a>
          <a routerLink="/analytics" routerLinkActive="is-active" class="top-bar__link">
            Analytics
          </a>
        </nav>

        <div class="top-bar__utilities">
          <button
            type="button"
            class="top-bar__theme-btn"
            (click)="themeService.toggleTheme()"
            [attr.aria-pressed]="themeService.theme() === 'dark'"
            [attr.aria-label]="
              themeService.theme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'
            "
            data-testid="theme-toggle-btn"
          >
            @if (themeService.theme() === 'dark') {
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2" />
                <path d="M12 20v2" />
                <path d="m4.93 4.93 1.41 1.41" />
                <path d="m17.66 17.66 1.41 1.41" />
                <path d="M2 12h2" />
                <path d="M20 12h2" />
                <path d="m6.34 17.66-1.41 1.41" />
                <path d="m19.07 4.93-1.41 1.41" />
              </svg>
              <span class="top-bar__theme-label">Light</span>
            } @else {
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
              <span class="top-bar__theme-label">Dark</span>
            }
          </button>

          <a
            class="top-bar__external"
            href="https://core.ac.uk/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit official CORE website (opens in a new tab)"
          >
            <span>CORE.ac.uk</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M7 17 17 7" />
              <path d="M7 7h10v10" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  `,
  styles: `
    @use '../../../../styles/mixins' as *;

    .top-bar {
      position: sticky;
      top: 0;
      z-index: 40;
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      min-height: var(--header-height);
    }

    .top-bar__inner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-2);
      min-height: var(--header-height);
      @include container;

      @include respond-above($bp-tablet) {
        gap: var(--space-8);
      }
    }

    .top-bar__brand {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.84375rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--color-navy);
      white-space: nowrap;
      flex-shrink: 0;
      text-decoration: none;

      &:hover {
        text-decoration: none;
        color: var(--color-accent);
      }

      @include respond-above($bp-tablet) {
        font-size: 1.0625rem;
      }
    }

    .top-bar__mark {
      flex-shrink: 0;
      color: var(--color-navy);
    }

    .top-bar__nav {
      display: flex;
      align-items: center;
      gap: var(--space-3);

      @include respond-above($bp-tablet) {
        gap: var(--space-6);
      }
    }

    .top-bar__link {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
      white-space: nowrap;
      flex-shrink: 0;
      padding-block: var(--space-2);
      border-bottom: 2px solid transparent;
      text-decoration: none;
      transition: color var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        color: var(--color-text-primary);
        text-decoration: none;
      }

      &.is-active {
        color: var(--color-text-primary);
        font-weight: 600;
        border-bottom-color: var(--color-accent);
      }

      @include respond-above($bp-tablet) {
        font-size: 0.9375rem;
      }
    }

    .top-bar__utilities {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      flex-shrink: 0;
    }

    .top-bar__theme-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-1);
      min-height: 34px;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
      color: var(--color-navy);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: border-color var(--transition-fast), color var(--transition-fast);

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }

      @include respond-above($bp-tablet) {
        padding: var(--space-2) var(--space-3);
      }
    }

    .top-bar__theme-label {
      display: none;

      @include respond-above($bp-tablet) {
        display: inline;
      }
    }

    .top-bar__external {
      display: none;
      align-items: center;
      gap: var(--space-1);
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-navy);
      white-space: nowrap;
      flex-shrink: 0;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      text-decoration: none;
      transition: border-color var(--transition-fast), color var(--transition-fast);

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
        text-decoration: none;
      }

      @include respond-above($bp-tablet) {
        display: inline-flex;
      }
    }
  `,
})
export class AppHeaderComponent {
  protected readonly themeService = inject(ThemeService);
}
