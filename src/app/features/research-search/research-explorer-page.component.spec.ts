import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ResearchExplorerPageComponent } from './research-explorer-page.component';

describe('ResearchExplorerPageComponent (Integration)', () => {
  let fixture: ComponentFixture<ResearchExplorerPageComponent>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [ResearchExplorerPageComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResearchExplorerPageComponent);
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('executes a Boolean search, renders structured paper cards and analytics, and opens paper details', () => {
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('#research-query-input')!;
    const form = el.querySelector<HTMLFormElement>('form')!;

    input.value = '(drone AND (package OR delivery))';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne(
      (r) =>
        r.url === '/api/core/search' &&
        r.params.get('q') === '(drone AND (package OR delivery))' &&
        r.params.get('limit') === '20'
    );

    req.flush({
      totalHits: 420,
      results: [
        {
          id: 101,
          title: 'Autonomous Drone Delivery Framework',
          authors: [{ name: 'Dr. Jane Doe' }],
          yearPublished: 2023,
          abstract: '<p>Clean &amp; tested abstract.</p>',
          doi: '10.1000/drone.101',
          downloadUrl: 'https://core.ac.uk/download/pdf/101.pdf',
          links: [{ type: 'display', url: 'https://core.ac.uk/works/101' }],
        },
        {
          id: 102,
          title: 'Undated Drone Metadata Work',
          authors: [],
          yearPublished: 9999,
          abstract: null,
        },
      ],
    });
    fixture.detectChanges();

    const cards = el.querySelectorAll('article.paper-card');
    expect(cards.length).toBe(2);
    expect(el.textContent).toContain('Autonomous Drone Delivery Framework');
    expect(el.textContent).toContain('Clean & tested abstract.');
    expect(el.textContent).toContain('Year unavailable');
    expect(el.textContent).toContain('Requested: 20');
    expect(el.textContent).toContain('Returned: 2');
    expect(el.textContent).toContain('Peak year in sample:');
    expect(el.textContent).toContain('1 retrieved paper lacks a valid publication year');

    // Open paper detail dialog for the first paper
    el.querySelector<HTMLButtonElement>('[data-testid="paper-details-btn"]')?.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="paper-detail-dialog"]')).not.toBeNull();
    expect(el.textContent).toContain('10.1000/drone.101');

    // Close dialog cleanly
    el.querySelector<HTMLButtonElement>('[data-testid="paper-detail-close"]')?.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="paper-detail-dialog"]')).toBeNull();
  });

  it('shows accessible error feedback on API failure and recovers cleanly via Retry search', () => {
    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector<HTMLInputElement>('#research-query-input')!;
    const form = el.querySelector<HTMLFormElement>('form')!;

    input.value = 'drone';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const failedReq = httpMock.expectOne('/api/core/search?q=drone&limit=20');
    failedReq.flush(
      {
        error: {
          code: 'CORE_RATE_LIMIT',
          status: 429,
          message: 'CORE API rate limit reached. Wait briefly before retrying.',
          retryAfter: '5s',
        },
      },
      { status: 429, statusText: 'Too Many Requests' }
    );
    fixture.detectChanges();

    expect(el.textContent).toContain('Unable to retrieve research papers');
    expect(el.textContent).toContain('CORE API rate limit reached');

    // Click Retry search button inside StateFeedbackComponent
    const retryBtn = Array.from(el.querySelectorAll<HTMLButtonElement>('button')).find((b) =>
      b.textContent?.includes('Retry search')
    );
    expect(retryBtn).toBeDefined();
    retryBtn?.click();
    fixture.detectChanges();

    const retryReq = httpMock.expectOne('/api/core/search?q=drone&limit=20');
    retryReq.flush({
      totalHits: 12,
      results: [
        {
          id: 205,
          title: 'Recovered Drone Paper',
          yearPublished: 2024,
        },
      ],
    });
    fixture.detectChanges();

    expect(el.querySelectorAll('article.paper-card').length).toBe(1);
    expect(el.textContent).toContain('Recovered Drone Paper');
  });
});
