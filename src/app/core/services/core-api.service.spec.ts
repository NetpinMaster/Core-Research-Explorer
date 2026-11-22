import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Subject } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  httpErrorInterceptor,
  type ResearchApiError,
} from '../interceptors/http-error.interceptor';
import type { SearchSuggestion } from '../../shared/utilities/query-suggestions.util';
import { CoreApiService } from './core-api.service';

describe('CoreApiService', () => {
  let service: CoreApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(CoreApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('encodes Boolean queries, limit, and sort safely with HttpParams and maps response DTOs', () => {
    let actualTotal: number | null = null;
    let actualTitle = '';
    let remaining: number | null = null;

    service
      .searchWorks({
        query: '(drone AND (package OR delivery))',
        limit: 20,
        sort: 'yearPublished:desc',
      })
      .subscribe((result) => {
        actualTotal = result.totalHits;
        actualTitle = result.papers[0]?.title ?? '';
        remaining = result.rateLimitRemaining;
      });

    const req = httpMock.expectOne((request) => request.url === '/api/core/search');
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('q')).toBe('(drone AND (package OR delivery))');
    expect(req.request.params.get('limit')).toBe('20');
    expect(req.request.params.get('sort')).toBe('yearPublished:desc');

    req.flush(
      {
        totalHits: 4729,
        limit: 20,
        offset: 0,
        results: [
          {
            id: 1001,
            title: 'Aero Drone Package Delivery System',
            authors: [{ name: 'Jordan Lee' }],
            yearPublished: 2023,
          },
        ],
      },
      {
        headers: { 'x-ratelimit-remaining': '9' },
      }
    );

    expect(actualTotal).toBe(4729);
    expect(actualTitle).toBe('Aero Drone Package Delivery System');
    expect(remaining).toBe(9);
  });

  it('normalizes 429 rate-limit responses via httpErrorInterceptor', () => {
    const capturedErrors: ResearchApiError[] = [];

    service.searchWorks({ query: 'drone', limit: 10 }).subscribe({
      error: (err: ResearchApiError) => {
        capturedErrors.push(err);
      },
    });

    const req = httpMock.expectOne((request) => request.url === '/api/core/search');
    req.flush(
      {
        error: {
          code: 'CORE_RATE_LIMIT',
          status: 429,
          message: 'Rate limit exceeded',
          retryAfter: '2026-11-21T14:00:00Z',
        },
      },
      { status: 429, statusText: 'Too Many Requests' }
    );

    expect(capturedErrors.length).toBe(1);
    expect(capturedErrors[0].kind).toBe('rate_limit');
    expect(capturedErrors[0].status).toBe(429);
    expect(capturedErrors[0].retryAfter).toBe('2026-11-21T14:00:00Z');
  });

  it('debounces user input and cancels stale CORE suggestion requests via switchMap', () => {
    vi.useFakeTimers();
    try {
      const input$ = new Subject<string>();
      const emissions: (readonly SearchSuggestion[])[] = [];
      const sub = service
        .getQuerySuggestions(input$, { debounceMs: 300, sampleLimit: 10, maxSuggestions: 4 })
        .subscribe((items) => emissions.push(items));

      // Rapid keystrokes within debounce window must not fire intermediate HTTP requests
      input$.next('dro');
      vi.advanceTimersByTime(100);
      input$.next('dron');
      vi.advanceTimersByTime(100);
      input$.next('drone');
      httpMock.expectNone((request) => request.url === '/api/core/search');

      // Settling after debounce fires a single CORE title-wildcard query
      vi.advanceTimersByTime(300);
      const firstReq = httpMock.expectOne(
        (request) =>
          request.url === '/api/core/search' &&
          request.params.get('q') === 'title:drone*' &&
          request.params.get('limit') === '10'
      );

      // Newer settled input cancels the still-pending first request via switchMap
      input$.next('drone AND deliv');
      vi.advanceTimersByTime(300);
      expect(firstReq.cancelled).toBe(true);

      const secondReq = httpMock.expectOne(
        (request) =>
          request.url === '/api/core/search' &&
          request.params.get('q') === 'title:deliv*' &&
          request.params.get('limit') === '10'
      );
      secondReq.flush({
        results: [
          { id: 1, title: 'Autonomous Parcel Delivery Systems' },
          { id: 2, title: 'Last-Mile Delivery Optimization' },
        ],
      });

      expect(emissions[emissions.length - 1]?.[0]).toEqual({
        label: 'delivery',
        completedQuery: 'drone AND delivery',
        matchCount: 2,
      });

      // Upstream error emits [] and keeps the stream alive for subsequent input
      input$.next('quant');
      vi.advanceTimersByTime(300);
      const failedReq = httpMock.expectOne(
        (request) =>
          request.url === '/api/core/search' && request.params.get('q') === 'title:quant*'
      );
      failedReq.flush(
        { error: { code: 'CORE_RATE_LIMIT', status: 429, message: 'Rate limited' } },
        { status: 429, statusText: 'Too Many Requests' }
      );
      expect(emissions[emissions.length - 1]).toEqual([]);

      input$.next('solar');
      vi.advanceTimersByTime(300);
      const recoveredReq = httpMock.expectOne(
        (request) =>
          request.url === '/api/core/search' && request.params.get('q') === 'title:solar*'
      );
      recoveredReq.flush({
        results: [{ id: 3, title: 'Solar Energy Forecasting' }],
      });
      expect(emissions[emissions.length - 1]?.[0]?.completedQuery).toBe('solar energy');

      sub.unsubscribe();
    } finally {
      vi.useRealTimers();
    }
  });
});
