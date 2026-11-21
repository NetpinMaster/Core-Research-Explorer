import { describe, expect, it } from 'vitest';
import type { ResearchPaper } from '../../core/models/research-paper.model';
import { buildCsvFilename, buildPapersCsv, sanitizeCsvCell } from './csv-export.util';

const SAMPLE_PAPER: ResearchPaper = {
  id: '9001',
  title: '=HYPERLINK("https://evil.example","Drone, "Delivery"")',
  authors: ['Alice Smith', 'Bob Jones'],
  yearPublished: 2024,
  rawYearPublished: 2024,
  hasValidYear: true,
  abstractText: 'Line one\nLine two',
  publisher: 'Academic Press',
  journal: 'Journal of Robotics',
  doi: '10.1000/drone.2024',
  fieldOfStudy: 'Engineering',
  documentType: 'research',
  language: 'en',
  dataProvider: 'Zenodo',
  openAccessStatus: 'fulltext',
  downloadUrl: 'https://core.ac.uk/download/pdf/9001.pdf',
  sourceUrl: 'https://doi.org/10.1000/drone.2024',
  coreUrl: 'https://core.ac.uk/works/9001',
  citationCount: 7,
};

describe('csv-export.util', () => {
  it('neutralizes spreadsheet formula triggers and quotes RFC-4180 special characters', () => {
    expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
    expect(sanitizeCsvCell('+SUM(A1:A2)')).toBe("'+SUM(A1:A2)");
    expect(sanitizeCsvCell('-cmd')).toBe("'-cmd");
    expect(sanitizeCsvCell('@evil')).toBe("'@evil");
    expect(sanitizeCsvCell('  =2+2')).toBe("'  =2+2");
    expect(sanitizeCsvCell('Drone, "Autonomous"')).toBe('"Drone, ""Autonomous"""');
    expect(sanitizeCsvCell(null)).toBe('');
  });

  it('builds a UTF-8 BOM CSV with escaped values and accurate columns', () => {
    const csv = buildPapersCsv([SAMPLE_PAPER]);
    expect(csv.startsWith('\uFEFFCORE ID,Title,Authors,')).toBe(true);
    expect(csv).toContain(`"'=HYPERLINK(""https://evil.example"",""Drone, ""Delivery"""")"`);
    expect(csv).toContain('Alice Smith; Bob Jones');
    expect(csv).toContain('"Line one\nLine two"');
    expect(csv).toContain('Open-access full text');
  });

  it('generates clean safe filenames from Boolean expressions', () => {
    const name = buildCsvFilename('(drone AND (package OR delivery))', new Date('2026-11-21T00:00:00Z'));
    expect(name).toBe('core-research-drone-and-package-or-delivery-2026-11-21.csv');
    expect(buildCsvFilename('   ', new Date('2026-11-21T00:00:00Z'))).toBe(
      'core-research-results-2026-11-21.csv'
    );
  });
});
