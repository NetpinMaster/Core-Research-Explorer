import type { ResearchPaper } from '../../core/models/research-paper.model';

export type CompletenessLevel = 'Complete' | 'Partial' | 'Minimal';

export interface MetadataCompleteness {
  readonly score: number;
  readonly total: number;
  readonly level: CompletenessLevel;
  readonly presentFields: readonly string[];
  readonly missingFields: readonly string[];
  readonly summary: string;
}

/**
 * Evaluates scholarly metadata completeness using only fields genuinely returned
 * by CORE API v3: publication year, authors, abstract, DOI, and venue/repository.
 */
export function assessMetadataCompleteness(paper: ResearchPaper): MetadataCompleteness {
  const checks: readonly { label: string; present: boolean }[] = [
    { label: 'Publication year', present: paper.hasValidYear && paper.yearPublished !== null },
    { label: 'Authors', present: paper.authors.length > 0 },
    { label: 'Abstract', present: Boolean(paper.abstractText) },
    { label: 'DOI', present: Boolean(paper.doi) },
    { label: 'Venue / Repository', present: Boolean(paper.journal || paper.publisher || paper.dataProvider) },
  ];

  const presentFields = checks.filter((item) => item.present).map((item) => item.label);
  const missingFields = checks.filter((item) => !item.present).map((item) => item.label);
  const score = presentFields.length;
  const total = checks.length;

  let level: CompletenessLevel = 'Minimal';
  if (score >= 4) {
    level = 'Complete';
  } else if (score >= 2) {
    level = 'Partial';
  }

  const summary =
    missingFields.length === 0
      ? `All ${total} core metadata fields present`
      : `${score}/${total} core metadata fields present (missing: ${missingFields.join(', ')})`;

  return {
    score,
    total,
    level,
    presentFields,
    missingFields,
    summary,
  };
}
