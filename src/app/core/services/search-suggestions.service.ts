import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  finalize,
  map,
  of,
  Subject,
  switchMap,
  tap,
  type Observable,
} from 'rxjs';
import {
  deriveQuerySuggestions,
  extractActivePrefixContext,
  type SearchSuggestion,
} from '../../shared/utilities/query-suggestions.util';
import { CoreApiService } from './core-api.service';

export const SUGGESTION_DEBOUNCE_MS = 350;
const SUGGESTION_CACHE_TTL_MS = 60_000;
const SUGGESTION_CACHE_MAX_ENTRIES = 30;

interface CachedTitlesEntry {
  readonly titles: readonly string[];
  readonly expiresAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class SearchSuggestionsService {
  private readonly coreApi = inject(CoreApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly input$ = new Subject<string>();
  private readonly titleCache = new Map<string, CachedTitlesEntry>();
  private readonly _suggestions = signal<readonly SearchSuggestion[]>([]);
  private readonly _isLoading = signal<boolean>(false);

  readonly suggestions = this._suggestions.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    this.getSuggestionsStream(this.input$)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((items) => {
        this._suggestions.set(items);
      });
  }

  /**
   * Creates a debounced, switchMap-managed Observable of CORE query suggestions
   * for any user input stream (such as a Reactive Form control's valueChanges),
   * backed by a bounded TTL prefix cache to reduce duplicate CORE requests.
   */
  getSuggestionsStream(
    source$: Observable<string>,
    debounceMs = SUGGESTION_DEBOUNCE_MS
  ): Observable<readonly SearchSuggestion[]> {
    return source$.pipe(
      debounceTime(debounceMs),
      distinctUntilChanged(
        (prev, curr) => prev.trim().toLowerCase() === curr.trim().toLowerCase()
      ),
      switchMap((draft) => {
        const context = extractActivePrefixContext(draft);
        if (!context) {
          this._isLoading.set(false);
          return of<readonly SearchSuggestion[]>([]);
        }

        const cached = this.readCachedTitles(context.coreQuery);
        if (cached) {
          this._isLoading.set(false);
          return of(deriveQuerySuggestions(context, cached, 6));
        }

        this._isLoading.set(true);
        return this.coreApi.fetchSuggestionTitles(context.coreQuery, 10).pipe(
          tap((titles) => this.writeCachedTitles(context.coreQuery, titles)),
          map((titles) => deriveQuerySuggestions(context, titles, 6)),
          catchError(() => of<readonly SearchSuggestion[]>([])),
          finalize(() => this._isLoading.set(false))
        );
      })
    );
  }

  requestSuggestions(rawDraft: string): void {
    if (!extractActivePrefixContext(rawDraft)) {
      this._suggestions.set([]);
      this._isLoading.set(false);
    }
    this.input$.next(rawDraft);
  }

  clear(): void {
    this._suggestions.set([]);
    this._isLoading.set(false);
    this.input$.next('');
  }

  private readCachedTitles(key: string): readonly string[] | null {
    const entry = this.titleCache.get(key);
    if (!entry) {
      return null;
    }
    if (entry.expiresAt <= Date.now()) {
      this.titleCache.delete(key);
      return null;
    }
    return entry.titles;
  }

  private writeCachedTitles(key: string, titles: readonly string[]): void {
    if (this.titleCache.size >= SUGGESTION_CACHE_MAX_ENTRIES) {
      const oldestKey = this.titleCache.keys().next().value;
      if (oldestKey !== undefined) {
        this.titleCache.delete(oldestKey);
      }
    }
    this.titleCache.set(key, {
      titles,
      expiresAt: Date.now() + SUGGESTION_CACHE_TTL_MS,
    });
  }
}
