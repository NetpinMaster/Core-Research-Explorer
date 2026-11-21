export interface SearchSuggestion {
  readonly label: string;
  readonly completedQuery: string;
  readonly matchCount: number;
}

export interface ParsedPrefixContext {
  readonly prefixBeforeToken: string;
  readonly activeToken: string;
  readonly coreQuery: string;
}

const BOOLEAN_OPERATORS = new Set(['AND', 'OR', 'NOT']);
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'is',
  'of',
  'on',
  'or',
  'the',
  'to',
  'using',
  'with',
]);

export const MIN_SUGGESTION_TOKEN_LENGTH = 3;

/**
 * Extracts the trailing keyword token the user is currently typing while
 * preserving any leading Boolean expression (e.g. `drone AND deliv` ->
 * prefixBeforeToken: `drone AND `, activeToken: `deliv`).
 */
export function extractActivePrefixContext(rawInput: string): ParsedPrefixContext | null {
  if (!rawInput || rawInput.endsWith(' ') || rawInput.endsWith(')')) {
    return null;
  }

  // Do not fire suggestions while inside an unclosed double-quoted phrase.
  const quoteCount = (rawInput.match(/"/g) ?? []).length;
  if (quoteCount % 2 !== 0) {
    return null;
  }

  const match = rawInput.match(/^(.*?)([A-Za-z][A-Za-z0-9-]{2,})$/);
  if (!match) {
    return null;
  }

  const prefixBeforeToken = match[1];
  const activeToken = match[2];

  // Skip field prefixes like `title:` or uppercase Boolean keywords.
  if (prefixBeforeToken.endsWith(':') || BOOLEAN_OPERATORS.has(activeToken.toUpperCase())) {
    return null;
  }

  if (activeToken.length < MIN_SUGGESTION_TOKEN_LENGTH) {
    return null;
  }

  return {
    prefixBeforeToken,
    activeToken,
    coreQuery: activeToken.toLowerCase(),
  };
}

/**
 * Derives popular query prefix completions directly from real scholarly titles
 * returned by CORE API v3, ranked by frequency across returned works.
 */
export function deriveQuerySuggestions(
  context: ParsedPrefixContext,
  titles: readonly string[],
  maxSuggestions = 6
): readonly SearchSuggestion[] {
  const tokenLower = context.activeToken.toLowerCase();
  const phraseCounts = new Map<string, number>();

  for (const title of titles) {
    if (!title) {
      continue;
    }

    const words = title
      .replace(/[^A-Za-z0-9-\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length >= 2);

    const seenInTitle = new Set<string>();

    for (let i = 0; i < words.length; i += 1) {
      const current = words[i].toLowerCase();
      if (!current.startsWith(tokenLower)) {
        continue;
      }

      // Single-word completion if it extends the typed prefix (e.g. deliv -> delivery).
      if (current.length > tokenLower.length && !STOP_WORDS.has(current)) {
        seenInTitle.add(current);
      }

      // Two-word scholarly phrase starting with the matching prefix (e.g. drone delivery).
      const next = words[i + 1]?.toLowerCase();
      if (next && next.length >= 3 && !STOP_WORDS.has(next)) {
        seenInTitle.add(`${current} ${next}`);

        // Optional three-word phrase when the third word is also meaningful.
        const third = words[i + 2]?.toLowerCase();
        if (third && third.length >= 3 && !STOP_WORDS.has(third)) {
          seenInTitle.add(`${current} ${next} ${third}`);
        }
      }
    }

    for (const phrase of seenInTitle) {
      phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
    }
  }

  const trimmedExisting = `${context.prefixBeforeToken}${context.activeToken}`.trim().toLowerCase();

  return Array.from(phraseCounts.entries())
    .map(([label, matchCount]): SearchSuggestion => {
      const completedQuery = `${context.prefixBeforeToken}${label}`.trim();
      return { label, completedQuery, matchCount };
    })
    .filter((item) => item.completedQuery.toLowerCase() !== trimmedExisting)
    .sort((a, b) => {
      if (b.matchCount !== a.matchCount) {
        return b.matchCount - a.matchCount;
      }
      // Prefer concise 1-2 word phrases when frequency ties.
      const wordsA = a.label.split(' ').length;
      const wordsB = b.label.split(' ').length;
      if (wordsA !== wordsB) {
        return wordsA - wordsB;
      }
      return a.label.localeCompare(b.label);
    })
    .slice(0, maxSuggestions);
}
