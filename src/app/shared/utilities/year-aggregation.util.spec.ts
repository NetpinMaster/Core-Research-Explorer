import { describe, expect, it } from 'vitest';
import type { ResearchPaper } from '../../core/models/research-paper.model';
import {
  aggregatePublicationYears,
  buildPublicationYearSeries,
  findPeakPublicationYear,
} from './year-aggregation.util';

function makePaper(id: string, yearPublished: number | null, hasValidYear = yearPublished !== null): ResearchPaper {
  return {
    id,
    title: `Paper ${id}`,
    authors: [],
    yearPublished,
    rawYearPublished: yearPublished,
    hasValidYear,
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
}

describe('year-aggregation.util', () => {
  it('returns empty summary for an empty paper list', () => {
    const summary = aggregatePublicationYears([], 2026);
    expect(summary).toEqual({
      analysedCount: 0,
      datedCount: 0,
      missingDateCount: 0,
      earliestYear: null,
      latestYear: null,
      distribution: [],
    });
  });

  it('groups valid years in ascending chronological order and tracks missing/invalid dates', () => {
    const papers = [
      makePaper('1', 2024, true),
      makePaper('2', 2021, true),
      makePaper('3', 2024, true),
      makePaper('4', null, false),
      makePaper('5', 9999, true), // defensive guard against sentinel future year
      makePaper('6', 0, true), // defensive guard against zero year
      makePaper('7', 2019, true),
    ];

    const summary = aggregatePublicationYears(papers, 2026);

    expect(summary.analysedCount).toBe(7);
    expect(summary.datedCount).toBe(4);
    expect(summary.missingDateCount).toBe(3);
    expect(summary.earliestYear).toBe(2019);
    expect(summary.latestYear).toBe(2024);
    expect(summary.distribution).toEqual([
      { year: 2019, count: 1 },
      { year: 2021, count: 1 },
      { year: 2024, count: 2 },
    ]);
  });

  it('handles samples where all papers are missing valid dates', () => {
    const papers = [makePaper('1', null, false), makePaper('2', 9999, false)];
    const summary = aggregatePublicationYears(papers, 2026);

    expect(summary.analysedCount).toBe(2);
    expect(summary.datedCount).toBe(0);
    expect(summary.missingDateCount).toBe(2);
    expect(summary.earliestYear).toBeNull();
    expect(summary.latestYear).toBeNull();
    expect(summary.distribution).toEqual([]);
  });

  it('builds chart labels, counts, percentages, and peak year accurately', () => {
    const series = buildPublicationYearSeries([
      { year: 2020, count: 1 },
      { year: 2022, count: 2 },
      { year: 2024, count: 2 },
    ]);

    expect(series.labels).toEqual(['2020', '2022', '2024']);
    expect(series.counts).toEqual([1, 2, 2]);
    expect(series.percentages).toEqual([20, 40, 40]);
    expect(series.totalDated).toBe(5);
    expect(series.peak).toEqual({ year: 2024, count: 2 });
    expect(findPeakPublicationYear([])).toBeNull();
  });
});
