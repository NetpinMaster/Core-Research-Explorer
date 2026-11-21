import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import type { SupportedResultLimit } from '../../../core/models/research-paper.model';
import type { RecentSearchEntry } from '../../../core/services/search-history.service';
import type { SearchSuggestion } from '../../../shared/utilities/query-suggestions.util';

export interface SearchSubmitPayload {
  readonly query: string;
  readonly limit: SupportedResultLimit;
}

export interface SearchExample {
  readonly label: string;
  readonly query: string;
}

const EXAMPLE_QUERIES: readonly SearchExample[] = [
  { label: 'drone', query: 'drone' },
  { label: 'drone AND delivery', query: 'drone AND delivery' },
  { label: 'drone OR delivery', query: 'drone OR delivery' },
  { label: '(drone AND (package OR delivery))', query: '(drone AND (package OR delivery))' },
];

@Component({
  selector: 'app-research-search-bar',
  standalone: true,
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="hero" aria-labelledby="discover-heading">
      <div class="hero__container">
        <div class="hero__intro">
          <h1 id="discover-heading" class="hero__title">Discover Scientific Research</h1>
          <p class="hero__subtitle">
            Query open-access scholarly works indexed by CORE using keywords, exact phrases, and
            Boolean expressions with explicit operator precedence.
          </p>
        </div>

        <form
          class="search-panel"
          [formGroup]="searchForm"
          (ngSubmit)="handleSubmit()"
          novalidate
          role="search"
          aria-label="Search CORE scientific research papers"
        >
          <div class="search-panel__row">
            <div class="search-field">
              <label class="sr-only" for="research-query-input">Research search query</label>
              <span class="search-field__icon" aria-hidden="true">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                id="research-query-input"
                type="search"
                class="search-field__input"
                formControlName="query"
                placeholder="Search papers, e.g. drone AND (package OR delivery)"
                autocomplete="off"
                spellcheck="false"
                maxlength="550"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="search-suggestions-listbox"
                [attr.aria-expanded]="showSuggestionsMenu()"
                [attr.aria-activedescendant]="activeSuggestionId()"
                (input)="handleQueryInput()"
                (focus)="handleInputFocus()"
                (blur)="handleInputBlur()"
                (keydown)="handleInputKeydown($event)"
                [attr.aria-invalid]="validationError() ? 'true' : null"
                [attr.aria-describedby]="validationError() ? 'search-validation-error' : 'search-hint'"
              />

              @if (showSuggestionsMenu()) {
                <div
                  id="search-suggestions-listbox"
                  class="suggestions-menu"
                  role="listbox"
                  aria-label="Popular query suggestions from CORE"
                  data-testid="search-suggestions-listbox"
                >
                  <div class="suggestions-menu__header">
                    <span>
                      @if (isLoadingSuggestions()) {
                        Fetching popular query terms from CORE...
                      } @else {
                        Suggested query prefixes from CORE
                      }
                    </span>
                  </div>

                  @for (item of suggestions(); track item.completedQuery; let idx = $index) {
                    <button
                      type="button"
                      class="suggestions-menu__option"
                      [class.is-active]="highlightedIndex() === idx"
                      [id]="'search-suggestion-' + idx"
                      role="option"
                      [attr.aria-selected]="highlightedIndex() === idx"
                      (mousedown)="selectSuggestion($event, item)"
                      data-testid="search-suggestion-option"
                    >
                      <span class="suggestions-menu__query">{{ item.completedQuery }}</span>
                      <span class="suggestions-menu__meta tabular-nums">
                        {{ item.matchCount }} {{ item.matchCount === 1 ? 'work' : 'works' }}
                      </span>
                    </button>
                  }
                </div>
              }
            </div>

            <div class="search-panel__controls">
              <div class="limit-control">
                <label class="limit-control__label" for="result-limit-select">Results</label>
                <select
                  id="result-limit-select"
                  class="limit-control__select tabular-nums"
                  formControlName="limit"
                  (change)="handleLimitChange()"
                  aria-label="Number of papers to request"
                >
                  @for (option of limitOptions(); track option) {
                    <option [ngValue]="option">{{ option }} papers</option>
                  }
                </select>
              </div>

              <button
                type="submit"
                class="btn btn--primary"
                [disabled]="isLoading()"
                [attr.aria-busy]="isLoading() ? 'true' : null"
              >
                @if (isLoading()) {
                  <span>Searching...</span>
                } @else {
                  <span>Search</span>
                }
              </button>

              <button
                type="button"
                class="btn btn--secondary"
                (click)="handleClear()"
                [disabled]="!hasInputOrActiveQuery() && !validationError() && !isLoading()"
              >
                Clear
              </button>
            </div>
          </div>

          @if (validationError()) {
            <p id="search-validation-error" class="search-panel__error" role="alert">
              {{ validationError() }}
            </p>
          }

          <div class="search-panel__meta" id="search-hint">
            <div class="examples" aria-label="Example Boolean queries">
              <span class="examples__label">Examples:</span>
              @for (example of examples; track example.query) {
                <button
                  type="button"
                  class="examples__btn"
                  (click)="applyExample(example.query)"
                  [disabled]="isLoading()"
                >
                  {{ example.label }}
                </button>
              }
            </div>

            <button
              type="button"
              class="syntax-toggle"
              [attr.aria-expanded]="syntaxHelpOpen()"
              aria-controls="boolean-syntax-help"
              (click)="toggleSyntaxHelp()"
            >
              <span>Search syntax help</span>
              <svg
                class="syntax-toggle__chevron"
                [class.is-open]="syntaxHelpOpen()"
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
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          @if (recentSearches().length > 0) {
            <div class="history-bar" aria-label="Recent research searches" data-testid="recent-searches">
              <span class="examples__label">Recent:</span>
              @for (entry of recentSearches(); track entry.query) {
                <button
                  type="button"
                  class="history-bar__btn"
                  (click)="applyRecent(entry)"
                  [disabled]="isLoading()"
                  [title]="'Re-run ' + entry.query + ' (' + entry.limit + ' papers)'"
                >
                  <span>{{ entry.query }}</span>
                  <span class="history-bar__limit tabular-nums">· {{ entry.limit }}</span>
                </button>
              }
              <button
                type="button"
                class="history-bar__clear"
                (click)="clearHistory.emit()"
                [disabled]="isLoading()"
              >
                Clear history
              </button>
            </div>
          }

          @if (syntaxHelpOpen()) {
            <div id="boolean-syntax-help" class="syntax-guide" role="region" aria-label="CORE Boolean search syntax reference">
              <div class="syntax-guide__grid">
                <div class="syntax-guide__item">
                  <code class="syntax-guide__code">termA AND termB · termA OR termB</code>
                  <p class="syntax-guide__desc">
                    Use uppercase AND / OR operators (not &amp;&amp; or ||). AND requires both terms;
                    OR matches either term.
                  </p>
                </div>
                <div class="syntax-guide__item">
                  <code class="syntax-guide__code">(drone AND (package OR delivery))</code>
                  <p class="syntax-guide__desc">
                    Group nested sub-expressions with balanced parentheses to preserve operator precedence.
                  </p>
                </div>
                <div class="syntax-guide__item">
                  <code class="syntax-guide__code">drone AND NOT military</code>
                  <p class="syntax-guide__desc">
                    Exclude unwanted terms with uppercase NOT before a term or group.
                  </p>
                </div>
                <div class="syntax-guide__item">
                  <code class="syntax-guide__code">title:"autonomous flight" AND yearPublished&gt;=2020</code>
                  <p class="syntax-guide__desc">
                    Combine exact quoted phrases, field prefixes, and numeric year ranges supported by CORE v3.
                  </p>
                </div>
              </div>
            </div>
          }
        </form>
      </div>
    </section>
  `,
  styles: `
    @use '../../../../styles/mixins' as *;

    .hero {
      background-color: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      padding-block: var(--space-8) var(--space-8);

      @include respond-above($bp-desktop) {
        padding-block: var(--space-10) var(--space-8);
      }
    }

    .hero__container {
      @include container;
    }

    .hero__intro {
      max-width: 68ch;
      margin-bottom: var(--space-6);
    }

    .hero__title {
      font-size: clamp(1.75rem, 3.2vw, 2.375rem);
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--color-navy);
      margin-bottom: var(--space-2);
    }

    .hero__subtitle {
      font-size: 0.96875rem;
      color: var(--color-text-secondary);
      line-height: 1.6;
    }

    .search-panel {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .search-panel__row {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);

      @include respond-above($bp-desktop) {
        flex-direction: row;
        align-items: stretch;
      }
    }

    .search-field {
      position: relative;
      flex: 1 1 auto;
      display: flex;
      align-items: center;
    }

    .search-field__icon {
      position: absolute;
      left: var(--space-4);
      display: inline-flex;
      color: var(--color-text-muted);
      pointer-events: none;
    }

    .search-field__input {
      width: 100%;
      min-height: 46px;
      padding: var(--space-3) var(--space-4) var(--space-3) 2.75rem;
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background-color: var(--color-bg);
      color: var(--color-text-primary);
      font-size: 0.9375rem;
      transition: border-color var(--transition-fast), background-color var(--transition-fast),
        box-shadow var(--transition-fast);

      &::placeholder {
        color: var(--color-text-muted);
      }

      &:focus {
        outline: none;
        background-color: var(--color-surface);
        border-color: var(--color-accent);
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14);
      }

      &[aria-invalid='true'] {
        border-color: var(--color-error);
      }
    }

    .suggestions-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      z-index: 35;
      background-color: var(--color-surface);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      box-shadow: 0 12px 28px rgba(15, 23, 42, 0.14);
      overflow: hidden;
    }

    .suggestions-menu__header {
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-bg);
      font-size: 0.75rem;
      font-weight: 600;
      color: var(--color-text-muted);
    }

    .suggestions-menu__option {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border: none;
      border-bottom: 1px solid var(--color-border);
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      text-align: left;
      font-size: 0.875rem;
      cursor: pointer;
      transition: background-color var(--transition-fast);

      &:last-child {
        border-bottom: none;
      }

      &:hover,
      &.is-active {
        background-color: var(--color-accent-subtle);
      }
    }

    .suggestions-menu__query {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      color: var(--color-navy);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .suggestions-menu__meta {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    .search-panel__controls {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: var(--space-2);
      align-items: stretch;

      @include respond-above($bp-tablet) {
        display: flex;
        flex-wrap: nowrap;
        align-items: stretch;
        flex-shrink: 0;
      }
    }

    .limit-control {
      grid-column: 1 / -1;
      display: flex;
      align-items: center;
      gap: var(--space-2);

      @include respond-above($bp-tablet) {
        grid-column: auto;
        flex: 0 0 auto;
      }
    }

    .limit-control__label {
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-text-muted);
      white-space: nowrap;
    }

    .limit-control__select {
      width: 100%;
      min-width: 132px;
      min-height: 46px;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--color-border-strong);
      border-radius: var(--radius-md);
      background-color: var(--color-surface);
      color: var(--color-text-primary);
      font-size: 0.875rem;
      cursor: pointer;

      &:focus-visible {
        outline: none;
        box-shadow: var(--focus-ring);
      }

      @include respond-above($bp-tablet) {
        width: auto;
      }
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 46px;
      padding: var(--space-2) var(--space-5);
      border-radius: var(--radius-md);
      font-size: 0.9375rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
      cursor: pointer;
      transition: background-color var(--transition-fast), border-color var(--transition-fast),
        color var(--transition-fast);

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    .btn--primary {
      flex: 1 1 110px;
      border: 1px solid var(--color-accent);
      background-color: var(--color-accent);
      color: #ffffff;

      &:hover:not(:disabled) {
        background-color: var(--color-accent-hover);
        border-color: var(--color-accent-hover);
      }

      @include respond-above($bp-desktop) {
        flex: 0 0 auto;
      }
    }

    .btn--secondary {
      border: 1px solid var(--color-border-strong);
      background-color: var(--color-surface);
      color: var(--color-text-primary);

      &:hover:not(:disabled) {
        border-color: var(--color-navy);
        background-color: var(--color-surface-muted);
      }
    }

    .search-panel__error {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--color-error);
    }

    .search-panel__meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
      padding-top: var(--space-1);
    }

    .examples {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .examples__label {
      font-size: 0.8125rem;
      color: var(--color-text-muted);
    }

    .examples__btn {
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--color-bg);
      color: var(--color-text-secondary);
      font-family: var(--font-mono);
      font-size: 0.78125rem;
      cursor: pointer;
      white-space: nowrap;
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

    .history-bar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
      padding-top: var(--space-2);
      border-top: 1px dashed var(--color-border);
    }

    .history-bar__btn {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      max-width: 100%;
      padding: var(--space-1) var(--space-2);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-sm);
      background-color: var(--color-surface);
      color: var(--color-text-secondary);
      font-family: var(--font-mono);
      font-size: 0.75rem;
      cursor: pointer;
      transition: border-color var(--transition-fast), color var(--transition-fast);

      span:first-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 240px;
      }

      &:hover:not(:disabled) {
        border-color: var(--color-accent);
        color: var(--color-accent);
      }

      &:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
    }

    .history-bar__limit {
      color: var(--color-text-muted);
      flex-shrink: 0;
    }

    .history-bar__clear {
      margin-left: auto;
      padding: var(--space-1) 0;
      border: none;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;

      &:hover:not(:disabled) {
        color: var(--color-error);
        text-decoration: underline;
      }
    }

    .syntax-toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1) 0;
      border: none;
      background: transparent;
      color: var(--color-accent);
      font-size: 0.8125rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;

      &:hover {
        color: var(--color-accent-hover);
      }
    }

    .syntax-toggle__chevron {
      transition: transform var(--transition-fast);

      &.is-open {
        transform: rotate(180deg);
      }
    }

    .syntax-guide {
      margin-top: var(--space-2);
      padding: var(--space-4);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      background-color: var(--color-bg);
    }

    .syntax-guide__grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);

      @include respond-above($bp-tablet) {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    .syntax-guide__item {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
    }

    .syntax-guide__code {
      font-family: var(--font-mono);
      font-size: 0.8125rem;
      font-weight: 500;
      color: var(--color-navy);
      word-break: break-word;
    }

    .syntax-guide__desc {
      font-size: 0.8125rem;
      color: var(--color-text-secondary);
    }
  `,
})
export class ResearchSearchBarComponent {
  readonly query = input<string>('');
  readonly limit = input<SupportedResultLimit>(20);
  readonly limitOptions = input<readonly SupportedResultLimit[]>([10, 20, 50, 100]);
  readonly isLoading = input<boolean>(false);
  readonly validationError = input<string | null>(null);
  readonly recentSearches = input<readonly RecentSearchEntry[]>([]);
  readonly suggestions = input<readonly SearchSuggestion[]>([]);
  readonly isLoadingSuggestions = input<boolean>(false);

  readonly searchSubmit = output<SearchSubmitPayload>();
  readonly limitChange = output<SupportedResultLimit>();
  readonly clearSearch = output<void>();
  readonly queryDraftChange = output<string>();
  readonly clearHistory = output<void>();

  protected readonly examples = EXAMPLE_QUERIES;
  protected readonly syntaxHelpOpen = signal(false);
  protected readonly inputFocused = signal(false);
  protected readonly suggestionsDismissed = signal(false);
  protected readonly highlightedIndex = signal(-1);

  protected readonly showSuggestionsMenu = computed(
    () =>
      this.inputFocused() &&
      !this.suggestionsDismissed() &&
      !this.isLoading() &&
      (this.suggestions().length > 0 || this.isLoadingSuggestions())
  );

  protected readonly activeSuggestionId = computed(() => {
    const idx = this.highlightedIndex();
    return idx >= 0 && idx < this.suggestions().length ? `search-suggestion-${idx}` : null;
  });

  protected readonly searchForm = new FormGroup({
    query: new FormControl<string>('', { nonNullable: true }),
    limit: new FormControl<SupportedResultLimit>(20, { nonNullable: true }),
  });

  constructor() {
    effect(() => {
      const nextQuery = this.query();
      if (this.searchForm.controls.query.value !== nextQuery) {
        this.searchForm.controls.query.setValue(nextQuery, { emitEvent: false });
      }
    });

    effect(() => {
      const nextLimit = this.limit();
      if (this.searchForm.controls.limit.value !== nextLimit) {
        this.searchForm.controls.limit.setValue(nextLimit, { emitEvent: false });
      }
    });

    effect(() => {
      // Reset keyboard highlight whenever the suggestion list updates.
      this.suggestions();
      this.highlightedIndex.set(-1);
    });
  }

  protected hasInputOrActiveQuery(): boolean {
    return (
      this.searchForm.controls.query.value.trim().length > 0 || this.query().trim().length > 0
    );
  }

  protected handleInputFocus(): void {
    this.inputFocused.set(true);
  }

  protected handleInputBlur(): void {
    this.inputFocused.set(false);
    this.highlightedIndex.set(-1);
  }

  protected handleQueryInput(): void {
    this.suggestionsDismissed.set(false);
    this.highlightedIndex.set(-1);
    this.queryDraftChange.emit(this.searchForm.controls.query.value);
  }

  protected handleInputKeydown(event: KeyboardEvent): void {
    const items = this.suggestions();
    if (!this.showSuggestionsMenu() || items.length === 0) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.highlightedIndex.update((idx) => (idx + 1) % items.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.highlightedIndex.update((idx) => (idx <= 0 ? items.length - 1 : idx - 1));
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.suggestionsDismissed.set(true);
      this.highlightedIndex.set(-1);
    } else if (event.key === 'Enter' && this.highlightedIndex() >= 0) {
      const chosen = items[this.highlightedIndex()];
      if (chosen) {
        event.preventDefault();
        this.applySuggestion(chosen);
      }
    }
  }

  protected selectSuggestion(event: MouseEvent, item: SearchSuggestion): void {
    event.preventDefault();
    this.applySuggestion(item);
  }

  private applySuggestion(item: SearchSuggestion): void {
    this.suggestionsDismissed.set(true);
    this.highlightedIndex.set(-1);
    this.searchForm.controls.query.setValue(item.completedQuery);
    this.searchSubmit.emit({
      query: item.completedQuery,
      limit: this.searchForm.controls.limit.value,
    });
  }

  protected handleSubmit(): void {
    this.suggestionsDismissed.set(true);
    this.highlightedIndex.set(-1);
    this.searchSubmit.emit({
      query: this.searchForm.controls.query.value,
      limit: this.searchForm.controls.limit.value,
    });
  }

  protected handleLimitChange(): void {
    this.limitChange.emit(this.searchForm.controls.limit.value);
  }

  protected handleClear(): void {
    this.suggestionsDismissed.set(true);
    this.highlightedIndex.set(-1);
    this.searchForm.controls.query.setValue('');
    this.clearSearch.emit();
  }

  protected applyExample(exampleQuery: string): void {
    this.suggestionsDismissed.set(true);
    this.searchForm.controls.query.setValue(exampleQuery);
    this.searchSubmit.emit({
      query: exampleQuery,
      limit: this.searchForm.controls.limit.value,
    });
  }

  protected applyRecent(entry: RecentSearchEntry): void {
    this.suggestionsDismissed.set(true);
    this.searchForm.controls.query.setValue(entry.query);
    this.searchForm.controls.limit.setValue(entry.limit);
    this.searchSubmit.emit({
      query: entry.query,
      limit: entry.limit,
    });
  }

  protected toggleSyntaxHelp(): void {
    this.syntaxHelpOpen.update((open) => !open);
  }
}
