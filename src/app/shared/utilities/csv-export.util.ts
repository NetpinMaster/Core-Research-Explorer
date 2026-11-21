import type { ResearchPaper } from '../../core/models/research-paper.model';

const FORMULA_TRIGGER_PATTERN = /^[\t\r\n ]*[=+\-@]/;

/**
 * Neutralizes spreadsheet formula injection (CSV/DDE injection) and applies
 * RFC-4180 quoting so exported files open safely in Excel, Sheets, and Calc.
 */
export function sanitizeCsvCell(rawValue: string | number | null | undefined): string {
  if (rawValue === null || rawValue === undefined) {
    return '';
  }

  let text = String(rawValue);
  if (FORMULA_TRIGGER_PATTERN.test(text)) {
    text = `'${text}`;
  }

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

const CSV_HEADERS = [
  'CORE ID',
  'Title',
  'Authors',
  'Year Published',
  'Journal',
  'Publisher',
  'DOI',
  'Field of Study',
  'Repository',
  'Open Access',
  'Full Text URL',
  'CORE Record URL',
  'Source URL',
  'Abstract',
] as const;

export function buildPapersCsv(papers: readonly ResearchPaper[]): string {
  const rows: string[] = [CSV_HEADERS.map((header) => sanitizeCsvCell(header)).join(',')];

  for (const paper of papers) {
    const cells = [
      paper.id,
      paper.title,
      paper.authors.join('; '),
      paper.hasValidYear && paper.yearPublished !== null ? paper.yearPublished : '',
      paper.journal ?? '',
      paper.publisher ?? '',
      paper.doi ?? '',
      paper.fieldOfStudy ?? '',
      paper.dataProvider ?? '',
      paper.openAccessStatus === 'fulltext' ? 'Open-access full text' : 'Metadata only',
      paper.downloadUrl ?? '',
      paper.coreUrl ?? '',
      paper.sourceUrl ?? '',
      paper.abstractText ?? '',
    ];

    rows.push(cells.map((cell) => sanitizeCsvCell(cell)).join(','));
  }

  // UTF-8 BOM ensures Excel decodes diacritics and scholarly characters cleanly.
  return `\uFEFF${rows.join('\r\n')}\r\n`;
}

export function buildCsvFilename(query: string, date: Date = new Date()): string {
  const slug = query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);

  const isoDate = date.toISOString().slice(0, 10);
  return `core-research-${slug || 'results'}-${isoDate}.csv`;
}

export function triggerCsvDownload(csvContent: string, filename: string): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}
