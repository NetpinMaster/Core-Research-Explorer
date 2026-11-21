import { describe, expect, it } from 'vitest';
import type { ResearchPaper } from '../../core/models/research-paper.model';
import { assessMetadataCompleteness } from './metadata-completeness.util';

const BASE_PAPER: ResearchPaper = {
  id: '1',
  title: 'Test Paper',
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

describe('metadata-completeness.util', () => {
  it('scores a fully populated record as 5/5 Complete', () => {
    const result = assessMetadataCompleteness({
      ...BASE_PAPER,
      yearPublished: 2024,
      hasValidYear: true,
      authors: ['Ada Lovelace'],
      abstractText: 'A concise scientific abstract.',
      doi: '10.1000/test',
      journal: 'Nature Robotics',
    });

    expect(result.score).toBe(5);
    expect(result.total).toBe(5);
    expect(result.level).toBe('Complete');
    expect(result.missingFields).toEqual([]);
  });

  it('scores partial and minimal records accurately with explicit missing field names', () => {
    const partial = assessMetadataCompleteness({
      ...BASE_PAPER,
      yearPublished: 2022,
      hasValidYear: true,
      dataProvider: 'Zenodo',
    });
    expect(partial.score).toBe(2);
    expect(partial.level).toBe('Partial');
    expect(partial.missingFields).toEqual(['Authors', 'Abstract', 'DOI']);

    const minimal = assessMetadataCompleteness(BASE_PAPER);
    expect(minimal.score).toBe(0);
    expect(minimal.level).toBe('Minimal');
  });
});
