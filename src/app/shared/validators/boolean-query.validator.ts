import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const DEFAULT_MAX_QUERY_LENGTH = 500;

export type BooleanQueryValidationCode =
  | 'empty'
  | 'too_long'
  | 'control_chars'
  | 'unbalanced_quotes'
  | 'unbalanced_parentheses'
  | 'empty_group'
  | 'unsupported_operator'
  | 'invalid_operator_position';

export interface BooleanQueryValidationResult {
  readonly valid: boolean;
  readonly normalizedQuery: string;
  readonly code?: BooleanQueryValidationCode;
  readonly message?: string;
}

const CONTROL_CHAR_REGEX = /[\u0000-\u001f\u007f]/;

interface QueryToken {
  readonly kind: 'lparen' | 'rparen' | 'binary_op' | 'unary_op' | 'unsupported_op' | 'term';
  readonly raw: string;
}

function tokenizeQueryOutsideQuotes(query: string): {
  readonly ok: boolean;
  readonly tokens: readonly QueryToken[];
  readonly errorCode?: BooleanQueryValidationCode;
  readonly errorMessage?: string;
} {
  const tokens: QueryToken[] = [];
  let i = 0;

  while (i < query.length) {
    const ch = query[i];

    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }

    if (ch === '"') {
      let j = i + 1;
      let closed = false;
      while (j < query.length) {
        if (query[j] === '\\' && j + 1 < query.length) {
          j += 2;
          continue;
        }
        if (query[j] === '"') {
          closed = true;
          j += 1;
          break;
        }
        j += 1;
      }
      if (!closed) {
        return {
          ok: false,
          tokens,
          errorCode: 'unbalanced_quotes',
          errorMessage: 'Unclosed quotation mark detected. Close all exact-phrase quotes (").',
        };
      }
      tokens.push({ kind: 'term', raw: query.slice(i, j) });
      i = j;
      continue;
    }

    if (ch === '(') {
      tokens.push({ kind: 'lparen', raw: '(' });
      i += 1;
      continue;
    }

    if (ch === ')') {
      tokens.push({ kind: 'rparen', raw: ')' });
      i += 1;
      continue;
    }

    if (query.startsWith('&&', i) || query.startsWith('||', i)) {
      const op = query.slice(i, i + 2);
      return {
        ok: false,
        tokens,
        errorCode: 'unsupported_operator',
        errorMessage: `Operator "${op}" is not supported by CORE search syntax. Use uppercase AND or OR instead.`,
      };
    }

    // Consume a non-whitespace word (stopping at unquoted parens or whitespace)
    let j = i;
    while (j < query.length && !/\s/.test(query[j]) && query[j] !== '(' && query[j] !== ')') {
      if (query[j] === '"') {
        // Support field:"quoted phrase" as a single term
        let k = j + 1;
        let closed = false;
        while (k < query.length) {
          if (query[k] === '\\' && k + 1 < query.length) {
            k += 2;
            continue;
          }
          if (query[k] === '"') {
            closed = true;
            k += 1;
            break;
          }
          k += 1;
        }
        if (!closed) {
          return {
            ok: false,
            tokens,
            errorCode: 'unbalanced_quotes',
            errorMessage: 'Unclosed quotation mark detected. Close all exact-phrase quotes (").',
          };
        }
        j = k;
        continue;
      }
      j += 1;
    }

    const word = query.slice(i, j);
    if (word === 'AND' || word === 'OR') {
      tokens.push({ kind: 'binary_op', raw: word });
    } else if (word === 'NOT') {
      tokens.push({ kind: 'unary_op', raw: word });
    } else if (word === 'XOR' || word === 'NAND' || word === 'NOR') {
      return {
        ok: false,
        tokens,
        errorCode: 'unsupported_operator',
        errorMessage: `Operator "${word}" is not supported by CORE search syntax. Combine AND, OR, NOT, and parentheses instead.`,
      };
    } else {
      tokens.push({ kind: 'term', raw: word });
    }
    i = j;
  }

  return { ok: true, tokens };
}

/**
 * Validates CORE v3 Boolean search expressions without rewriting user syntax.
 */
export function validateBooleanQuery(
  rawQuery: string,
  maxLength: number = DEFAULT_MAX_QUERY_LENGTH
): BooleanQueryValidationResult {
  const normalizedQuery = rawQuery.trim();

  if (normalizedQuery.length === 0) {
    return {
      valid: false,
      normalizedQuery,
      code: 'empty',
      message: 'Enter a keyword or Boolean expression before searching.',
    };
  }

  if (normalizedQuery.length > maxLength) {
    return {
      valid: false,
      normalizedQuery,
      code: 'too_long',
      message: `Search query must be ${maxLength} characters or fewer.`,
    };
  }

  if (CONTROL_CHAR_REGEX.test(normalizedQuery)) {
    return {
      valid: false,
      normalizedQuery,
      code: 'control_chars',
      message: 'Search query contains unsupported control characters.',
    };
  }

  const tokenized = tokenizeQueryOutsideQuotes(normalizedQuery);
  if (!tokenized.ok) {
    return {
      valid: false,
      normalizedQuery,
      code: tokenized.errorCode,
      message: tokenized.errorMessage,
    };
  }

  const { tokens } = tokenized;
  let depth = 0;

  for (let idx = 0; idx < tokens.length; idx += 1) {
    const token = tokens[idx];
    const prev = idx > 0 ? tokens[idx - 1] : null;
    const next = idx + 1 < tokens.length ? tokens[idx + 1] : null;

    if (token.kind === 'lparen') {
      depth += 1;
      if (next?.kind === 'rparen') {
        return {
          valid: false,
          normalizedQuery,
          code: 'empty_group',
          message: 'Empty parentheses "()" are not allowed. Add search terms inside the group.',
        };
      }
    } else if (token.kind === 'rparen') {
      depth -= 1;
      if (depth < 0) {
        return {
          valid: false,
          normalizedQuery,
          code: 'unbalanced_parentheses',
          message: 'Unmatched closing parenthesis ")". Check your parentheses grouping.',
        };
      }
    } else if (token.kind === 'binary_op') {
      if (
        prev === null ||
        prev.kind === 'lparen' ||
        prev.kind === 'binary_op' ||
        prev.kind === 'unary_op'
      ) {
        return {
          valid: false,
          normalizedQuery,
          code: 'invalid_operator_position',
          message: `Operator "${token.raw}" requires a search term or group before it.`,
        };
      }
      if (next === null || next.kind === 'rparen' || next.kind === 'binary_op') {
        return {
          valid: false,
          normalizedQuery,
          code: 'invalid_operator_position',
          message: `Operator "${token.raw}" requires a search term or group after it.`,
        };
      }
    } else if (token.kind === 'unary_op') {
      if (next === null || next.kind === 'rparen' || next.kind === 'binary_op') {
        return {
          valid: false,
          normalizedQuery,
          code: 'invalid_operator_position',
          message: 'Operator "NOT" must be followed by a search term or parenthesized group.',
        };
      }
    }
  }

  if (depth > 0) {
    return {
      valid: false,
      normalizedQuery,
      code: 'unbalanced_parentheses',
      message: `Missing ${depth} closing ${depth === 1 ? 'parenthesis' : 'parentheses'} ")".`,
    };
  }

  return {
    valid: true,
    normalizedQuery,
  };
}

export function booleanQueryValidator(
  maxLength: number = DEFAULT_MAX_QUERY_LENGTH
): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = typeof control.value === 'string' ? control.value : '';
    const result = validateBooleanQuery(value, maxLength);
    if (result.valid) {
      return null;
    }
    return {
      booleanQuery: {
        code: result.code,
        message: result.message,
      },
    };
  };
}
