import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import {
  deriveQuerySuggestions,
  extractActivePrefixContext,
  type SearchSuggestion,
} from '../../shared/utilities/query-suggestions.util';
import { CoreApiService } from './core-api.service';

export const SUGGESTION_DEBOUNCE_MS = 350;

@Injectable({
  providedIn: 'root',
})
export class SearchSuggestionsService {
  private readonly coreApi = inject(CoreApiService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly input$ = new Subject<string>();
  private readonly _suggestions = signal<readonly SearchSuggestion[]>([]);
  private readonly _isLoading = signal<boolean>(false);

  readonly suggestions = this._suggestions.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  constructor() {
    this.input$
      .pipe(
        debounceTime(SUGGESTION_DEBOUNCE_MS),
        distinctUntilChanged(),
        switchMap((draft) => {
          const context = extractActivePrefixContext(draft);
          if (!context) {
            this._isLoading.set(false);
            return of<readonly SearchSuggestion[]>([]);
          }

          this._isLoading.set(true);
          return this.coreApi.fetchSuggestionTitles(context.coreQuery, 10).pipe(
            map((titles) => deriveQuerySuggestions(context, titles, 6)),
            catchError(() => of<readonly SearchSuggestion[]>([])),
            tap(() => this._isLoading.set(false))
          );
        }),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((items) => {
        this._suggestions.set(items);
      });
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
}
