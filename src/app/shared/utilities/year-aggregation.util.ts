import type {
  ResearchAnalyticsSummary,
  ResearchPaper,
  YearDistributionPoint,
} from '../../core/models/research-paper.model';

export const MIN_ANALYTICS_YEAR = 1400;

export interface PublicationYearChartSeries {
  readonly labels: readonly string[];
  readonly counts: readonly number[];
  readonly percentages: readonly number[];
  readonly totalDated: number;
  readonly peak: YearDistributionPoint | null;
}

export function isValidAnalyticsYear(
  year: number | null | undefined,
  currentYear: number = new Date().getFullYear()
): year is number {
  return (
    typeof year === 'number' &&
    Number.isInteger(year) &&
    year >= MIN_ANALYTICS_YEAR &&
    year <= currentYear + 1
  );
}

/**
 * Aggregates publication years across the retrieved CORE result sample.
 * Papers without a valid publication year are excluded from the bar chart
 * distribution and counted explicitly under missingDateCount.
 */
export function aggregatePublicationYears(
  papers: readonly ResearchPaper[],
  currentYear: number = new Date().getFullYear()
): ResearchAnalyticsSummary {
  const counts = new Map<number, number>();
  let missingDateCount = 0;

  for (const paper of papers) {
    if (paper.hasValidYear && isValidAnalyticsYear(paper.yearPublished, currentYear)) {
      counts.set(paper.yearPublished, (counts.get(paper.yearPublished) ?? 0) + 1);
    } else {
      missingDateCount += 1;
    }
  }

  const distribution: YearDistributionPoint[] = Array.from(counts.entries())
    .sort(([yearA], [yearB]) => yearA - yearB)
    .map(([year, count]) => ({ year, count }));

  return {
    analysedCount: papers.length,
    datedCount: papers.length - missingDateCount,
    missingDateCount,
    earliestYear: distribution.length > 0 ? distribution[0].year : null,
    latestYear: distribution.length > 0 ? distribution[distribution.length - 1].year : null,
    distribution,
  };
}

/**
 * Finds the publication year with the highest paper count in a sorted distribution.
 * In case of a tie, selects the most recent peak year for clarity.
 */
export function findPeakPublicationYear(
  distribution: readonly YearDistributionPoint[]
): YearDistributionPoint | null {
  let peak: YearDistributionPoint | null = null;

  for (const point of distribution) {
    if (!peak || point.count >= peak.count) {
      peak = point;
    }
  }

  return peak;
}

export function buildPublicationYearSeries(
  distribution: readonly YearDistributionPoint[]
): PublicationYearChartSeries {
  const totalDated = distribution.reduce((sum, point) => sum + point.count, 0);
  const labels = distribution.map((point) => String(point.year));
  const counts = distribution.map((point) => point.count);
  const percentages = distribution.map((point) =>
    totalDated > 0 ? Math.round((point.count / totalDated) * 1000) / 10 : 0
  );

  return {
    labels,
    counts,
    percentages,
    totalDated,
    peak: findPeakPublicationYear(distribution),
  };
}
