import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import type { ResearchPaper } from '../../../core/models/research-paper.model';
import { ResearchPaperCardComponent } from './research-paper-card.component';

const COMPLETE_PAPER: ResearchPaper = {
  id: '314191',
  title: 'Autonomous Drone Delivery Routing in Dense Urban Corridors',
  authors: ['Alice Chen', 'Marcus Patel'],
  yearPublished: 2024,
  rawYearPublished: 2024,
  hasValidYear: true,
  abstractText: 'Empirical study evaluating package routing latency for autonomous aerial vehicles.',
  publisher: 'Open Science Press',
  journal: 'Journal of Autonomous Logistics',
  doi: '10.1234/jal.2024.001',
  fieldOfStudy: 'Engineering',
  documentType: 'research',
  language: 'English',
  dataProvider: 'Zenodo',
  openAccessStatus: 'fulltext',
  downloadUrl: 'https://core.ac.uk/download/314191.pdf',
  sourceUrl: 'https://core.ac.uk/works/314191',
  coreUrl: 'https://core.ac.uk/works/314191',
  citationCount: 12,
};

const SPARSE_PAPER: ResearchPaper = {
  id: '999001',
  title: 'Minimal Metadata Preprint Record',
  authors: [],
  yearPublished: null,
  rawYearPublished: null,
  hasValidYear: false,
  abstractText: null,
  publisher: null,
  journal: null,
  doi: null,
  fieldOfStudy: null,
  documentType: null,
  language: null,
  dataProvider: null,
  openAccessStatus: 'metadata_only',
  downloadUrl: null,
  sourceUrl: null,
  coreUrl: null,
  citationCount: null,
};

describe('ResearchPaperCardComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResearchPaperCardComponent],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  it('renders available bibliographic metadata and open-access links', () => {
    const fixture = TestBed.createComponent(ResearchPaperCardComponent);
    fixture.componentRef.setInput('paper', COMPLETE_PAPER);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.paper-card__title')?.textContent?.trim()).toContain(
      COMPLETE_PAPER.title
    );
    expect(el.querySelector('.paper-card__year')?.textContent?.trim()).toBe('2024');
    expect(el.querySelector('.paper-card__authors')?.textContent?.trim()).toBe(
      'Alice Chen, Marcus Patel'
    );
    expect(el.querySelector('.paper-card__doi')?.textContent).toContain('10.1234/jal.2024.001');
    expect(el.querySelector('.paper-card__oa')?.textContent).toContain('Open-access full text');
  });

  it('handles missing metadata gracefully without inventing authors, abstracts, DOIs, or links', () => {
    const fixture = TestBed.createComponent(ResearchPaperCardComponent);
    fixture.componentRef.setInput('paper', SPARSE_PAPER);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.paper-card__year')?.textContent?.trim()).toBe('Year unavailable');
    expect(el.querySelector('.paper-card__authors')).toBeNull();
    expect(el.querySelector('.paper-card__abstract')).toBeNull();
    expect(el.querySelector('.paper-card__doi')).toBeNull();
    expect(el.querySelector('.paper-card__oa')).toBeNull();
    expect(el.querySelectorAll('a').length).toBe(0);
  });

  it('provides unique paper-specific ARIA labels on card actions, links, and metadata completeness', () => {
    const fixture = TestBed.createComponent(ResearchPaperCardComponent);
    fixture.componentRef.setInput('paper', COMPLETE_PAPER);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const detailsBtn = el.querySelector<HTMLButtonElement>('[data-testid="paper-details-btn"]')!;
    const copyBtn = el.querySelector<HTMLButtonElement>('[data-testid="paper-copy-btn"]')!;
    const completeness = el.querySelector<HTMLElement>('[data-testid="paper-completeness"]')!;
    const fullTextLink = el.querySelector<HTMLAnchorElement>('.paper-card__link--primary')!;

    expect(detailsBtn.getAttribute('aria-label')).toBe(`View details for ${COMPLETE_PAPER.title}`);
    expect(copyBtn.getAttribute('aria-label')).toBe(`Copy DOI for ${COMPLETE_PAPER.title}`);
    expect(fullTextLink.getAttribute('aria-label')).toBe(
      `Open full text for ${COMPLETE_PAPER.title} (opens in a new tab)`
    );
    expect(completeness.getAttribute('aria-label')).toContain('Metadata completeness:');
    expect(el.querySelector('.paper-card__links')?.getAttribute('role')).toBe('group');
  });
});
