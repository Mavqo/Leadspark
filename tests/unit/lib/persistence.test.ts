import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ChatContext, Paziente } from '../../../src/types/paziente';
import type { IntakeEvent, IntakeSubmission } from '../../../src/types/intake';

async function loadPersistenceModule() {
  vi.resetModules();
  return import('../../../src/lib/persistence');
}

describe('Persistence layer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('persists leads across module reloads (restart-safe)', async () => {
    const firstBoot = await loadPersistenceModule();
    const testId = `paz_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const lead: Paziente = {
      id: testId,
      name: 'Mario Rossi',
      phone: '+393331112223',
      email: 'mario.rossi@example.com',
      sintomi: 'Mal di schiena',
      durata: '1 settimana',
      urgenza: 'media',
      disponibilita: 'Lunedì mattina',
      source: 'chatbot',
      createdAt: new Date('2026-04-06T10:00:00.000Z')
    };

    await firstBoot.saveLead(lead);

    const secondBoot = await loadPersistenceModule();
    const leads = await secondBoot.listLeads();
    const restored = leads.find((entry: Paziente) => entry.id === testId);
    expect(restored).toBeDefined();
    expect(restored?.createdAt).toBeInstanceOf(Date);
  });

  it('persists chat sessions across module reloads (restart-safe)', async () => {
    const firstBoot = await loadPersistenceModule();
    const sessionId = `sess_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const context: ChatContext = {
      sessionId,
      step: 'duration',
      collectedData: { sintomi: 'Dolore cervicale' },
      history: [
        { role: 'user', content: 'Ho dolore cervicale' },
        { role: 'assistant', content: 'Da quanto tempo?' }
      ]
    };

    await firstBoot.saveChatSession(context);

    const secondBoot = await loadPersistenceModule();
    const restored = await secondBoot.getChatSession(context.sessionId);
    expect(restored).not.toBeNull();
    expect(restored?.sessionId).toBe(sessionId);
    expect(restored?.history).toHaveLength(2);
    expect(await secondBoot.countChatSessions()).toBeGreaterThan(0);
  });

  it('falls back to a writable temp directory when configured path is not writable', async () => {
    const previousDataDir = process.env.LEADSPARK_DATA_DIR;
    process.env.LEADSPARK_DATA_DIR = '/proc/leadspark-unwritable-for-tests';

    try {
      const persistence = await loadPersistenceModule();
      const lead: Paziente = {
        id: `paz_fallback_${Date.now()}`,
        name: 'Fallback Test',
        phone: '+390212345678',
        sintomi: 'Test sintomi fallback',
        durata: '2 giorni',
        urgenza: 'bassa',
        disponibilita: 'Martedì pomeriggio',
        source: 'chatbot',
        createdAt: new Date()
      };

      await persistence.saveLead(lead);

      const stored = await persistence.listLeads();
      expect(stored.some((item: Paziente) => item.id === lead.id)).toBe(true);
      expect(persistence.getPersistenceConfig().dataDir).not.toBe('/proc/leadspark-unwritable-for-tests');
    } finally {
      if (previousDataDir === undefined) {
        delete process.env.LEADSPARK_DATA_DIR;
      } else {
        process.env.LEADSPARK_DATA_DIR = previousDataDir;
      }
    }
  });

  it('persists intake submissions and events across module reloads', async () => {
    const firstBoot = await loadPersistenceModule();
    const intakeId = `intake_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date('2026-04-07T12:00:00.000Z');
    const submission: IntakeSubmission = {
      id: intakeId,
      name: 'Marco Rossi',
      email: 'marco.rossi@example.com',
      phone: '+393331234567',
      company: 'Studio Rossi',
      website: 'https://studiorossi.it',
      message: 'Need intake automation support',
      serviceType: 'automation',
      urgency: 'medium',
      consent: true,
      source: 'portfolio_form',
      workflowStatus: 'received',
      createdAt: now,
      updatedAt: now
    };

    const event: IntakeEvent = {
      id: `evt_${Date.now()}`,
      intakeId,
      type: 'intake.received',
      timestamp: now,
      details: { source: 'test' }
    };

    await firstBoot.saveIntakeSubmission(submission);
    await firstBoot.appendIntakeEvent(event);
    await firstBoot.updateIntakeWorkflowStatus(intakeId, 'automation_dispatched');

    const secondBoot = await loadPersistenceModule();
    const restored = await secondBoot.getIntakeSubmission(intakeId);
    const events = await secondBoot.listIntakeEvents(intakeId);

    expect(restored).not.toBeNull();
    expect(restored?.workflowStatus).toBe('automation_dispatched');
    expect(restored?.createdAt).toBeInstanceOf(Date);
    expect(events).toHaveLength(1);
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });
});
