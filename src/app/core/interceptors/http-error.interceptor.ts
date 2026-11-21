import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError, timeout, TimeoutError } from 'rxjs';
import { APP_API_CONFIG } from '../configuration/api.config';

export type ResearchApiErrorKind =
  | 'validation'
  | 'rate_limit'
  | 'auth'
  | 'upstream'
  | 'timeout'
  | 'network'
  | 'unknown';

export interface ResearchApiError {
  readonly kind: ResearchApiErrorKind;
  readonly status: number;
  readonly message: string;
  readonly retryAfter?: string;
}

interface ProxyErrorEnvelope {
  readonly error?: {
    readonly code?: string;
    readonly message?: string;
    readonly status?: number;
    readonly retryAfter?: string;
  };
}

export function normalizeHttpError(err: unknown): ResearchApiError {
  if (err instanceof TimeoutError) {
    return {
      kind: 'timeout',
      status: 504,
      message: 'The CORE research service took too long to respond. Please try again.',
    };
  }

  if (err instanceof HttpErrorResponse) {
    const body = (err.error ?? {}) as ProxyErrorEnvelope;
    const serverMessage = typeof body.error?.message === 'string' ? body.error.message : undefined;
    const retryAfter =
      typeof body.error?.retryAfter === 'string'
        ? body.error.retryAfter
        : (err.headers.get('x-ratelimit-retry-after') ?? undefined);

    if (err.status === 0) {
      return {
        kind: 'network',
        status: 0,
        message: 'Unable to reach the research search service. Check your connection and retry.',
      };
    }

    if (err.status === 400) {
      return {
        kind: 'validation',
        status: 400,
        message:
          serverMessage ??
          'The search query could not be processed by CORE. Check your Boolean operators and parentheses.',
      };
    }

    if (err.status === 401 || err.status === 403) {
      return {
        kind: 'auth',
        status: err.status,
        message:
          serverMessage ??
          'CORE API authentication failed on the server proxy. Verify the server CORE_API_KEY setting.',
      };
    }

    if (err.status === 429) {
      return {
        kind: 'rate_limit',
        status: 429,
        message:
          serverMessage ??
          'CORE API rate limit reached. Wait a few seconds before retrying, or configure a CORE_API_KEY on the server.',
        retryAfter,
      };
    }

    if (err.status >= 500) {
      return {
        kind: 'upstream',
        status: err.status,
        message:
          serverMessage ??
          'CORE research service is temporarily unavailable. Please retry in a moment.',
      };
    }

    return {
      kind: 'unknown',
      status: err.status,
      message: serverMessage ?? `Unexpected error (${err.status}) while querying CORE.`,
    };
  }

  return {
    kind: 'unknown',
    status: 0,
    message: 'An unexpected error occurred while searching CORE.',
  };
}

export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(APP_API_CONFIG);

  return next(req).pipe(
    timeout(config.requestTimeoutMs),
    catchError((error: unknown) => throwError(() => normalizeHttpError(error)))
  );
};
