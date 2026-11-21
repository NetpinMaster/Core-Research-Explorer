import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { httpErrorInterceptor } from '../interceptors/http-error.interceptor';
import { ResearchSearchStore } from './research-search.store';

describe('ResearchSearchStore', () => {
  let store: ResearchSearchStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([httpErrorInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    store = TestBed.inject(ResearchSearchStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('cancels stale in-flight requests via switchMap when a newer query is submitted', () => {
    store.submitSearch('drone', 10);
    const firstReq = httpMock.expectOne((r) => r.params.get('q') === 'drone');

    store.submitSearch('drone AND delivery', 10);
    expect(firstReq.cancelled).toBe(true);

    const secondReq = httpMock.expectOne((r) => r.params.get('q') === 'drone AND delivery');
    secondReq.flush({
      totalHits: 4330,
      limit: 10,
      offset: 0,
      results: [
        { id: 201, title: 'Drone Delivery Logistics', yearPublished: 2024 },
      ],
    });

    expect(store.isLoading()).toBe(false);
    expect(store.activeQuery()).toBe('drone AND delivery');
    expect(store.totalHits()).toBe(4330);
    expect(store.papers().length).toBe(1);
    expect(store.papers()[0].title).toBe('Drone Delivery Logistics');
  });

  it('clears stale results and recovers cleanly after an upstream error via retry()', () => {
    store.submitSearch('drone', 10);
    const failedReq = httpMock.expectOne((r) => r.params.get('q') === 'drone');
    failedReq.flush(
      { error: { message: 'CORE service unavailable' } },
      { status: 503, statusText: 'Service Unavailable' }
    );

    expect(store.apiError()?.kind).toBe('upstream');
    expect(store.papers().length).toBe(0);

    store.retry();
    const retriedReq = httpMock.expectOne((r) => r.params.get('q') === 'drone');
    retriedReq.flush({
      totalHits: 71213,
      limit: 10,
      offset: 0,
      results: [{ id: 147353571, title: 'DRONE First Release', yearPublished: 2018 }],
    });

    expect(store.apiError()).toBeNull();
    expect(store.papers().length).toBe(1);
    expect(store.analyticsSummary().earliestYear).toBe(2018);
  });

  it('blocks invalid Boolean expressions from triggering HTTP requests', () => {
    store.submitSearch('(drone AND (package OR delivery)', 20);
    httpMock.expectNone('/api/core/search');
    expect(store.validationError()).toContain('closing parenthesis');
    expect(store.isLoading()).toBe(false);

    store.submitSearch('drone && delivery', 20);
    httpMock.expectNone('/api/core/search');
    expect(store.validationError()).toContain('&&');
  });

  it('prevents duplicate HTTP requests on repeated clicks and cancels active request on clear()', () => {
    store.submitSearch('drone AND delivery', 20);
    store.submitSearch('drone AND delivery', 20);

    const req = httpMock.expectOne((r) => r.params.get('q') === 'drone AND delivery');
    expect(store.isLoading()).toBe(true);

    store.clear();
    expect(req.cancelled).toBe(true);
    expect(store.isLoading()).toBe(false);
    expect(store.activeQuery()).toBe('');
    expect(store.papers().length).toBe(0);
    expect(store.analyticsSummary().analysedCount).toBe(0);
  });

  it('updates limit without issuing HTTP when no active query exists, and re-fetches when active query exists', () => {
    store.setLimit(50);
    httpMock.expectNone('/api/core/search');
    expect(store.limit()).toBe(50);

    store.submitSearch('drone', 10);
    const req10 = httpMock.expectOne(
      (r) => r.params.get('q') === 'drone' && r.params.get('limit') === '10'
    );
    req10.flush({
      totalHits: 71213,
      limit: 10,
      offset: 0,
      results: [{ id: 1, title: 'Paper 1', yearPublished: 2021 }],
    });
    expect(store.papers().length).toBe(1);

    store.setLimit(50);
    const req50 = httpMock.expectOne(
      (r) => r.params.get('q') === 'drone' && r.params.get('limit') === '50'
    );
    req50.flush({
      totalHits: 71213,
      limit: 50,
      offset: 0,
      results: [
        { id: 1, title: 'Paper 1', yearPublished: 2021 },
        { id: 2, title: 'Paper 2', yearPublished: 2024 },
      ],
    });

    expect(store.limit()).toBe(50);
    expect(store.lastRequestedLimit()).toBe(50);
    expect(store.papers().length).toBe(2);
    expect(store.analyticsSummary().analysedCount).toBe(2);
    expect(store.analyticsSummary().latestYear).toBe(2024);
  });

  it('rejects unsupported result limit values gracefully without sending requests', () => {
    store.setLimit(250);
    httpMock.expectNone('/api/core/search');
    expect(store.validationError()).toContain('100');
  });
});
