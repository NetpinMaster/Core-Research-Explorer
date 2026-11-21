import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { ResearchAnalyticsSummary } from '../../../core/models/research-paper.model';
import { AnalyticsPanelComponent } from './analytics-panel.component';

const EMPTY_SUMMARY: ResearchAnalyticsSummary = {
  analysedCount: 0,
  datedCount: 0,
  missingDateCount: 0,
  earliestYear: null,
  latestYear: null,
  distribution: [],
};

describe('AnalyticsPanelComponent', () => {
  let fixture: ComponentFixture<AnalyticsPanelComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticsPanelComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(AnalyticsPanelComponent);
    fixture.componentRef.setInput('summary', EMPTY_SUMMARY);
    fixture.detectChanges();
  });

  it('displays the accurate scope heading and idle empty state before any search', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Publication years of retrieved papers');
    expect(text).toContain('No publication-year data yet');
  });

  it('displays a specific missing-dates message when papers exist without valid years', () => {
    fixture.componentRef.setInput('summary', {
      analysedCount: 4,
      datedCount: 0,
      missingDateCount: 4,
      earliestYear: null,
      latestYear: null,
      distribution: [],
    });
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('No valid publication years in sample');
    expect(text).toContain('All 4 retrieved papers lacked a valid publication year');
  });

  it('renders loading placeholder while fetching', () => {
    fixture.componentRef.setInput('isLoading', true);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Aggregating publication years...');
  });
});
