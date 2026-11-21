export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'core-research-explorer-proxy',
      platform: 'vercel',
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
