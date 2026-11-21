import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, Subject, switchMap, tap } from 'rxjs';
import { APP_API_CONFIG } from '../configuration/api.config';
import {
  normalizeHttpError,
  type ResearchApiError,
} from '../interceptors/http-error.interceptor';
import type {
  ResearchAnalyticsSummary,
  ResearchPaper,
  ResearchSortOption,
  SupportedResultLimit,
} from '../models/research-paper.model';
import { aggregatePublicationYears } from '../../shared/utilities/year-aggregation.util';
import { validateBooleanQuery } from '../../shared/validators/boolean-query.validator';
import { validateResultLimit } from '../../shared/validators/result-limit.validator';
import { CoreApiService } from './core-api.service';
import { SearchHistoryService } from './search-history.service';

type SearchCommand =
  | {
      readonly type: 'search';
      readonly query: string;
      readonly limit: SupportedResultLimit;
      readonly sort: ResearchSortOption;
      readonly force?: boolean;
    }
  | { readonly type: 'clear' };

@Injectable({
  providedIn: 'root',
})
export class ResearchSearchStore {
  private readonly coreApi = inject(CoreApiService);
  private readonly apiConfig = inject(APP_API_CONFIG);
  private readonly searchHistory = inject(SearchHistoryService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly command$ = new Subject<SearchCommand>();
  private inFlightKey: string | null = null;

  private readonly _query = signal<string>('');
  private readonly _activeQuery = signal<string>('');
  private readonly _limit = signal<SupportedResultLimit>(this.apiConfig.defaultResultLimit);
  private readonly _lastRequestedLimit = signal<SupportedResultLimit>(
    this.apiConfig.defaultResultLimit
  );
  private readonly _sort = signal<ResearchSortOption>('');
  private readonly _isLoading = signal<boolean>(false);
  private readonly _validationError = signal<string | null>(null);
  private readonly _apiError = signal<ResearchApiError | null>(null);
  private readonly _papers = signal<readonly ResearchPaper[]>([]);
  private readonly _totalHits = signal<number | null>(null);
  private readonly _hasSearched = signal<boolean>(false);

  readonly limitOptions = this.apiConfig.supportedResultLimits;
  readonly query = this._query.asReadonly();
  readonly activeQuery = this._activeQuery.asReadonly();
  readonly limit = this._limit.asReadonly();
  readonly lastRequestedLimit = this._lastRequestedLimit.asReadonly();
  readonly sort = this._sort.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();
  readonly validationError = this._validationError.asReadonly();
  readonly apiError = this._apiError.asReadonly();
  readonly papers = this._papers.asReadonly();
  readonly totalHits = this._totalHits.asReadonly();
  readonly hasSearched = this._hasSearched.asReadonly();
  readonly recentSearches = this.searchHistory.entries;

  readonly analyticsSummary = computed<ResearchAnalyticsSummary>(() =>
    aggregatePublicationYears(this._papers())
  );

  constructor() {
    this.command$
      .pipe(
        switchMap((command) => {
          if (command.type === 'clear') {
            this.inFlightKey = null;
            this._isLoading.set(false);
            return EMPTY;
          }

          const requestKey = `${command.query}|${command.limit}|${command.sort}`;
          this.inFlightKey = requestKey;
          this._isLoading.set(true);
          this._apiError.set(null);
          this._activeQuery.set(command.query);
          this._lastRequestedLimit.set(command.limit);
          this._papers.set([]);
          this._totalHits.set(null);
          this._hasSearched.set(true);

          return this.coreApi
            .searchWorks({
              query: command.query,
              limit: command.limit,
              sort: command.sort,
            })
            .pipe(
              tap((result) => {
                this.inFlightKey = null;
                this._papers.set(result.papers);
                this._totalHits.set(result.totalHits);
                this._isLoading.set(false);
                this.searchHistory.record(command.query, command.limit);
              }),
              catchError((error: unknown) => {
                this.inFlightKey = null;
                const normalized = isResearchApiError(error) ? error : normalizeHttpError(error);
                this._apiError.set(normalized);
                this._papers.set([]);
                this._totalHits.set(null);
                this._isLoading.set(false);
                return EMPTY;
              })
            );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe();
  }

  clearValidationError(): void {
    if (this._validationError() !== null) {
      this._validationError.set(null);
    }
  }

  submitSearch(rawQuery: string, limit?: SupportedResultLimit): void {
    const validatedLimit = validateResultLimit(limit ?? this._limit());
    if (!validatedLimit.valid || validatedLimit.value === null) {
      this._validationError.set(validatedLimit.message ?? 'Invalid result count selected.');
      return;
    }

    const targetLimit = validatedLimit.value;
    this._query.set(rawQuery);
    this._limit.set(targetLimit);

    const validation = validateBooleanQuery(rawQuery, this.apiConfig.maxQueryLength);
    if (!validation.valid) {
      this._validationError.set(validation.message ?? 'Invalid search expression.');
      return;
    }

    this._validationError.set(null);
    const requestKey = `${validation.normalizedQuery}|${targetLimit}|${this._sort()}`;
    if (this._isLoading() && this.inFlightKey === requestKey) {
      return;
    }

    this.command$.next({
      type: 'search',
      query: validation.normalizedQuery,
      limit: targetLimit,
      sort: this._sort(),
    });
  }

  setLimit(nextLimit: SupportedResultLimit | number | string): void {
    const validated = validateResultLimit(nextLimit);
    if (!validated.valid || validated.value === null) {
      this._validationError.set(validated.message ?? 'Unsupported result count.');
      return;
    }

    const validLimit = validated.value;
    const previousLimit = this._limit();
    this._limit.set(validLimit);

    const currentQuery = this._activeQuery();
    if (currentQuery.length > 0 && validLimit !== previousLimit) {
      this._validationError.set(null);
      this.command$.next({
        type: 'search',
        query: currentQuery,
        limit: validLimit,
        sort: this._sort(),
      });
    }
  }

  setSort(nextSort: ResearchSortOption): void {
    this._sort.set(nextSort);
    const currentQuery = this._activeQuery();
    if (currentQuery.length > 0) {
      this.command$.next({
        type: 'search',
        query: currentQuery,
        limit: this._limit(),
        sort: nextSort,
      });
    }
  }

  retry(): void {
    const currentQuery = this._activeQuery() || this._query().trim();
    if (currentQuery.length === 0) {
      return;
    }
    this._validationError.set(null);
    this.command$.next({
      type: 'search',
      query: currentQuery,
      limit: this._limit(),
      sort: this._sort(),
      force: true,
    });
  }

  clear(): void {
    this._query.set('');
    this._activeQuery.set('');
    this._validationError.set(null);
    this._apiError.set(null);
    this._papers.set([]);
    this._totalHits.set(null);
    this._hasSearched.set(false);
    this.command$.next({ type: 'clear' });
  }

  clearSearchHistory(): void {
    this.searchHistory.clear();
  }
}

function isResearchApiError(value: unknown): value is ResearchApiError {
  return (
    typeof value === 'object' &&
    value !== null &&
    'kind' in value &&
    'status' in value &&
    'message' in value
  );
}
