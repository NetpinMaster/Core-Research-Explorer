import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ResearchPaper } from '../../../core/models/research-paper.model';
import { PaperDetailDialogComponent } from './paper-detail-dialog.component';

const SAMPLE_PAPER: ResearchPaper = {
  id: '4242',
  title: 'Autonomous Multi-Package Drone Routing',
  authors: ['A. Author', 'B. Author', 'C. Author', 'D. Author', 'E. Author', 'F. Author'],
  yearPublished: 2024,
  rawYearPublished: 2024,
  hasValidYear: true,
  abstractText: 'Complete untruncated abstract describing autonomous routing algorithms.',
  publisher: 'IEEE',
  journal: 'Transactions on Robotics',
  doi: '10.1109/tro.2024.4242',
  fieldOfStudy: 'Robotics',
  documentType: 'research',
  language: 'en',
  dataProvider: 'Zenodo',
  openAccessStatus: 'fulltext',
  downloadUrl: 'https://core.ac.uk/download/pdf/4242.pdf',
  sourceUrl: 'https://doi.org/10.1109/tro.2024.4242',
  coreUrl: 'https://core.ac.uk/works/4242',
  citationCount: 14,
};

describe('PaperDetailDialogComponent', () => {
  let fixture: ComponentFixture<PaperDetailDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaperDetailDialogComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();

    fixture = TestBed.createComponent(PaperDetailDialogComponent);
    fixture.componentRef.setInput('paper', SAMPLE_PAPER);
    fixture.detectChanges();
  });

  it('renders full author list, full abstract, completeness summary, and closes on close click', () => {
    const el = fixture.nativeElement as HTMLElement;
    const dialog = el.querySelector('[data-testid="paper-detail-dialog"]');
    const closeSpy = vi.fn();
    fixture.componentInstance.closeDialog.subscribe(closeSpy);

    expect(dialog?.getAttribute('role')).toBe('dialog');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(el.textContent).toContain('Authors (6)');
    expect(el.textContent).toContain('F. Author');
    expect(el.textContent).toContain('Complete untruncated abstract');
    expect(el.textContent).toContain('5/5 (Complete)');

    el.querySelector<HTMLButtonElement>('[data-testid="paper-detail-close"]')?.click();
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });
});
