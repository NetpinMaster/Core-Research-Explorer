export type ResearchSortOption = '' | 'yearPublished:desc' | 'yearPublished:asc';

export type SupportedResultLimit = 10 | 20 | 50 | 100;

export type OpenAccessStatus = 'fulltext' | 'metadata_only';

export interface ResearchPaper {
  readonly id: string;
  readonly title: string;
  readonly authors: readonly string[];
  readonly yearPublished: number | null;
  readonly rawYearPublished: number | null;
  readonly hasValidYear: boolean;
  readonly abstractText: string | null;
  readonly publisher: string | null;
  readonly journal: string | null;
  readonly doi: string | null;
  readonly fieldOfStudy: string | null;
  readonly documentType: string | null;
  readonly language: string | null;
  readonly dataProvider: string | null;
  readonly openAccessStatus: OpenAccessStatus;
  readonly downloadUrl: string | null;
  readonly sourceUrl: string | null;
  readonly coreUrl: string | null;
  readonly citationCount: number | null;
}

export interface YearDistributionPoint {
  readonly year: number;
  readonly count: number;
}

export interface ResearchAnalyticsSummary {
  readonly analysedCount: number;
  readonly datedCount: number;
  readonly missingDateCount: number;
  readonly earliestYear: number | null;
  readonly latestYear: number | null;
  readonly distribution: readonly YearDistributionPoint[];
}
