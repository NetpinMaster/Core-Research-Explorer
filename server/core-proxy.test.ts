import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUpstreamCoreUrl,
  clearProxyCache,
  executeCoreWorksSearch,
  validateCoreSearchQuery,
} from './core-proxy.js';

test('validateCoreSearchQuery accepts valid Boolean query and bounds', () => {
  const res = validateCoreSearchQuery({
    q: '(drone AND (package OR delivery))',
    limit: '20',
    offset: '0',
    sort: 'yearPublished:desc',
  });

  assert.equal(res.ok, true);
  if (res.ok) {
    assert.equal(res.params.q, '(drone AND (package OR delivery))');
    assert.equal(res.params.limit, 20);
    assert.equal(res.params.offset, 0);
    assert.equal(res.params.sort, 'yearPublished:desc');
  }
});

test('validateCoreSearchQuery rejects empty query, out-of-range limit, control chars, and invalid sort', () => {
  assert.equal(validateCoreSearchQuery({ q: '   ' }).ok, false);
  assert.equal(validateCoreSearchQuery({ q: 'drone', limit: '101' }).ok, false);
  assert.equal(validateCoreSearchQuery({ q: 'drone', limit: '0' }).ok, false);
  assert.equal(validateCoreSearchQuery({ q: 'drone\x00test', limit: '10' }).ok, false);
  assert.equal(validateCoreSearchQuery({ q: 'drone', sort: 'malicious:desc' }).ok, false);
});

test('buildUpstreamCoreUrl encodes query strictly against CORE works endpoint', () => {
  const url = buildUpstreamCoreUrl({
    q: '(drone AND (package OR delivery))',
    limit: 50,
    offset: 0,
    sort: '',
  });
  const parsed = new URL(url);
  assert.equal(parsed.origin, 'https://api.core.ac.uk');
  assert.equal(parsed.pathname, '/v3/search/works/');
  assert.equal(parsed.searchParams.get('q'), '(drone AND (package OR delivery))');
  assert.equal(parsed.searchParams.get('limit'), '50');
  assert.equal(parsed.searchParams.has('offset'), false);
});

test('executeCoreWorksSearch injects Authorization header only when apiKey provided and caches 200 responses', async () => {
  clearProxyCache();
  let callCount = 0;
  let capturedAuthHeader: string | undefined;

  const fakeFetch: typeof fetch = async (_input, init) => {
    callCount += 1;
    const headers = init?.headers as Record<string, string>;
    capturedAuthHeader = headers['Authorization'];
    return new Response(JSON.stringify({ totalHits: 1, limit: 10, offset: 0, results: [] }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-ratelimit-limit': '100',
        'x-ratelimit-remaining': '99',
      },
    });
  };

  const first = await executeCoreWorksSearch(
    { q: 'drone', limit: '10' },
    { apiKey: 'test-secret-key', fetchImpl: fakeFetch }
  );
  assert.equal(first.status, 200);
  assert.equal(capturedAuthHeader, 'Bearer test-secret-key');
  assert.equal(first.headers['x-proxy-cache'], 'MISS');
  assert.equal(first.headers['x-ratelimit-remaining'], '99');

  const second = await executeCoreWorksSearch(
    { q: 'drone', limit: '10' },
    { apiKey: 'test-secret-key', fetchImpl: fakeFetch }
  );
  assert.equal(second.status, 200);
  assert.equal(second.headers['x-proxy-cache'], 'HIT');
  assert.equal(callCount, 1);
});

test('executeCoreWorksSearch normalizes 429 rate-limit upstream responses cleanly', async () => {
  clearProxyCache();
  const fakeFetch: typeof fetch = async () =>
    new Response(JSON.stringify({ message: 'Too Many Requests' }), {
      status: 429,
      headers: {
        'x-ratelimit-retry-after': '2026-11-21T13:00:00Z',
      },
    });

  const res = await executeCoreWorksSearch({ q: 'rate-limit-test', limit: '10' }, { fetchImpl: fakeFetch });
  assert.equal(res.status, 429);
  const body = res.body as { error: { code: string; retryAfter?: string } };
  assert.equal(body.error.code, 'CORE_RATE_LIMIT');
  assert.equal(body.error.retryAfter, '2026-11-21T13:00:00Z');
});

test('Vercel and Netlify serverless handlers validate requests and enforce GET method', async () => {
  const { GET: vercelHealth } = await import('../api/health.js');
  const { GET: vercelSearch } = await import('../api/core/search.js');
  const { default: netlifyHealth } = await import('../netlify/functions/health.js');
  const { default: netlifySearch } = await import('../netlify/functions/core-search.js');

  const vh = await vercelHealth();
  assert.equal(vh.status, 200);

  const vsBad = await vercelSearch(new Request('https://example.com/api/core/search?q='));
  assert.equal(vsBad.status, 400);

  const nh = await netlifyHealth(new Request('https://example.com/api/health'));
  assert.equal(nh.status, 200);

  const nsMethod = await netlifySearch(
    new Request('https://example.com/api/core/search', { method: 'POST' })
  );
  assert.equal(nsMethod.status, 405);

  const nsBad = await netlifySearch(new Request('https://example.com/api/core/search?q='));
  assert.equal(nsBad.status, 400);
});
