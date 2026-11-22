import { describe, expect, it } from 'vitest';
import {
  deriveQuerySuggestions,
  extractActivePrefixContext,
  splitSuggestionDisplay,
} from './query-suggestions.util';

describe('query-suggestions.util', () => {
  it('extracts active prefix tokens for plain and nested Boolean queries', () => {
    expect(extractActivePrefixContext('dro')).toEqual({
      prefixBeforeToken: '',
      activeToken: 'dro',
      coreQuery: 'title:dro*',
    });

    expect(extractActivePrefixContext('(drone AND deliv')).toEqual({
      prefixBeforeToken: '(drone AND ',
      activeToken: 'deliv',
      coreQuery: 'title:deliv*',
    });
  });

  it('ignores short tokens, trailing spaces, Boolean operators, field prefixes, and open quotes', () => {
    expect(extractActivePrefixContext('dr')).toBeNull();
    expect(extractActivePrefixContext('drone ')).toBeNull();
    expect(extractActivePrefixContext('drone AND')).toBeNull();
    expect(extractActivePrefixContext('title:drone')).toBeNull();
    expect(extractActivePrefixContext('"autonomous dro')).toBeNull();
    expect(extractActivePrefixContext('(drone)')).toBeNull();
  });

  it('derives frequency-ranked query prefix suggestions from CORE paper titles', () => {
    const context = extractActivePrefixContext('drone');
    expect(context).not.toBeNull();

    const titles = [
      'Autonomous Drone Delivery Systems for Urban Logistics',
      'Energy-Efficient Drone Delivery Routing Optimization',
      'Drone Swarm Coordination in Emergency Response',
      'Drone Navigation under GPS-Denied Conditions',
    ];

    const suggestions = deriveQuerySuggestions(context!, titles, 4);

    expect(suggestions[0]).toEqual({
      label: 'drone delivery',
      completedQuery: 'drone delivery',
      matchCount: 2,
    });
    expect(suggestions.map((s) => s.label)).toContain('drone swarm');
    expect(suggestions.map((s) => s.label)).toContain('drone navigation');
  });

  it('preserves leading Boolean syntax when building completed queries', () => {
    const context = extractActivePrefixContext('drone AND deliv');
    const suggestions = deriveQuerySuggestions(
      context!,
      ['Parcel Delivery Routing', 'Last-Mile Delivery Networks'],
      3
    );

    expect(suggestions[0]?.label).toBe('delivery');
    expect(suggestions[0]?.completedQuery).toBe('drone AND delivery');
  });

  it('splits typed prefix from suggested completion suffix cleanly', () => {
    expect(splitSuggestionDisplay('drone AND delivery', 'drone AND deliv')).toEqual({
      prefix: 'drone AND deliv',
      completion: 'ery',
    });
    expect(splitSuggestionDisplay('drone delivery', 'other')).toEqual({
      prefix: '',
      completion: 'drone delivery',
    });
  });
});
