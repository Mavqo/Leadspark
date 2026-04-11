import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getCorsHeaders, handleCorsPreflight } from '../../lib/cors';
import { applySecurityHeaders, parseJsonBody, sanitizeHtml } from '../../lib/security';
import { RateLimiter, createRateLimitResponse, rateLimiter } from '../../lib/rate-limiter';
import {
  appendIntakeEvent,
  saveIntakeSubmission,
  updateIntakeWorkflowStatus
} from '../../lib/persistence';
import type { ApiError } from '../../types/paziente';
import type { IntakeRequest, IntakeResponse, IntakeSubmission } from '../../types/intake';

const WEBHOOK_URL = import.meta.env.N8N_INTAKE_WEBHOOK_URL
  || process.env.N8N_INTAKE_WEBHOOK_URL
  || import.meta.env.N8N_WEBHOOK_URL
  || process.env.N8N_WEBHOOK_URL
  || '';

const intakeRequestSchema = z.object({
  name: z.string().min(2).max(120).transform((value) => value.trim()),
  email: z.string().email().max(150).transform((value) => value.trim().toLowerCase()),
  phone: z.string().min(8).max(30).optional().transform((value) => value?.trim()),
  company: z.string().min(2).max(120).optional().transform((value) => value?.trim()),
  website: z.string().url().max(300).optional().transform((value) => value?.trim()),
  message: z.string().min(10).max(4000).transform((value) => value.trim()),
  serviceType: z.enum(['website', 'automation', 'intake_optimization', 'other']),
  urgency: z.enum(['low', 'medium', 'high']),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Privacy consent is required' })
  }),
  source: z.string().min(2).max(100).optional().transform((value) => value?.trim())
});

rateLimiter.setConfig('intake:ip', 60 * 1000, 20);

function mapBusinessTypeToServiceType(businessType: string): string {
  if (['clinica', 'beauty', 'home_services'].includes(businessType)) return 'automation';
  if (businessType === 'legal_finance') return 'intake_optimization';
  return 'other';
}

function normalizeIntakePayload(raw: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = { ...raw };

  // Map frontend form field names to backend schema field names
  if (normalized.name === undefined && normalized.contactName !== undefined) {
    normalized.name = normalized.contactName;
  }
  if (normalized.company === undefined && normalized.businessName !== undefined) {
    normalized.company = normalized.businessName;
  }
  if (normalized.message === undefined && normalized.goal !== undefined) {
    normalized.message = normalized.goal;
  }
  if (normalized.serviceType === undefined && normalized.businessType !== undefined) {
    normalized.serviceType = mapBusinessTypeToServiceType(String(normalized.businessType));
  }

  return normalized;
}

function getWebhookSecret(): string | undefined {
  return import.meta.env.WEBHOOK_SECRET || process.env.WEBHOOK_SECRET;
}

function createValidationError(error: z.ZodError): Response {
  const details = error.errors.map((entry) => ({
    field: entry.path.join('.'),
    message: entry.message
  }));
  const body: ApiError = {
    error: 'Validation failed',
    code: 'VALIDATION_ERROR',
    details: { errors: details }
  };
  return new Response(JSON.stringify(body), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}

function sanitizeIntake(payload: IntakeRequest): IntakeRequest {
  return {
    ...payload,
    name: sanitizeHtml(payload.name),
    company: payload.company ? sanitizeHtml(payload.company) : undefined,
    message: sanitizeHtml(payload.message),
    source: payload.source ? sanitizeHtml(payload.source) : undefined
  };
}

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  const preflight = handleCorsPreflight(request);
  if (preflight) return applySecurityHeaders(preflight);

  try {
    const clientIP = RateLimiter.getClientIP(request);
    const limit = rateLimiter.checkWithHeaders(clientIP, 'intake:ip');
    if (!limit.allowed) {
      return applySecurityHeaders(createRateLimitResponse(limit.retryAfter || 60));
    }

    const bodyResult = await parseJsonBody<unknown>(request, 1024 * 1024);
    if (!bodyResult.success) {
      return applySecurityHeaders(
        new Response(JSON.stringify({ error: bodyResult.error, code: bodyResult.code }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(request),
            ...limit.headers
          }
        })
      );
    }

    const normalized = normalizeIntakePayload(bodyResult.data as Record<string, unknown>);
    const parsed = intakeRequestSchema.safeParse(normalized);
    if (!parsed.success) {
      return applySecurityHeaders(createValidationError(parsed.error));
    }

    const intakeId = `intake_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date();
    const sanitized = sanitizeIntake(parsed.data);
    const submission: IntakeSubmission = {
      id: intakeId,
      name: sanitized.name,
      email: sanitized.email,
      phone: sanitized.phone,
      company: sanitized.company,
      website: sanitized.website,
      message: sanitized.message,
      serviceType: sanitized.serviceType,
      urgency: sanitized.urgency,
      consent: sanitized.consent,
      source: sanitized.source || 'portfolio_form',
      workflowStatus: 'received',
      createdAt: now,
      updatedAt: now
    };

    await saveIntakeSubmission(submission);
    await appendIntakeEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      intakeId,
      type: 'intake.received',
      timestamp: new Date(),
      details: {
        serviceType: submission.serviceType,
        urgency: submission.urgency,
        source: submission.source
      }
    });

    await updateIntakeWorkflowStatus(intakeId, 'queued_for_automation');

    const webhookSecret = getWebhookSecret();
    if (WEBHOOK_URL && webhookSecret) {
      void dispatchToAutomation(submission, webhookSecret).catch((error: unknown) => {
        console.error(`[Intake API] Automation dispatch failed for ${intakeId}`, error);
      });
    }

    const response: IntakeResponse = {
      success: true,
      intakeId,
      status: WEBHOOK_URL && webhookSecret ? 'queued_for_automation' : 'received',
      message: 'Intake submitted successfully.'
    };

    return applySecurityHeaders(
      new Response(JSON.stringify(response), {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          ...getCorsHeaders(request),
          ...limit.headers,
          'X-Response-Time': `${Date.now() - startTime}ms`
        }
      })
    );
  } catch (error) {
    console.error('[Intake API] Unexpected error:', error);
    return applySecurityHeaders(
      new Response(
        JSON.stringify({
          error: 'An unexpected error occurred while processing your request',
          code: 'INTERNAL_ERROR'
        } satisfies ApiError),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...getCorsHeaders(request),
            'X-Response-Time': `${Date.now() - startTime}ms`
          }
        }
      )
    );
  }
};

async function dispatchToAutomation(submission: IntakeSubmission, webhookSecret: string): Promise<void> {
  const intakeId = submission.id;
  await appendIntakeEvent({
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    intakeId,
    type: 'automation.dispatch.attempted',
    timestamp: new Date(),
    details: { endpointConfigured: true }
  });

  const payload = {
    event: 'intake.submitted',
    data: {
      intakeId: submission.id,
      contact: {
        name: submission.name,
        email: submission.email,
        phone: submission.phone,
        company: submission.company,
        website: submission.website
      },
      request: {
        message: submission.message,
        serviceType: submission.serviceType,
        urgency: submission.urgency,
        source: submission.source
      },
      workflowStatus: submission.workflowStatus,
      submittedAt: submission.createdAt.toISOString()
    }
  };

  const signature = await generateSignature(JSON.stringify(payload), webhookSecret);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Event': 'intake.submitted',
        'User-Agent': 'LeadSpark-Intake/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Webhook responded with status ${response.status}`);
    }

    await updateIntakeWorkflowStatus(intakeId, 'automation_dispatched');
    await appendIntakeEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      intakeId,
      type: 'automation.dispatch.succeeded',
      timestamp: new Date(),
      details: { responseStatus: response.status }
    });
  } catch (error) {
    clearTimeout(timeout);
    await updateIntakeWorkflowStatus(intakeId, 'automation_failed');
    await appendIntakeEvent({
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      intakeId,
      type: 'automation.dispatch.failed',
      timestamp: new Date(),
      details: {
        error: error instanceof Error ? error.message : 'Unknown automation error'
      }
    });
    throw error;
  }
}

async function generateSignature(payload: string, webhookSecret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(webhookSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}
