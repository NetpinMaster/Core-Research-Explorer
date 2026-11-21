import type {
  CoreSearchResponseDto,
  CoreWorkDto,
} from '../../core/models/core-api.models';
import type { ResearchPaper } from '../../core/models/research-paper.model';
import { normalizeDoi, sanitizeHttpUrl, sanitizePlainText } from './text-sanitizer.util';

export const MIN_VALID_PUBLICATION_YEAR = 1400;

export function getMaxValidPublicationYear(referenceYear: number = new Date().getFullYear()): number {
  return referenceYear + 1;
}

export function parseValidatedPublicationYear(
  rawYear: number | string | null | undefined,
  publishedDate?: string | null,
  referenceYear: number = new Date().getFullYear()
): { readonly yearPublished: number | null; readonly rawYearPublished: number | null; readonly hasValidYear: boolean } {
  const maxYear = getMaxValidPublicationYear(referenceYear);
  let numericCandidate: number | null = null;

  if (typeof rawYear === 'number' && Number.isFinite(rawYear)) {
    numericCandidate = Math.trunc(rawYear);
  } else if (typeof rawYear === 'string' && /^\d{4}$/.test(rawYear.trim())) {
    numericCandidate = Number.parseInt(rawYear.trim(), 10);
  }

  if (
    numericCandidate !== null &&
    numericCandidate >= MIN_VALID_PUBLICATION_YEAR &&
    numericCandidate <= maxYear
  ) {
    return {
      yearPublished: numericCandidate,
      rawYearPublished: numericCandidate,
      hasValidYear: true,
    };
  }

  // Fallback: inspect ISO publishedDate prefix (YYYY-...) only if yearPublished was absent or sentinel (e.g. 9999)
  if (typeof publishedDate === 'string') {
    const match = /^(\d{4})(?:-\d{2}-\d{2})?/.exec(publishedDate.trim());
    if (match) {
      const extracted = Number.parseInt(match[1], 10);
      if (extracted >= MIN_VALID_PUBLICATION_YEAR && extracted <= maxYear) {
        return {
          yearPublished: extracted,
          rawYearPublished: numericCandidate ?? extracted,
          hasValidYear: true,
        };
      }
    }
  }

  return {
    yearPublished: null,
    rawYearPublished: numericCandidate,
    hasValidYear: false,
  };
}

export function mapCoreWorkDtoToPaper(
  dto: CoreWorkDto,
  fallbackIndex: number,
  referenceYear: number = new Date().getFullYear()
): ResearchPaper {
  const id =
    dto.id !== null && dto.id !== undefined && String(dto.id).trim().length > 0
      ? String(dto.id).trim()
      : `work-${fallbackIndex}`;

  const title = sanitizePlainText(dto.title) ?? 'Untitled research work';

  const authors: string[] = [];
  if (Array.isArray(dto.authors)) {
    for (const author of dto.authors) {
      const name = sanitizePlainText(author?.name);
      if (name && !authors.includes(name)) {
        authors.push(name);
      }
    }
  }

  const yearInfo = parseValidatedPublicationYear(dto.yearPublished, dto.publishedDate, referenceYear);
  const abstractText = sanitizePlainText(dto.abstract);
  const publisher = sanitizePlainText(dto.publisher);

  let journal: string | null = null;
  if (Array.isArray(dto.journals)) {
    for (const entry of dto.journals) {
      const journalTitle = sanitizePlainText(entry?.title);
      if (journalTitle) {
        journal = journalTitle;
        break;
      }
    }
  }

  const doi = normalizeDoi(dto.doi);

  let fieldOfStudy = sanitizePlainText(dto.fieldOfStudy);
  if (!fieldOfStudy && Array.isArray(dto.subjects)) {
    for (const subject of dto.subjects) {
      const cleanedSubject = sanitizePlainText(subject);
      if (cleanedSubject) {
        fieldOfStudy = cleanedSubject;
        break;
      }
    }
  }

  const documentType = sanitizePlainText(dto.documentType);
  const language = sanitizePlainText(dto.language?.name ?? dto.language?.code);

  let dataProvider: string | null = null;
  if (Array.isArray(dto.dataProviders)) {
    for (const provider of dto.dataProviders) {
      const name = sanitizePlainText(provider?.name);
      if (name) {
        dataProvider = name;
        break;
      }
    }
  }

  const links = Array.isArray(dto.links) ? dto.links : [];
  const downloadFromLinks =
    links.find((l) => l?.type === 'download')?.url ??
    links.find((l) => l?.type === 'reader')?.url ??
    null;
  const displayFromLinks = links.find((l) => l?.type === 'display')?.url ?? null;

  const firstFulltextSource = Array.isArray(dto.sourceFulltextUrls)
    ? dto.sourceFulltextUrls.find((u) => sanitizeHttpUrl(u) !== null) ?? null
    : null;

  const downloadUrl =
    sanitizeHttpUrl(dto.downloadUrl) ??
    sanitizeHttpUrl(firstFulltextSource) ??
    sanitizeHttpUrl(downloadFromLinks);

  const coreUrl = sanitizeHttpUrl(displayFromLinks);
  const doiUrl = doi ? sanitizeHttpUrl(`https://doi.org/${encodeURI(doi)}`) : null;
  const sourceUrl = doiUrl ?? coreUrl ?? downloadUrl;

  const citationCount =
    typeof dto.citationCount === 'number' && Number.isFinite(dto.citationCount) && dto.citationCount >= 0
      ? Math.trunc(dto.citationCount)
      : null;

  return {
    id,
    title,
    authors,
    yearPublished: yearInfo.yearPublished,
    rawYearPublished: yearInfo.rawYearPublished,
    hasValidYear: yearInfo.hasValidYear,
    abstractText,
    publisher,
    journal,
    doi,
    fieldOfStudy,
    documentType,
    language,
    dataProvider,
    openAccessStatus: downloadUrl ? 'fulltext' : 'metadata_only',
    downloadUrl,
    sourceUrl,
    coreUrl,
    citationCount,
  };
}

export function mapCoreSearchResponseDto(
  dto: CoreSearchResponseDto,
  fallbackLimit: number,
  referenceYear: number = new Date().getFullYear()
): {
  readonly totalHits: number | null;
  readonly limit: number;
  readonly offset: number;
  readonly papers: readonly ResearchPaper[];
} {
  const rawResults = Array.isArray(dto.results) ? dto.results : [];
  const papers = rawResults.map((work, index) =>
    mapCoreWorkDtoToPaper(work, index, referenceYear)
  );

  const totalHits =
    typeof dto.totalHits === 'number' && Number.isFinite(dto.totalHits) && dto.totalHits >= 0
      ? Math.trunc(dto.totalHits)
      : null;

  const limit =
    typeof dto.limit === 'number' && Number.isFinite(dto.limit) && dto.limit > 0
      ? Math.trunc(dto.limit)
      : fallbackLimit;

  const offset =
    typeof dto.offset === 'number' && Number.isFinite(dto.offset) && dto.offset >= 0
      ? Math.trunc(dto.offset)
      : 0;

  return {
    totalHits,
    limit,
    offset,
    papers,
  };
}
