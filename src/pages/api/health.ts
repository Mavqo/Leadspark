import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const gitSha = import.meta.env.APP_GIT_SHA || process.env.APP_GIT_SHA || 'unknown';
  const buildTime = import.meta.env.APP_BUILD_TIME || process.env.APP_BUILD_TIME || 'unknown';

  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'leadspark',
    release: {
      gitSha,
      buildTime
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
