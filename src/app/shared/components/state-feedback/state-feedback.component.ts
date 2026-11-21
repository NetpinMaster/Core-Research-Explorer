import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

export type FeedbackVariant = 'idle' | 'empty' | 'error';

@Component({
  selector: 'app-state-feedback',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="feedback"
      [class.feedback--error]="variant() === 'error'"
      [attr.role]="variant() === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="variant() === 'error' ? 'assertive' : 'polite'"
    >
      <div class="feedback__icon" aria-hidden="true">
        @if (variant() === 'error') {
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        } @else if (variant() === 'empty') {
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="8" y1="11" x2="14" y2="11" />
          </svg>
        } @else {
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        }
      </div>

      <h3 class="feedback__title">{{ title() }}</h3>
      <p class="feedback__message">{{ message() }}</p>

      @if (detail()) {
        <p class="feedback__detail tabular-nums">{{ detail() }}</p>
      }

      @if (actionLabel()) {
        <button type="button" class="feedback__action" (click)="action.emit()">
          {{ actionLabel() }}
        </button>
      }
    </div>
  `,
  styles: `
    .feedback {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: var(--space-10) var(--space-6);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      gap: var(--space-3);
    }

    .feedback--error {
      background-color: var(--color-error-bg);
      border-color: var(--color-error-border);
    }

    .feedback__icon {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      border-radius: var(--radius-md);
      background-color: var(--color-surface-muted);
      color: var(--color-navy);
    }

    .feedback--error .feedback__icon {
      background-color: var(--color-surface);
      color: var(--color-error);
    }

    .feedback__title {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .feedback--error .feedback__title {
      color: var(--color-error);
    }

    .feedback__message {
      max-width: 52ch;
      font-size: 0.9375rem;
      color: var(--color-text-secondary);
    }

    .feedback__detail {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .feedback__action {
      margin-top: var(--space-2);
      min-height: 42px;
      padding: var(--space-2) var(--space-5);
      border: 1px solid var(--color-accent);
      border-radius: var(--radius-sm);
      background-color: var(--color-accent);
      color: #ffffff;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color var(--transition-fast), border-color var(--transition-fast);

      &:hover {
        background-color: var(--color-accent-hover);
        border-color: var(--color-accent-hover);
      }
    }
  `,
})
export class StateFeedbackComponent {
  readonly variant = input<FeedbackVariant>('idle');
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly detail = input<string | null>(null);
  readonly actionLabel = input<string | null>(null);

  readonly action = output<void>();
}
