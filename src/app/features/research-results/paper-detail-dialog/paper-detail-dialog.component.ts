import { A11yModule } from '@angular/cdk/a11y';
import { DecimalPipe, DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import type { ResearchPaper } from '../../../core/models/research-paper.model';
import { copyTextToClipboard } from '../../../shared/utilities/clipboard.util';
import { assessMetadataCompleteness } from '../../../shared/utilities/metadata-completeness.util';

@Component({
  selector: 'app-paper-detail-dialog',
  standalone: true,
  imports: [A11yModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '(document:keydown.escape)': 'handleEscape()',
  },
  template: `
    @if (paper(); as item) {
      <div
        class="dialog-backdrop"
        (click)="onBackdropClick($event)"
        data-testid="paper-detail-backdrop"
      >
        <section
          class="dialog-panel"
          role="dialog"
          aria-modal="true"
          [attr.aria-labelledby]="'dialog-title-' + item.id"
          cdkTrapFocus
          [cdkTrapFocusAutoCapture]="true"
          data-testid="paper-detail-dialog"
        >
          <header class="dialog-panel__header">
            <div class="dialog-panel__kicker">
              <span class="tabular-nums">
                @if (item.hasValidYear && item.yearPublished !== null) {
                  {{ item.yearPublished }}
                } @else {
                  Year unavailable
                }
              </span>
              @if (item.openAccessStatus === 'fulltext') {
                <span aria-hidden="true">·</span>
                <span class="dialog-panel__oa">Open-access full text</span>
              }
              @if (item.documentType) {
                <span aria-hidden="true">·</span>
                <span>{{ item.documentType }}</span>
              }
            </div>

            <button
              type="button"
              class="dialog-panel__close"
              (click)="closeDialog.emit()"
              aria-label="Close paper details"
              data-testid="paper-detail-close"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </header>

          <div class="dialog-panel__body">
            <h2 class="dialog-panel__title" [id]="'dialog-title-' + item.id">
              {{ item.title }}
            </h2>

            @if (item.authors.length > 0) {
              <div class="dialog-panel__section">
                <h3 class="dialog-panel__section-title">
                  Authors ({{ item.authors.length | number }})
                </h3>
                <p class="dialog-panel__text">{{ item.authors.join(', ') }}</p>
              </div>
            }

            @if (item.abstractText) {
              <div class="dialog-panel__section">
                <h3 class="dialog-panel__section-title">Abstract</h3>
                <p class="dialog-panel__abstract">{{ item.abstractText }}</p>
              </div>
            }

            <div class="dialog-panel__section">
              <h3 class="dialog-panel__section-title">Publication metadata</h3>
              <dl class="meta-list">
                @if (item.journal) {
                  <div class="meta-list__row">
                    <dt>Journal</dt>
                    <dd>{{ item.journal }}</dd>
                  </div>
                }
                @if (item.publisher) {
                  <div class="meta-list__row">
                    <dt>Publisher</dt>
                    <dd>{{ item.publisher }}</dd>
                  </div>
                }
                @if (item.dataProvider) {
                  <div class="meta-list__row">
                    <dt>Repository</dt>
                    <dd>{{ item.dataProvider }}</dd>
                  </div>
                }
                @if (item.fieldOfStudy) {
                  <div class="meta-list__row">
                    <dt>Field of study</dt>
                    <dd>{{ item.fieldOfStudy }}</dd>
                  </div>
                }
                @if (item.language) {
                  <div class="meta-list__row">
                    <dt>Language</dt>
                    <dd>{{ item.language }}</dd>
                  </div>
                }
                @if (item.doi) {
                  <div class="meta-list__row">
                    <dt>DOI</dt>
                    <dd class="tabular-nums">{{ item.doi }}</dd>
                  </div>
                }
                @if (item.citationCount !== null) {
                  <div class="meta-list__row">
                    <dt>CORE citations</dt>
                    <dd class="tabular-nums">{{ item.citationCount | number }}</dd>
                  </div>
                }
                @if (completeness(); as meta) {
                  <div class="meta-list__row">
                    <dt>Metadata completeness</dt>
                    <dd class="tabular-nums">
                      {{ meta.score }}/{{ meta.total }} ({{ meta.level }}) — {{ meta.summary }}
                    </dd>
                  </div>
                }
                <div class="meta-list__row">
                  <dt>CORE work ID</dt>
                  <dd class="tabular-nums">{{ item.id }}</dd>
                </div>
              </dl>
            </div>
          </div>

          <footer class="dialog-panel__footer">
            <div class="dialog-panel__copy">
              @if (copyTarget(); as target) {
                <button
                  type="button"
                  class="dialog-btn dialog-btn--secondary"
                  (click)="handleCopy(target.value)"
                  data-testid="dialog-copy-btn"
                >
                  {{ copied() ? 'Copied to clipboard' : target.label }}
                </button>
              }
              <span class="sr-only" role="status" aria-live="polite">
                {{ copied() ? 'Copied reference to clipboard.' : '' }}
              </span>
            </div>

            <div class="dialog-panel__links">
              @if (item.downloadUrl) {
                <a
                  class="dialog-btn dialog-btn--primary"
                  [href]="item.downloadUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open full text
                </a>
              }
              @if (item.coreUrl && item.coreUrl !== item.downloadUrl) {
                <a
                  class="dialog-btn dialog-btn--secondary"
                  [href]="item.coreUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  CORE record
                </a>
              }
              @if (item.sourceUrl && item.sourceUrl !== item.downloadUrl && item.sourceUrl !== item.coreUrl) {
                <a
                  class="dialog-btn dialog-btn--secondary"
                  [href]="item.sourceUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View source
                </a>
              }
            </div>
          </footer>
        </section>
      </div>
    }
  `,
  styles: `
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      z-index: 90;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--space-4);
      background-color: rgba(15, 23, 42, 0.56);
    }

    .dialog-panel {
      width: min(760px, 100%);
      max-height: min(86dvh, 820px);
      display: flex;
      flex-direction: column;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-lg);
      box-shadow: 0 20px 45px rgba(15, 23, 42, 0.24);
      overflow: hidden;
    }

    .dialog-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-6);
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-bg);
    }

    .dialog-panel__kicker {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-secondary);
    }

    .dialog-panel__oa {
      color: var(--color-success);
      font-weight: 600;
    }

    .dialog-panel__close {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      cursor: pointer;
      flex-shrink: 0;

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }
    }

    .dialog-panel__body {
      padding: var(--space-6);
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: var(--space-5);
    }

    .dialog-panel__title {
      font-size: clamp(1.1875rem, 2.2vw, 1.4375rem);
      font-weight: 700;
      line-height: 1.32;
      color: var(--color-navy);
      overflow-wrap: anywhere;
    }

    .dialog-panel__section {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .dialog-panel__section-title {
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--color-text-muted);
    }

    .dialog-panel__text,
    .dialog-panel__abstract {
      font-size: 0.9375rem;
      line-height: 1.65;
      color: var(--color-text-secondary);
      overflow-wrap: anywhere;
    }

    .meta-list {
      margin: 0;
      border-top: 1px solid var(--color-border);
    }

    .meta-list__row {
      display: grid;
      grid-template-columns: minmax(120px, 170px) minmax(0, 1fr);
      gap: var(--space-3);
      padding: var(--space-2) 0;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.875rem;

      dt {
        font-weight: 600;
        color: var(--color-text-muted);
      }

      dd {
        margin: 0;
        color: var(--color-text-primary);
        overflow-wrap: anywhere;
      }
    }

    .dialog-panel__footer {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-4) var(--space-6);
      border-top: 1px solid var(--color-border);
      background-color: var(--color-bg);
    }

    .dialog-panel__links,
    .dialog-panel__copy {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .dialog-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 38px;
      padding: var(--space-2) var(--space-4);
      border-radius: var(--radius-sm);
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      cursor: pointer;
      white-space: nowrap;
      transition: background-color var(--transition-fast), border-color var(--transition-fast),
        color var(--transition-fast);
    }

    .dialog-btn--primary {
      border: 1px solid var(--color-accent);
      background-color: var(--color-accent);
      color: #ffffff;

      &:hover {
        background-color: var(--color-accent-hover);
        border-color: var(--color-accent-hover);
        text-decoration: none;
      }
    }

    .dialog-btn--secondary {
      border: 1px solid var(--color-border-strong);
      background-color: var(--color-surface);
      color: var(--color-text-primary);

      &:hover {
        border-color: var(--color-accent);
        color: var(--color-accent);
        text-decoration: none;
      }
    }
  `,
})
export class PaperDetailDialogComponent {
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);

  readonly paper = input<ResearchPaper | null>(null);
  readonly closeDialog = output<void>();

  protected readonly copied = signal(false);
  private resetTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly completeness = computed(() => {
    const current = this.paper();
    return current ? assessMetadataCompleteness(current) : null;
  });

  protected readonly copyTarget = computed(() => {
    const current = this.paper();
    if (!current) {
      return null;
    }
    if (current.doi) {
      return { label: 'Copy DOI', value: `https://doi.org/${current.doi}` };
    }
    const url = current.coreUrl ?? current.sourceUrl ?? current.downloadUrl;
    return url ? { label: 'Copy link', value: url } : null;
  });

  constructor() {
    effect(() => {
      const open = this.paper() !== null;
      this.copied.set(false);
      if (this.document?.body) {
        this.document.body.style.overflow = open ? 'hidden' : '';
      }
    });

    this.destroyRef.onDestroy(() => {
      if (this.resetTimer) {
        clearTimeout(this.resetTimer);
      }
      if (this.document?.body) {
        this.document.body.style.overflow = '';
      }
    });
  }

  protected handleEscape(): void {
    if (this.paper() !== null) {
      this.closeDialog.emit();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeDialog.emit();
    }
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
