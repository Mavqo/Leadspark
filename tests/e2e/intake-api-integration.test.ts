import { describe, it, expect } from 'vitest';
import { POST as intakeCreateHandler } from '../../src/pages/api/intake';
import { GET as intakeStatusHandler } from '../../src/pages/api/intake/[id]';

function createJsonRequest(url: string, body: unknown): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

const validPayload = {
  name: 'Marco Rossi',
  email: 'marco.rossi@example.com',
  phone: '+393331234567',
  company: 'Studio Rossi',
  website: 'https://studiorossi.it',
  message: 'Need help improving intake and follow-up automation for our clinic.',
  serviceType: 'automation',
  urgency: 'medium',
  consent: true,
  source: 'portfolio_form'
} as const;

describe('API Integration Tests - Intake Endpoint', () => {
  it('creates a valid intake submission', async () => {
    const request = createJsonRequest('http://localhost/api/intake', validPayload);
    const response = await intakeCreateHandler({ request } as never);
    const data = await response.json() as { success: boolean; intakeId: string; status: string };

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.intakeId).toMatch(/^intake_/);
    expect(['received', 'queued_for_automation']).toContain(data.status);
  });

  it('rejects intake without required consent', async () => {
    const request = createJsonRequest('http://localhost/api/intake', {
      ...validPayload,
      consent: false
    });
    const response = await intakeCreateHandler({ request } as never);
    const data = await response.json() as { code: string };

    expect(response.status).toBe(400);
    expect(data.code).toBe('VALIDATION_ERROR');
  });

  it('returns intake workflow status for authorized admin', async () => {
    const createRequest = createJsonRequest('http://localhost/api/intake', validPayload);
    const createResponse = await intakeCreateHandler({ request: createRequest } as never);
    const createData = await createResponse.json() as { intakeId: string };

    const statusRequest = new Request(`http://localhost/api/intake/${createData.intakeId}`, {
      method: 'GET',
      headers: { authorization: 'Bearer test-admin-token' }
    });
    const statusResponse = await intakeStatusHandler({
      request: statusRequest,
      params: { id: createData.intakeId }
    } as never);
    const statusData = await statusResponse.json() as {
      success: boolean;
      intake: { id: string; workflowStatus: string };
      events: Array<{ type: string }>;
    };

    expect(statusResponse.status).toBe(200);
    expect(statusData.success).toBe(true);
    expect(statusData.intake.id).toBe(createData.intakeId);
    expect(statusData.events.length).toBeGreaterThan(0);
  });

  it('rejects status read when unauthorized', async () => {
    const statusRequest = new Request('http://localhost/api/intake/intake_test', {
      method: 'GET'
    });
    const response = await intakeStatusHandler({
      request: statusRequest,
      params: { id: 'intake_test' }
    } as never);
    expect(response.status).toBe(401);
  });
});
