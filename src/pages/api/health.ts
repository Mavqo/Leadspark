import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'leadspark'
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json'
    }
  });
};
