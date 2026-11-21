import { FormControl } from '@angular/forms';
import {
  isSupportedResultLimit,
  resultLimitValidator,
  SUPPORTED_RESULT_LIMITS,
  validateResultLimit,
} from './result-limit.validator';

describe('result-limit.validator', () => {
  it('accepts all CORE-verified supported result counts (10, 20, 50, 100)', () => {
    for (const option of SUPPORTED_RESULT_LIMITS) {
      const numericResult = validateResultLimit(option);
      expect(numericResult.valid).toBe(true);
      expect(numericResult.value).toBe(option);

      const stringResult = validateResultLimit(String(option));
      expect(stringResult.valid).toBe(true);
      expect(stringResult.value).toBe(option);
      expect(isSupportedResultLimit(option)).toBe(true);
    }
  });

  it('rejects values exceeding CORE max limit (100), non-positive values, and unsupported numbers', () => {
    expect(validateResultLimit(101).valid).toBe(false);
    expect(validateResultLimit(101).message).toContain('100');
    expect(validateResultLimit(0).valid).toBe(false);
    expect(validateResultLimit(-10).valid).toBe(false);
    expect(validateResultLimit(25).valid).toBe(false);
    expect(validateResultLimit('abc').valid).toBe(false);
    expect(validateResultLimit(null).valid).toBe(false);
  });

  it('integrates cleanly with Angular Reactive Forms via resultLimitValidator()', () => {
    const control = new FormControl<number>(20, {
      nonNullable: true,
      validators: [resultLimitValidator()],
    });
    expect(control.valid).toBe(true);

    control.setValue(250);
    expect(control.invalid).toBe(true);
    expect(control.errors?.['resultLimit']).toBeDefined();
  });
});
