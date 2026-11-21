import { validateBooleanQuery } from './boolean-query.validator';

describe('boolean-query.validator', () => {
  it('accepts all mandatory Boolean search queries and preserves exact expression syntax', () => {
    const validQueries = [
      'drone',
      'drone AND delivery',
      'drone OR delivery',
      '(drone AND (package OR delivery))',
      'title:"autonomous flight" AND yearPublished>=2020',
      'drone AND NOT military',
      '"UAV (delivery)" AND routing',
    ];

    for (const q of validQueries) {
      const result = validateBooleanQuery(q);
      expect(result.valid).toBe(true);
      expect(result.normalizedQuery).toBe(q);
    }
  });

  it('rejects empty and excessively long queries', () => {
    const empty = validateBooleanQuery('   ');
    expect(empty.valid).toBe(false);
    expect(empty.code).toBe('empty');

    const tooLong = validateBooleanQuery('a'.repeat(501), 500);
    expect(tooLong.valid).toBe(false);
    expect(tooLong.code).toBe('too_long');
  });

  it('rejects unbalanced parentheses and empty groups', () => {
    expect(validateBooleanQuery('(drone AND delivery').code).toBe('unbalanced_parentheses');
    expect(validateBooleanQuery('drone AND delivery)').code).toBe('unbalanced_parentheses');
    expect(validateBooleanQuery('((drone AND (package OR delivery))').code).toBe(
      'unbalanced_parentheses'
    );
    expect(validateBooleanQuery('drone AND ()').code).toBe('empty_group');
  });

  it('rejects unclosed quotes and unsupported Boolean operators', () => {
    expect(validateBooleanQuery('title:"autonomous drone').code).toBe('unbalanced_quotes');
    expect(validateBooleanQuery('drone && delivery').code).toBe('unsupported_operator');
    expect(validateBooleanQuery('drone || delivery').code).toBe('unsupported_operator');
    expect(validateBooleanQuery('drone XOR delivery').code).toBe('unsupported_operator');
  });

  it('rejects leading, trailing, or consecutive binary operators', () => {
    expect(validateBooleanQuery('AND drone').code).toBe('invalid_operator_position');
    expect(validateBooleanQuery('drone OR').code).toBe('invalid_operator_position');
    expect(validateBooleanQuery('drone AND OR delivery').code).toBe('invalid_operator_position');
    expect(validateBooleanQuery('(OR drone)').code).toBe('invalid_operator_position');
    expect(validateBooleanQuery('(drone AND)').code).toBe('invalid_operator_position');
    expect(validateBooleanQuery('drone NOT').code).toBe('invalid_operator_position');
  });
});
