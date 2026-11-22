import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CoreApiService } from './core-api.service';
import {
  SearchSuggestionsService,
  SUGGESTION_DEBOUNCE_MS,
} from './search-suggestions.service';

describe('SearchSuggestionsService', () => {
  let service: SearchSuggestionsService;
  let fetchSuggestionTitles: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchSuggestionTitles = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        {
          provide: CoreApiService,
          useValue: { fetchSuggestionTitles },
        },
      ],
    });

    service = TestBed.inject(SearchSuggestionsService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces rapid typing via RxJS debounceTime so only the settled prefix queries CORE', () => {
    fetchSuggestionTitles.mockReturnValue(
      of([
        'Autonomous Drone Delivery Networks',
        'Urban Drone Delivery Scheduling',
        'Drone Swarm Navigation',
      ])
    );

    service.requestSuggestions('dro');
    vi.advanceTimersByTime(150);
    service.requestSuggestions('dron');
    vi.advanceTimersByTime(150);
    service.requestSuggestions('drone');

    expect(fetchSuggestionTitles).not.toHaveBeenCalled();

    vi.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);

    expect(fetchSuggestionTitles).toHaveBeenCalledTimes(1);
    expect(fetchSuggestionTitles).toHaveBeenCalledWith('title:drone*', 10);
    expect(service.suggestions()[0]?.label).toBe('drone delivery');
    expect(service.isLoading()).toBe(false);
  });

  it('cancels stale in-flight suggestion requests using switchMap when newer input arrives', () => {
    const first$ = new Subject<readonly string[]>();
    const second$ = new Subject<readonly string[]>();

    fetchSuggestionTitles.mockReturnValueOnce(first$).mockReturnValueOnce(second$);

    service.requestSuggestions('drone');
    vi.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);
    expect(service.isLoading()).toBe(true);

    service.requestSuggestions('solar');
    vi.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);

    // Late emission from the cancelled request must be ignored.
    first$.next(['Drone Delivery Systems']);
    first$.complete();
    expect(service.suggestions()).toEqual([]);

    second$.next(['Solar Panel Efficiency', 'Solar Energy Storage']);
    second$.complete();

    expect(service.suggestions().map((s) => s.label)).toContain('solar energy');
    expect(service.isLoading()).toBe(false);
  });

  it('fails gracefully to empty suggestions without throwing when CORE returns an error', () => {
    fetchSuggestionTitles.mockReturnValue(throwError(() => new Error('Rate limited')));

    service.requestSuggestions('quantum');
    vi.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);

    expect(service.suggestions()).toEqual([]);
    expect(service.isLoading()).toBe(false);
  });

  it('serves repeated prefix queries from client cache without duplicate CORE requests', () => {
    fetchSuggestionTitles.mockReturnValue(
      of(['Last-Mile Delivery Networks', 'Parcel Delivery Optimization'])
    );

    service.requestSuggestions('deliv');
    vi.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);
    expect(fetchSuggestionTitles).toHaveBeenCalledTimes(1);
    expect(fetchSuggestionTitles).toHaveBeenCalledWith('title:deliv*', 10);
    expect(service.suggestions()[0]?.label).toBe('delivery');

    // Clear and re-type the same prefix inside the cache TTL window
    service.clear();
    vi.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);
    service.requestSuggestions('deliv');
    vi.advanceTimersByTime(SUGGESTION_DEBOUNCE_MS);

    expect(fetchSuggestionTitles).toHaveBeenCalledTimes(1);
    expect(service.suggestions()[0]?.label).toBe('delivery');
  });
});
