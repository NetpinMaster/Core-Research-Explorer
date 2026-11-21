import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-paper-card-skeleton',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="skeleton-list" role="status" aria-label="Loading research papers">
      @for (item of items(); track item) {
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton-line skeleton-line--meta"></div>
          <div class="skeleton-line skeleton-line--title"></div>
          <div class="skeleton-line skeleton-line--title-short"></div>
          <div class="skeleton-line skeleton-line--authors"></div>
          <div class="skeleton-line skeleton-line--body"></div>
          <div class="skeleton-line skeleton-line--body-short"></div>
        </div>
      }
    </div>
  `,
  styles: `
    .skeleton-list {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
    }

    .skeleton-card {
      padding: var(--space-5);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .skeleton-line {
      height: 12px;
      border-radius: 4px;
      background-color: var(--color-surface-muted);
      animation: skeleton-shimmer 1.4s ease-in-out infinite;
    }

    .skeleton-line--meta {
      width: 34%;
      height: 11px;
    }

    .skeleton-line--title {
      width: 88%;
      height: 18px;
    }

    .skeleton-line--title-short {
      width: 62%;
      height: 18px;
    }

    .skeleton-line--authors {
      width: 48%;
      height: 12px;
    }

    .skeleton-line--body {
      width: 100%;
    }

    .skeleton-line--body-short {
      width: 76%;
    }

    @keyframes skeleton-shimmer {
      0%,
      100% {
        opacity: 0.95;
      }
      50% {
        opacity: 0.45;
      }
    }
  `,
})
export class PaperCardSkeletonComponent {
  readonly count = input<number>(4);
  protected readonly items = computed(() =>
    Array.from({ length: Math.max(1, this.count()) }, (_, index) => index)
  );
}
