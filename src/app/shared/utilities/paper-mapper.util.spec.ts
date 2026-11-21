import type { CoreWorkDto } from '../../core/models/core-api.models';
import {
  mapCoreSearchResponseDto,
  mapCoreWorkDtoToPaper,
  parseValidatedPublicationYear,
} from './paper-mapper.util';

describe('paper-mapper.util', () => {
  it('maps a live-shaped CORE work DTO cleanly without inventing metadata', () => {
    const dto: CoreWorkDto = {
      id: 314191,
      title: 'Drone congregation areas of red dwarf honeybee',
      authors: [{ name: 'Narayanappa Nagaraja' }, { name: 'Axel Brockmann' }],
      yearPublished: 2009,
      abstract: '&lt;p&gt;The drones of dwarf honeybees assemble near trees.&lt;/p&gt;',
      doi: '10.10101/npre.2009.3955.1',
      publisher: 'Nature Precedings',
      journals: [{ title: null, identifiers: [] }, { title: 'Apidologie' }],
      fieldOfStudy: 'Biology',
      dataProviders: [{ id: 77, name: 'Nature Precedings' }],
      downloadUrl: 'https://core.ac.uk/download/288911.pdf',
      links: [
        { type: 'display', url: 'https://core.ac.uk/works/314191' },
        { type: 'download', url: 'https://core.ac.uk/download/288911.pdf' },
      ],
    };

    const paper = mapCoreWorkDtoToPaper(dto, 0, 2026);
    expect(paper.id).toBe('314191');
    expect(paper.authors).toEqual(['Narayanappa Nagaraja', 'Axel Brockmann']);
    expect(paper.yearPublished).toBe(2009);
    expect(paper.hasValidYear).toBe(true);
    expect(paper.abstractText).toBe('The drones of dwarf honeybees assemble near trees.');
    expect(paper.journal).toBe('Apidologie');
    expect(paper.openAccessStatus).toBe('fulltext');
    expect(paper.downloadUrl).toBe('https://core.ac.uk/download/288911.pdf');
    expect(paper.coreUrl).toBe('https://core.ac.uk/works/314191');
  });

  it('rejects dirty upstream sentinel years such as 9999 or 0', () => {
    const sentinel = parseValidatedPublicationYear(9999, '', 2026);
    expect(sentinel.hasValidYear).toBe(false);
    expect(sentinel.yearPublished).toBeNull();
    expect(sentinel.rawYearPublished).toBe(9999);

    const zeroYear = parseValidatedPublicationYear(0, null, 2026);
    expect(zeroYear.hasValidYear).toBe(false);
    expect(zeroYear.yearPublished).toBeNull();

    const recoveredFromIso = parseValidatedPublicationYear(9999, '2023-05-14T00:00:00Z', 2026);
    expect(recoveredFromIso.hasValidYear).toBe(true);
    expect(recoveredFromIso.yearPublished).toBe(2023);
  });

  it('handles sparse records and unsafe URLs safely', () => {
    const mapped = mapCoreSearchResponseDto(
      {
        totalHits: 1,
        limit: 10,
        offset: 0,
        results: [
          {
            id: 500,
            title: 'Sparse Paper',
            authors: [],
            yearPublished: null,
            abstract: '',
            downloadUrl: 'javascript:alert(1)',
            links: [{ type: 'display', url: 'javascript:void(0)' }],
          },
        ],
      },
      10,
      2026
    );

    expect(mapped.totalHits).toBe(1);
    expect(mapped.papers.length).toBe(1);
    expect(mapped.papers[0].downloadUrl).toBeNull();
    expect(mapped.papers[0].coreUrl).toBeNull();
    expect(mapped.papers[0].sourceUrl).toBeNull();
    expect(mapped.papers[0].openAccessStatus).toBe('metadata_only');
  });
});
