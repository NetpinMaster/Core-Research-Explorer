const NAMED_HTML_ENTITIES: Readonly<Record<string, string>> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
  '&#39;': "'",
  '&nbsp;': ' ',
  '&ndash;': '–',
  '&mdash;': '—',
  '&lsquo;': '‘',
  '&rsquo;': '’',
  '&ldquo;': '“',
  '&rdquo;': '”',
};

const UNSUPPORTED_PLACEHOLDER_PATTERNS: readonly RegExp[] = [
  /^not available for public api users\.?$/i,
  /^no abstract available\.?$/i,
];

function decodeHtmlEntitiesOnce(value: string): string {
  return value
    .replace(
      /&(?:amp|lt|gt|quot|apos|#39|nbsp|ndash|mdash|lsquo|rsquo|ldquo|rdquo);?/gi,
      (match) => {
        const normalized = match.endsWith(';') ? match.toLowerCase() : `${match.toLowerCase()};`;
        return NAMED_HTML_ENTITIES[normalized] ?? match;
      }
    )
    .replace(/&#(\d+);/g, (_match, dec: string) => {
      const codePoint = Number.parseInt(dec, 10);
      return Number.isFinite(codePoint) && codePoint >= 32 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : '';
    })
    .replace(/&#x([0-9a-f]+);/gi, (_match, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      return Number.isFinite(codePoint) && codePoint >= 32 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : '';
    });
}

/**
 * Converts potentially HTML-encoded or markup-bearing CORE text fields
 * into clean plain text without invoking DOM innerHTML parsing.
 */
export function sanitizePlainText(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  let text = decodeHtmlEntitiesOnce(raw);
  // Decode a second pass to handle double-encoded repository metadata (e.g. &amp;lt;p&amp;gt;)
  text = decodeHtmlEntitiesOnce(text);
  // Strip complete HTML/XML tags and any truncated trailing tag fragment (e.g. "</p" from CORE truncation)
  text = text.replace(/<[^>]*>/g, ' ').replace(/<\/?[a-z][a-z0-9:-]*\s*$/i, '');
  // Normalize whitespace and control characters
  text = text.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();

  if (text.length === 0) {
    return null;
  }

  if (UNSUPPORTED_PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(text))) {
    return null;
  }

  return text;
}

/**
 * Validates external publication/repository URLs and allows only http: or https: schemes.
 */
export function sanitizeHttpUrl(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') {
    return null;
  }

  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return null;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Normalizes a DOI value by stripping leading URL prefixes while preserving the identifier.
 */
export function normalizeDoi(raw: string | null | undefined): string | null {
  const cleaned = sanitizePlainText(raw);
  if (!cleaned) {
    return null;
  }
  const normalized = cleaned.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '').replace(/^doi:\s*/i, '').trim();
  return normalized.length > 0 ? normalized : null;
}
