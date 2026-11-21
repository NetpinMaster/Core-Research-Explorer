import { executeCoreWorksSearch } from '../../server/core-proxy.js';

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          status: 405,
          message: 'Only GET requests are supported on /api/core/search.',
        },
      }),
      {
        status: 405,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          allow: 'GET',
          'cache-control': 'no-store',
        },
      }
    );
  }

  const url = new URL(request.url);
  const result = await executeCoreWorksSearch(
    {
      q: url.searchParams.get('q') ?? undefined,
      limit: url.searchParams.get('limit') ?? undefined,
      offset: url.searchParams.get('offset') ?? undefined,
      sort: url.searchParams.get('sort') ?? undefined,
    },
    {
      apiKey: process.env['CORE_API_KEY'],
    }
  );

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...result.headers,
    },
  });
}
