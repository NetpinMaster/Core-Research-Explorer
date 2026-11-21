import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { ResearchResultsToolbarComponent } from './research-results-toolbar.component';

describe('ResearchResultsToolbarComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResearchResultsToolbarComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('clearly distinguishes requested limit, returned count, and total API matches', () => {
    const fixture = TestBed.createComponent(ResearchResultsToolbarComponent);
    fixture.componentRef.setInput('activeQuery', 'drone AND delivery');
    fixture.componentRef.setInput('requestedLimit', 50);
    fixture.componentRef.setInput('returnedCount', 12);
    fixture.componentRef.setInput('totalHits', 12);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const summary = el.querySelector('.toolbar__summary')?.textContent ?? '';
    const meta = el.querySelector('.toolbar__meta')?.textContent ?? '';

    expect(summary).toContain('12');
    expect(summary).toContain('drone AND delivery');
    expect(meta).toContain('Requested: 50');
    expect(meta).toContain('Returned: 12');
    expect(meta).toContain('Fewer than 50 works available');
  });

  it('shows selected limit prompt when no query has been executed', () => {
    const fixture = TestBed.createComponent(ResearchResultsToolbarComponent);
    fixture.componentRef.setInput('activeQuery', '');
    fixture.componentRef.setInput('requestedLimit', 100);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.toolbar__meta')?.textContent).toContain(
      'Selected limit: 100 papers per request'
    );
  });
});
