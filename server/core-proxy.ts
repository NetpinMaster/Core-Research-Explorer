export const CORE_WORKS_SEARCH_URL = 'https://api.core.ac.uk/v3/search/works/';

export const MAX_QUERY_LENGTH = 500;
export const MIN_RESULT_LIMIT = 1;
export const MAX_RESULT_LIMIT = 100;
export const MAX_RESULT_OFFSET = 9900;
export const UPSTREAM_TIMEOUT_MS = 15_000;

export const ALLOWED_SORTS = new Set<string>([
  '',
  'yearPublished:desc',
  'yearPublished:asc',
]);

export interface ValidatedCoreSearchParams {
  readonly q: string;
  readonly limit: number;
  readonly offset: number;
  readonly sort: string;
}

export interface ProxyValidationError {
  readonly status: number;
  readonly code: string;
  readonly message: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly params: ValidatedCoreSearchParams }
  | { readonly ok: false; readonly error: ProxyValidationError };

export interface ProxyResponse {
  readonly status: number;
  readonly body: unknown;
  readonly headers: Record<string, string>;
}

interface CacheEntry {
  readonly expiresAt: number;
  readonly response: ProxyResponse;
}

const CACHE_TTL_MS = 60_000;
const MAX_CACHE_ENTRIES = 50;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/;

const responseCache = new Map<string, CacheEntry>();

export function clearProxyCache(): void {
  responseCache.clear();
}

export function validateCoreSearchQuery(raw: {
  q?: unknown;
  limit?: unknown;
  offset?: unknown;
  sort?: unknown;
}): ValidationResult {
  const rawQuery = typeof raw.q === 'string' ? raw.q.trim() : '';

  if (rawQuery.length === 0) {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'INVALID_QUERY',
        message: 'Search query parameter "q" is required and cannot be empty.',
      },
    };
  }

  if (rawQuery.length > MAX_QUERY_LENGTH) {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'QUERY_TOO_LONG',
        message: `Search query must not exceed ${MAX_QUERY_LENGTH} characters.`,
      },
    };
  }

  if (CONTROL_CHAR_PATTERN.test(rawQuery)) {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'INVALID_CHARACTERS',
        message: 'Search query contains unsupported control characters.',
      },
    };
  }

  const parsedLimit =
    raw.limit === undefined || raw.limit === ''
      ? 10
      : Number(typeof raw.limit === 'string' ? raw.limit.trim() : raw.limit);

  if (
    !Number.isInteger(parsedLimit) ||
    parsedLimit < MIN_RESULT_LIMIT ||
    parsedLimit > MAX_RESULT_LIMIT
  ) {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'INVALID_LIMIT',
        message: `Parameter "limit" must be an integer between ${MIN_RESULT_LIMIT} and ${MAX_RESULT_LIMIT}.`,
      },
    };
  }

  const parsedOffset =
    raw.offset === undefined || raw.offset === ''
      ? 0
      : Number(typeof raw.offset === 'string' ? raw.offset.trim() : raw.offset);

  if (
    !Number.isInteger(parsedOffset) ||
    parsedOffset < 0 ||
    parsedOffset > MAX_RESULT_OFFSET
  ) {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'INVALID_OFFSET',
        message: `Parameter "offset" must be an integer between 0 and ${MAX_RESULT_OFFSET}.`,
      },
    };
  }

  const parsedSort = typeof raw.sort === 'string' ? raw.sort.trim() : '';
  if (!ALLOWED_SORTS.has(parsedSort)) {
    return {
      ok: false,
      error: {
        status: 400,
        code: 'INVALID_SORT',
        message: 'Unsupported sort parameter. Allowed values: yearPublished:desc, yearPublished:asc.',
      },
    };
  }

  return {
    ok: true,
    params: {
      q: rawQuery,
      limit: parsedLimit,
      offset: parsedOffset,
      sort: parsedSort,
    },
  };
}

export function buildUpstreamCoreUrl(params: ValidatedCoreSearchParams): string {
  const url = new URL(CORE_WORKS_SEARCH_URL);
  url.searchParams.set('q', params.q);
  url.searchParams.set('limit', String(params.limit));
  if (params.offset > 0) {
    url.searchParams.set('offset', String(params.offset));
  }
  if (params.sort.length > 0) {
    url.searchParams.set('sort', params.sort);
  }
  return url.toString();
}

function setBoundedCache(key: string, response: ProxyResponse): void {
  if (responseCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = responseCache.keys().next().value;
    if (oldestKey !== undefined) {
      responseCache.delete(oldestKey);
    }
  }
  responseCache.set(key, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    response,
  });
}

export async function executeCoreWorksSearch(
  rawQuery: { q?: unknown; limit?: unknown; offset?: unknown; sort?: unknown },
  options: {
    readonly apiKey?: string;
    readonly fetchImpl?: typeof fetch;
    readonly now?: () => number;
  } = {}
): Promise<ProxyResponse> {
  const validation = validateCoreSearchQuery(rawQuery);
  if (!validation.ok) {
    return {
      status: validation.error.status,
      body: { error: validation.error },
      headers: { 'cache-control': 'no-store' },
    };
  }

  const upstreamUrl = buildUpstreamCoreUrl(validation.params);
  const now = options.now ?? Date.now;
  const cached = responseCache.get(upstreamUrl);
  if (cached && cached.expiresAt > now()) {
    return {
      status: cached.response.status,
      body: cached.response.body,
      headers: {
        ...cached.response.headers,
        'x-proxy-cache': 'HIT',
      },
    };
  }

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'User-Agent': 'CORE-Research-Explorer-Angular/1.0',
  };

  const trimmedKey = options.apiKey?.trim();
  if (trimmedKey) {
    headers['Authorization'] = `Bearer ${trimmedKey}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  const fetchFn = options.fetchImpl ?? fetch;

  try {
    const upstream = await fetchFn(upstreamUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });

    const forwardedHeaders: Record<string, string> = {
      'cache-control': 'private, max-age=30',
      'x-proxy-cache': 'MISS',
    };

    for (const headerName of [
      'x-ratelimit-limit',
      'x-ratelimit-remaining',
      'x-ratelimit-retry-after',
    ]) {
      const value = upstream.headers.get(headerName);
      if (value) {
        forwardedHeaders[headerName] = value;
      }
    }

    const rawText = await upstream.text();
    let parsedJson: unknown = null;
    if (rawText.length > 0) {
      try {
        parsedJson = JSON.parse(rawText);
      } catch {
        parsedJson = null;
      }
    }

    if (!upstream.ok) {
      const retryAfter = upstream.headers.get('x-ratelimit-retry-after') ?? undefined;
      let message = 'CORE API returned an upstream error. Please try again.';
      let code = 'UPSTREAM_ERROR';

      if (upstream.status === 400) {
        code = 'CORE_BAD_REQUEST';
        message = 'CORE rejected the search expression. Verify Boolean operators and parentheses.';
      } else if (upstream.status === 401 || upstream.status === 403) {
        code = 'CORE_AUTH_ERROR';
        message = 'CORE API rejected the configured server credentials.';
      } else if (upstream.status === 429) {
        code = 'CORE_RATE_LIMIT';
        message =
          'CORE API rate limit reached. Wait briefly before retrying, or configure a server-side CORE_API_KEY.';
      } else if (upstream.status >= 500) {
        code = 'CORE_UNAVAILABLE';
        message = 'CORE API is temporarily unavailable. Please retry shortly.';
      }

      return {
        status: upstream.status,
        body: {
          error: {
            code,
            status: upstream.status,
            message,
            ...(retryAfter ? { retryAfter } : {}),
          },
        },
        headers: {
          ...forwardedHeaders,
          'cache-control': 'no-store',
        },
      };
    }

    if (parsedJson === null || typeof parsedJson !== 'object') {
      return {
        status: 502,
        body: {
          error: {
            code: 'INVALID_UPSTREAM_PAYLOAD',
            status: 502,
            message: 'CORE API returned an unexpected non-JSON response.',
          },
        },
        headers: { 'cache-control': 'no-store' },
      };
    }

    const successResponse: ProxyResponse = {
      status: 200,
      body: parsedJson,
      headers: forwardedHeaders,
    };
    setBoundedCache(upstreamUrl, successResponse);
    return successResponse;
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return {
      status: isAbort ? 504 : 502,
      body: {
        error: {
          code: isAbort ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_NETWORK_ERROR',
          status: isAbort ? 504 : 502,
          message: isAbort
            ? 'CORE API request timed out. Please retry.'
            : 'Unable to connect to CORE API from the proxy server.',
        },
      },
      headers: { 'cache-control': 'no-store' },
    };
  } finally {
    clearTimeout(timer);
  }
}
