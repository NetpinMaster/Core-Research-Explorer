import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { ResearchPaper } from '../../../core/models/research-paper.model';
import { copyTextToClipboard } from '../../../shared/utilities/clipboard.util';
import { assessMetadataCompleteness } from '../../../shared/utilities/metadata-completeness.util';

@Component({
  selector: 'app-research-paper-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="paper-card" [attr.aria-labelledby]="'paper-title-' + paper().id">
      <div class="paper-card__kicker">
        <span class="paper-card__year tabular-nums">
          @if (paper().hasValidYear && paper().yearPublished !== null) {
            {{ paper().yearPublished }}
          } @else {
            Year unavailable
          }
        </span>

        @if (venueLabel()) {
          <span class="paper-card__sep" aria-hidden="true">·</span>
          <span class="paper-card__venue">{{ venueLabel() }}</span>
        }

        @if (paper().fieldOfStudy) {
          <span class="paper-card__sep" aria-hidden="true">·</span>
          <span>{{ paper().fieldOfStudy }}</span>
        }

        @if (paper().openAccessStatus === 'fulltext') {
          <span class="paper-card__sep" aria-hidden="true">·</span>
          <span class="paper-card__oa">
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 9.9-1" />
            </svg>
            <span>Open-access full text</span>
          </span>
        }
      </div>

      <h3 class="paper-card__title" [id]="'paper-title-' + paper().id">
        @if (primaryLink()) {
          <a
            class="paper-card__title-link"
            [href]="primaryLink()"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ paper().title }}
          </a>
        } @else {
          {{ paper().title }}
        }
      </h3>

      @if (authorsLine()) {
        <p class="paper-card__authors">{{ authorsLine() }}</p>
      }

      @if (paper().abstractText) {
        <p class="paper-card__abstract">{{ paper().abstractText }}</p>
      }

      <footer class="paper-card__footer">
        <div class="paper-card__identifiers">
          @if (paper().doi) {
            <span class="paper-card__doi tabular-nums">DOI: {{ paper().doi }}</span>
          }
          @if (paper().dataProvider && paper().dataProvider !== venueLabel()) {
            @if (paper().doi) {
              <span class="paper-card__sep" aria-hidden="true">·</span>
            }
            <span class="paper-card__provider">Repository: {{ paper().dataProvider }}</span>
          }
          @if (paper().doi || (paper().dataProvider && paper().dataProvider !== venueLabel())) {
            <span class="paper-card__sep" aria-hidden="true">·</span>
          }
          <span
            class="paper-card__completeness tabular-nums"
            [title]="completeness().summary"
            data-testid="paper-completeness"
          >
            Metadata: {{ completeness().score }}/{{ completeness().total }}
          </span>
        </div>

        <div class="paper-card__links">
          <button
            type="button"
            class="paper-card__action-btn"
            (click)="inspectPaper.emit(paper())"
            data-testid="paper-details-btn"
          >
            Details
          </button>

          @if (copyTarget(); as target) {
            <button
              type="button"
              class="paper-card__action-btn"
              (click)="handleCopy(target.value)"
              [attr.aria-label]="target.label + ' for ' + paper().title"
              data-testid="paper-copy-btn"
            >
              {{ copied() ? 'Copied' : target.label }}
            </button>
          }

          @if (paper().downloadUrl) {
            <a
              class="paper-card__link paper-card__link--primary"
              [href]="paper().downloadUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              Full text
            </a>
          }
          @if (paper().coreUrl && paper().coreUrl !== paper().downloadUrl) {
            <a
              class="paper-card__link"
              [href]="paper().coreUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              CORE record
            </a>
          } @else if (paper().sourceUrl && paper().sourceUrl !== paper().downloadUrl) {
            <a
              class="paper-card__link"
              [href]="paper().sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              View source
            </a>
          }
          <span class="sr-only" role="status" aria-live="polite">
            {{ copied() ? 'Copied reference to clipboard.' : '' }}
          </span>
        </div>
      </footer>
    </article>
  `,
  styles: `
    .paper-card {
      padding: var(--space-5);
      background-color: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      transition: border-color var(--transition-fast);

      &:hover {
        border-color: var(--color-border-strong);
      }
    }

    .paper-card__kicker {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .paper-card__year {
      font-weight: 600;
      color: var(--color-text-primary);
    }

    .paper-card__venue {
      color: var(--color-text-secondary);
      overflow-wrap: anywhere;
    }

    .paper-card__sep {
      color: var(--color-border-strong);
    }

    .paper-card__oa {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
      color: var(--color-success);
    }

    .paper-card__title {
      font-size: 1.0625rem;
      font-weight: 600;
      line-height: 1.38;
      color: var(--color-text-primary);
      overflow-wrap: anywhere;
    }

    .paper-card__title-link {
      color: inherit;
      text-decoration: none;

      &:hover {
        color: var(--color-accent);
        text-decoration: underline;
      }
    }

    .paper-card__authors {
      font-size: 0.875rem;
      color: var(--color-text-secondary);
      line-height: 1.45;
    }

    .paper-card__abstract {
      font-size: 0.90625rem;
      color: var(--color-text-secondary);
      line-height: 1.6;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }

    .paper-card__footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding-top: var(--space-3);
      border-top: 1px solid var(--color-border);
      font-size: 0.8125rem;
    }

    .paper-card__identifiers {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-text-muted);
      min-width: 0;
    }

    .paper-card__doi {
      font-size: 0.78125rem;
      overflow-wrap: anywhere;
    }

    .paper-card__provider {
      overflow-wrap: anywhere;
    }

    .paper-card__completeness {
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .paper-card__links {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    .paper-card__action-btn {
      padding: 0;
      border: none;
      background: transparent;
      color: var(--color-text-secondary);
      font-size: 0.8125rem;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;

      &:hover {
        color: var(--color-accent);
        text-decoration: underline;
      }
    }

    .paper-card__link {
      font-weight: 600;
      white-space: nowrap;
      color: var(--color-navy);

      &:hover {
        color: var(--color-accent);
      }
    }

    .paper-card__link--primary {
      color: var(--color-accent);

      &:hover {
        color: var(--color-accent-hover);
      }
    }
  `,
})
export class ResearchPaperCardComponent {
  private readonly destroyRef = inject(DestroyRef);

  readonly paper = input.required<ResearchPaper>();
  readonly inspectPaper = output<ResearchPaper>();

  protected readonly copied = signal(false);
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly venueLabel = computed(() => {
    const current = this.paper();
    return current.journal ?? current.publisher ?? null;
  });

  protected readonly primaryLink = computed(() => {
    const current = this.paper();
    return current.sourceUrl ?? current.coreUrl ?? current.downloadUrl ?? null;
  });

  protected readonly completeness = computed(() => assessMetadataCompleteness(this.paper()));

  protected readonly copyTarget = computed(() => {
    const current = this.paper();
    if (current.doi) {
      return { label: 'Copy DOI', value: `https://doi.org/${current.doi}` };
    }
    const url = current.coreUrl ?? current.sourceUrl ?? current.downloadUrl;
    return url ? { label: 'Copy link', value: url } : null;
  });

  protected readonly authorsLine = computed(() => {
    const authors = this.paper().authors;
    if (authors.length === 0) {
      return null;
    }
    if (authors.length <= 5) {
      return authors.join(', ');
    }
    return `${authors.slice(0, 5).join(', ')} + ${authors.length - 5} more`;
  });

  constructor() {
    this.destroyRef.onDestroy(() => {
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
      }
    });
  }

  protected async handleCopy(value: string): Promise<void> {
    const ok = await copyTextToClipboard(value);
    if (!ok) {
      return;
    }
    this.copied.set(true);
    if (this.resetTimer) {
      clearTimeout(this.resetTimer);
    }
    this.resetTimer = setTimeout(() => {
      this.copied.set(false);
    }, 2000);
  }
}
