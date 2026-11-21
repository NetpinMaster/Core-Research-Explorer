import { executeCoreWorksSearch } from '../../server/core-proxy.js';

export async function GET(request: Request): Promise<Response> {
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
