export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'GET') {
    return new Response(
      JSON.stringify({
        error: {
          code: 'METHOD_NOT_ALLOWED',
          status: 405,
          message: 'Only GET requests are supported on /api/health.',
        },
      }),
      {
        status: 405,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          allow: 'GET',
        },
      }
    );
  }

  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'core-research-explorer-proxy',
      platform: 'netlify',
      authenticated: Boolean(process.env['CORE_API_KEY']?.trim()),
    }),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    }
  );
}
