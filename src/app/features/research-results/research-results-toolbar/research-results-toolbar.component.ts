import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import type {
  ResearchSortOption,
  SupportedResultLimit,
} from '../../../core/models/research-paper.model';

export interface SortChoice {
  readonly value: ResearchSortOption;
  readonly label: string;
}

const SORT_CHOICES: readonly SortChoice[] = [
  { value: '', label: 'Relevance (CORE default)' },
  { value: 'yearPublished:desc', label: 'Publication year (newest)' },
  { value: 'yearPublished:asc', label: 'Publication year (oldest)' },
];

@Component({
  selector: 'app-research-results-toolbar',
  standalone: true,
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="toolbar">
      <div class="toolbar__status" role="status" aria-live="polite">
        @if (isLoading()) {
          <p class="toolbar__summary">
            Searching CORE for <span class="toolbar__query">"{{ activeQuery() }}"</span>...
          </p>
          <p class="toolbar__meta tabular-nums">
            Requested: {{ requestedLimit() | number }} papers
          </p>
        } @else if (activeQuery()) {
          <p class="toolbar__summary">
            Showing
            <strong class="tabular-nums">{{ returnedCount() | number }}</strong>
            @if (totalHits() !== null) {
              of
              <strong class="tabular-nums">{{ totalHits()! | number }}</strong>
              matching papers
            } @else {
              retrieved papers
            }
            for <span class="toolbar__query">"{{ activeQuery() }}"</span>
          </p>
          <p class="toolbar__meta tabular-nums">
            <span>Requested: {{ requestedLimit() | number }}</span>
            <span aria-hidden="true">·</span>
            <span>Returned: {{ returnedCount() | number }}</span>
            @if (returnedCount() < requestedLimit() && returnedCount() > 0) {
              <span aria-hidden="true">·</span>
              <span>Fewer than {{ requestedLimit() }} works available for this page</span>
            }
          </p>
        } @else {
          <p class="toolbar__summary">Ready to query CORE scientific repositories</p>
          <p class="toolbar__meta tabular-nums">Selected limit: {{ requestedLimit() | number }} papers per request</p>
        }
      </div>

      <div class="toolbar__actions">
        <div class="toolbar__sort-group">
          <label class="toolbar__sort-label" for="results-sort-select">Sort by</label>
          <select
            id="results-sort-select"
            class="toolbar__sort-select"
            [value]="sort()"
            [disabled]="isLoading() || !activeQuery()"
            (change)="onSortSelect($event)"
          >
            @for (choice of sortChoices; track choice.value) {
              <option [value]="choice.value">{{ choice.label }}</option>
            }
          </select>
        </div>

        <button
          type="button"
          class="toolbar__export-btn"
          [disabled]="isLoading() || returnedCount() === 0"
          (click)="exportCsv.emit()"
          data-testid="export-csv-btn"
        >
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
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          <span>Export CSV</span>
        </button>
      </div>
    </div>
  `,
  styles: `
    @use '../../../../styles/mixins' as *;

    .toolbar {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
      padding-bottom: var(--space-4);
      border-bottom: 1px solid var(--color-border);

      @include respond-above($bp-tablet) {
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
      }
    }

    .toolbar__status {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      min-width: 0;
    }

    .toolbar__summary {
      font-size: 0.9375rem;
      color: var(--color-text-primary);
      overflow-wrap: anywhere;
    }

    .toolbar__query {
      font-family: var(--font-mono);
      font-size: 0.875rem;
      color: var(--color-navy);
    }

    .toolbar__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .toolbar__actions {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-3);
      flex-shrink: 0;
    }

    .toolbar__sort-group {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .toolbar__sort-label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .toolbar__sort-select {
      min-height: 38px;
      padding: var(--space-1) var(--space-3);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      font-size: 0.8125rem;
      cursor: pointer;

      &:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }
    }

    .toolbar__export-btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      min-height: 38px;
      padding: var(--space-1) var(--space-3);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
      color: var(--color-navy);
      font-size: 0.8125rem;
      font-weight: 600;
      white-space: nowrap;
      cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast);

      &:hover:not(:disabled) {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }
  `,
})
export class ResearchResultsToolbarComponent {
  readonly activeQuery = input<string>('');
  readonly returnedCount = input<number>(0);
  readonly totalHits = input<number | null>(null);
  readonly requestedLimit = input<SupportedResultLimit>(20);
  readonly sort = input<ResearchSortOption>('');
  readonly isLoading = input<boolean>(false);

  readonly sortChange = output<ResearchSortOption>();
  readonly exportCsv = output<void>();

  protected readonly sortChoices = SORT_CHOICES;

  protected onSortSelect(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const value = target.value;
    if (value === '' || value === 'yearPublished:desc' || value === 'yearPublished:asc') {
      this.sortChange.emit(value);
    }
  }
}
