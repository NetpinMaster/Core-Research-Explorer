import type { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import type { SupportedResultLimit } from '../../core/models/research-paper.model';

export const SUPPORTED_RESULT_LIMITS: readonly SupportedResultLimit[] = [10, 20, 50, 100] as const;

export const MAX_CORE_SINGLE_REQUEST_LIMIT = 100;

export interface ResultLimitValidationResult {
  readonly valid: boolean;
  readonly value: SupportedResultLimit | null;
  readonly message?: string;
}

export function isSupportedResultLimit(value: unknown): value is SupportedResultLimit {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    (SUPPORTED_RESULT_LIMITS as readonly number[]).includes(value)
  );
}

/**
 * Parses and validates user-selected result count against CORE API v3's
 * documented single-request limit (max 100) and supported application tiers.
 */
export function validateResultLimit(raw: unknown): ResultLimitValidationResult {
  const numeric =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && /^\d+$/.test(raw.trim())
        ? Number.parseInt(raw.trim(), 10)
        : Number.NaN;

  if (!Number.isInteger(numeric) || numeric < 1) {
    return {
      valid: false,
      value: null,
      message: 'Result count must be a positive whole number.',
    };
  }

  if (numeric > MAX_CORE_SINGLE_REQUEST_LIMIT) {
    return {
      valid: false,
      value: null,
      message: `CORE API supports up to ${MAX_CORE_SINGLE_REQUEST_LIMIT} papers per request.`,
    };
  }

  if (!isSupportedResultLimit(numeric)) {
    return {
      valid: false,
      value: null,
      message: `Select one of the supported result sizes: ${SUPPORTED_RESULT_LIMITS.join(', ')}.`,
    };
  }

  return {
    valid: true,
    value: numeric,
  };
}

export function resultLimitValidator(): ValidatorFn {
  return (control: AbstractControl<unknown>): ValidationErrors | null => {
    const result = validateResultLimit(control.value);
    if (result.valid) {
      return null;
    }
    return {
      resultLimit: {
        message: result.message,
      },
    };
  };
}
