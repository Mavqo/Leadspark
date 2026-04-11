import type { APIRoute } from 'astro';
import { getCorsHeaders, handleCorsPreflight } from '../../../lib/cors';
import { applySecurityHeaders } from '../../../lib/security';
import { getIntakeSubmission, listIntakeEvents } from '../../../lib/persistence';

function isAuthorized(request: Request): boolean {
  const adminToken = import.meta.env.ADMIN_TOKEN || process.env.ADMIN_TOKEN;
  const authHeader = request.headers.get('authorization');
  return Boolean(adminToken && authHeader === `Bearer ${adminToken}`);
}

export const GET: APIRoute = async ({ request, params }) => {
  const preflight = handleCorsPreflight(request);
  if (preflight) return applySecurityHeaders(preflight);

  if (!isAuthorized(request)) {
    return applySecurityHeaders(
      new Response(JSON.stringify({ error: 'Unauthorized', code: 'UNAUTHORIZED' }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request)
        }
      })
    );
  }

  const intakeId = params.id;
  if (!intakeId) {
    return applySecurityHeaders(
      new Response(JSON.stringify({ error: 'Missing intake id', code: 'BAD_REQUEST' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request)
        }
      })
    );
  }

  const submission = await getIntakeSubmission(intakeId);
  if (!submission) {
    return applySecurityHeaders(
      new Response(JSON.stringify({ error: 'Intake not found', code: 'NOT_FOUND' }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request)
        }
      })
    );
  }

  const events = await listIntakeEvents(intakeId);
  return applySecurityHeaders(
    new Response(
      JSON.stringify({
        success: true,
        intake: {
          id: submission.id,
          serviceType: submission.serviceType,
          urgency: submission.urgency,
          source: submission.source,
          workflowStatus: submission.workflowStatus,
          createdAt: submission.createdAt.toISOString(),
          updatedAt: submission.updatedAt.toISOString()
        },
        events: events.map((event) => ({
          id: event.id,
          type: event.type,
          timestamp: event.timestamp.toISOString(),
          details: event.details || {}
        }))
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request)
        }
      }
    )
  );
};
