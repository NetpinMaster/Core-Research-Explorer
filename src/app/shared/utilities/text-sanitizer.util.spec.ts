import { normalizeDoi, sanitizeHttpUrl, sanitizePlainText } from './text-sanitizer.util';

describe('text-sanitizer.util', () => {
  it('decodes HTML entities and strips HTML markup safely into plain text', () => {
    const raw = '&lt;p&gt;This is the first release for &amp;ldquo;DRONE&amp;rdquo;.&lt;/p&gt;';
    expect(sanitizePlainText(raw)).toBe('This is the first release for “DRONE”.');
  });

  it('strips truncated trailing CORE HTML tags and semicolon-less entities', () => {
    expect(sanitizePlainText('&lt;p&gt;This is the first release for DRONE.&lt;/p&gt')).toBe(
      'This is the first release for DRONE.'
    );
    expect(sanitizePlainText('Multi-Package Drone Delivery</p')).toBe(
      'Multi-Package Drone Delivery'
    );
  });

  it('filters out empty strings and CORE public placeholder messages', () => {
    expect(sanitizePlainText('   ')).toBeNull();
    expect(sanitizePlainText('Not available for public API users.')).toBeNull();
    expect(sanitizePlainText(null)).toBeNull();
  });

  it('allows only http and https URLs and rejects javascript/data URIs', () => {
    expect(sanitizeHttpUrl('https://core.ac.uk/works/314191')).toBe(
      'https://core.ac.uk/works/314191'
    );
    expect(sanitizeHttpUrl('http://example.org/paper.pdf')).toBe('http://example.org/paper.pdf');
    expect(sanitizeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(sanitizeHttpUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
    expect(sanitizeHttpUrl('not a url')).toBeNull();
  });

  it('normalizes DOI prefixes cleanly', () => {
    expect(normalizeDoi('https://doi.org/10.5281/zenodo.2450167')).toBe(
      '10.5281/zenodo.2450167'
    );
    expect(normalizeDoi('doi: 10.1000/xyz123')).toBe('10.1000/xyz123');
    expect(normalizeDoi('  ')).toBeNull();
  });
});
