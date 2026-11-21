import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PublicationYearChartComponent } from './publication-year-chart.component';

describe('PublicationYearChartComponent', () => {
  let fixture: ComponentFixture<PublicationYearChartComponent>;

  beforeEach(async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);

    await TestBed.configureTestingModule({
      imports: [PublicationYearChartComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PublicationYearChartComponent);
    fixture.componentRef.setInput('distribution', [
      { year: 2021, count: 2 },
      { year: 2023, count: 5 },
      { year: 2024, count: 3 },
    ]);
    fixture.componentRef.setInput('datedCount', 10);
    fixture.componentRef.setInput('missingDateCount', 2);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders an accessible canvas aria-label and screen-reader data table', () => {
    const el = fixture.nativeElement as HTMLElement;
    const canvas = el.querySelector<HTMLCanvasElement>('[data-testid="publication-year-canvas"]');
    const wrap = el.querySelector<HTMLElement>('[data-testid="publication-year-table-wrap"]');
    const table = el.querySelector<HTMLTableElement>('[data-testid="publication-year-table"]');

    expect(canvas?.getAttribute('role')).toBe('img');
    expect(canvas?.getAttribute('aria-label')).toContain('10 retrieved papers');
    expect(canvas?.getAttribute('aria-label')).toContain('2021 to 2024');

    expect(wrap?.classList.contains('sr-only')).toBe(true);
    expect(table?.querySelectorAll('tbody tr').length).toBe(3);
    expect(el.textContent).toContain('Peak year in sample:');
    expect(el.textContent).toContain('2023');
    expect(el.textContent).toContain('2 retrieved papers lack a valid publication year');
  });

  it('allows toggling the visible data table in expanded analytics mode', () => {
    fixture.componentRef.setInput('expanded', true);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const toggleBtn = el.querySelector<HTMLButtonElement>('.year-chart__toggle');
    const wrap = el.querySelector<HTMLElement>('[data-testid="publication-year-table-wrap"]');

    expect(toggleBtn).not.toBeNull();
    expect(wrap?.classList.contains('sr-only')).toBe(true);

    toggleBtn?.click();
    fixture.detectChanges();

    expect(wrap?.classList.contains('sr-only')).toBe(false);
    expect(toggleBtn?.getAttribute('aria-expanded')).toBe('true');
  });
});
