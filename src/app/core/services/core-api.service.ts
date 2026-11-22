import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  map,
  of,
  switchMap,
  type Observable,
} from 'rxjs';
import { APP_API_CONFIG } from '../configuration/api.config';
import type {
  CoreSearchRequest,
  CoreSearchResponseDto,
  CoreSearchResult,
} from '../models/core-api.models';
import { mapCoreSearchResponseDto } from '../../shared/utilities/paper-mapper.util';
import {
  deriveQuerySuggestions,
  extractActivePrefixContext,
  type SearchSuggestion,
} from '../../shared/utilities/query-suggestions.util';

export interface QuerySuggestionsOptions {
  readonly debounceMs?: number;
  readonly sampleLimit?: number;
  readonly maxSuggestions?: number;
}

const DEFAULT_SUGGESTIONS_DEBOUNCE_MS = 350;
const DEFAULT_SUGGESTIONS_SAMPLE_LIMIT = 10;
const DEFAULT_MAX_SUGGESTIONS = 6;

@Injectable({
  providedIn: 'root',
})
export class CoreApiService {
  private readonly http = inject(HttpClient);
  private readonly config = inject(APP_API_CONFIG);

  searchWorks(request: CoreSearchRequest): Observable<CoreSearchResult> {
    let params = new HttpParams()
      .set('q', request.query.trim())
      .set('limit', String(request.limit));

    if (request.offset !== undefined && request.offset > 0) {
      params = params.set('offset', String(request.offset));
    }

    if (request.sort && request.sort.length > 0) {
      params = params.set('sort', request.sort);
    }

    const endpoint = `${this.config.apiBaseUrl}/search`;

    return this.http
      .get<CoreSearchResponseDto>(endpoint, {
        params,
        observe: 'response',
      })
      .pipe(
        map((httpResponse) => {
          const dto: CoreSearchResponseDto = httpResponse.body ?? {};
          const mapped = mapCoreSearchResponseDto(dto, request.limit);

          const remainingHeader = httpResponse.headers.get('x-ratelimit-remaining');
          const parsedRemaining =
            remainingHeader !== null && /^\d+$/.test(remainingHeader.trim())
              ? Number.parseInt(remainingHeader.trim(), 10)
              : null;

          const rateLimitReset = httpResponse.headers.get('x-ratelimit-retry-after');

          return {
            ...mapped,
            rateLimitRemaining: parsedRemaining,
            rateLimitReset,
          };
        })
      );
  }

  /**
   * Queries CORE API v3 works search with a small sample size so popular
   * scholarly query prefixes can be derived strictly from real indexed titles.
   */
  fetchSuggestionTitles(prefixQuery: string, limit = DEFAULT_SUGGESTIONS_SAMPLE_LIMIT): Observable<readonly string[]> {
    const params = new HttpParams()
      .set('q', prefixQuery.trim())
      .set('limit', String(limit));

    const endpoint = `${this.config.apiBaseUrl}/search`;

    return this.http.get<CoreSearchResponseDto>(endpoint, { params }).pipe(
      map((dto) => {
        const results = Array.isArray(dto?.results) ? dto.results : [];
        return results
          .map((work) => (typeof work?.title === 'string' ? work.title.trim() : ''))
          .filter((title) => title.length > 0);
      })
    );
  }

  /**
   * Transforms a stream of user search drafts into debounced, live CORE API
   * query completions using RxJS debounceTime and switchMap so stale in-flight
   * requests are cancelled automatically whenever newer input settles.
   */
  getQuerySuggestions(
    input$: Observable<string>,
    options: QuerySuggestionsOptions = {}
  ): Observable<readonly SearchSuggestion[]> {
    const debounceMs = options.debounceMs ?? DEFAULT_SUGGESTIONS_DEBOUNCE_MS;
    const sampleLimit = options.sampleLimit ?? DEFAULT_SUGGESTIONS_SAMPLE_LIMIT;
    const maxSuggestions = options.maxSuggestions ?? DEFAULT_MAX_SUGGESTIONS;

    return input$.pipe(
      debounceTime(debounceMs),
      distinctUntilChanged(
        (previous, current) => previous.trim().toLowerCase() === current.trim().toLowerCase()
      ),
      switchMap((draft) => {
        const context = extractActivePrefixContext(draft);
        if (!context) {
          return of<readonly SearchSuggestion[]>([]);
        }

        return this.fetchSuggestionTitles(context.coreQuery, sampleLimit).pipe(
          map((titles) => deriveQuerySuggestions(context, titles, maxSuggestions)),
          catchError(() => of<readonly SearchSuggestion[]>([]))
        );
      })
    );
  }
}
