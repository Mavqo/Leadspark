import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ChatContext, Paziente } from '../types/paziente';
import type { IntakeEvent, IntakeSubmission, IntakeWorkflowStatus } from '../types/intake';

interface PersistedChatSession extends ChatContext {
  updatedAt: string;
}

interface PersistenceShape {
  leads: Record<string, Paziente>;
  sessions: Record<string, PersistedChatSession>;
  intakeSubmissions: Record<string, IntakeSubmission>;
  intakeEvents: Record<string, IntakeEvent[]>;
}

interface DataFileShape {
  version: 1;
  data: PersistenceShape;
}

const PRIMARY_DATA_DIR = process.env.LEADSPARK_DATA_DIR
  ? path.resolve(process.env.LEADSPARK_DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const FALLBACK_DATA_DIR = path.join(os.tmpdir(), 'leadspark-data');
const DATA_FILE_NAME = 'storage.json';

const EMPTY_STATE: DataFileShape = {
  version: 1,
  data: {
    leads: {},
    sessions: {},
    intakeSubmissions: {},
    intakeEvents: {}
  }
};

let writeQueue: Promise<void> = Promise.resolve();
let activeDataDir: string | null = null;
let fallbackLogged = false;

function getCandidateDataDirs(): string[] {
  if (PRIMARY_DATA_DIR === FALLBACK_DATA_DIR) {
    return [PRIMARY_DATA_DIR];
  }
  return [PRIMARY_DATA_DIR, FALLBACK_DATA_DIR];
}

async function validateWritableDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true });
  const probe = path.join(
    dir,
    `.write-check-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.tmp`
  );
  await fs.writeFile(probe, 'ok', 'utf-8');
  await fs.unlink(probe);
}

async function resolveDataDir(): Promise<string> {
  if (activeDataDir) {
    return activeDataDir;
  }

  let lastError: unknown = null;
  for (const dir of getCandidateDataDirs()) {
    try {
      await validateWritableDir(dir);
      activeDataDir = dir;
      if (dir !== PRIMARY_DATA_DIR && !fallbackLogged) {
        fallbackLogged = true;
        console.warn(
          `[Persistence] Falling back to writable directory "${dir}" (primary: "${PRIMARY_DATA_DIR}")`
        );
      }
      return dir;
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(
    `No writable persistence directory available. primary="${PRIMARY_DATA_DIR}" fallback="${FALLBACK_DATA_DIR}" error="${String(lastError)}"`
  );
}

async function getDataFile(): Promise<string> {
  const dataDir = await resolveDataDir();
  return path.join(dataDir, DATA_FILE_NAME);
}

async function ensureDataDir(): Promise<void> {
  await resolveDataDir();
}

async function readState(): Promise<DataFileShape> {
  const dataFile = await getDataFile();
  try {
    const raw = await fs.readFile(dataFile, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DataFileShape>;
    if (!parsed || parsed.version !== 1 || !parsed.data) {
      return structuredClone(EMPTY_STATE);
    }
    return {
      version: 1,
      data: {
        leads: parsed.data.leads || {},
        sessions: parsed.data.sessions || {},
        intakeSubmissions: parsed.data.intakeSubmissions || {},
        intakeEvents: parsed.data.intakeEvents || {}
      }
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return structuredClone(EMPTY_STATE);
    }
    throw error;
  }
}

async function writeState(state: DataFileShape): Promise<void> {
  const dataFile = await getDataFile();
  const tempFile = `${dataFile}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}.tmp`;
  const payload = JSON.stringify(state, null, 2);
  await fs.writeFile(tempFile, payload, 'utf-8');
  await ensureDataDir();
  await fs.rename(tempFile, dataFile);
}

async function mutateState(
  mutator: (state: DataFileShape) => void | Promise<void>
): Promise<void> {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(async () => {
    const state = await readState();
    await mutator(state);
    await writeState(state);
  });
  return writeQueue;
}

function toRuntimeLead(lead: Paziente): Paziente {
  return {
    ...lead,
    createdAt: new Date(lead.createdAt)
  };
}

function toRuntimeSession(session: PersistedChatSession): PersistedChatSession {
  return {
    ...session,
    updatedAt: new Date(session.updatedAt).toISOString()
  };
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\(\)\.]/g, '');
}

function toRuntimeIntakeSubmission(submission: IntakeSubmission): IntakeSubmission {
  return {
    ...submission,
    createdAt: new Date(submission.createdAt),
    updatedAt: new Date(submission.updatedAt)
  };
}

function toRuntimeIntakeEvent(event: IntakeEvent): IntakeEvent {
  return {
    ...event,
    timestamp: new Date(event.timestamp)
  };
}

export async function saveLead(lead: Paziente): Promise<void> {
  await mutateState((state) => {
    state.data.leads[lead.id] = {
      ...lead,
      createdAt: new Date(lead.createdAt)
    };
  });
}

export async function listLeads(): Promise<Paziente[]> {
  const state = await readState();
  return Object.values(state.data.leads)
    .map(toRuntimeLead)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function findLeadByPhoneInLast24Hours(phone: string): Promise<Paziente | null> {
  const normalized = normalizePhone(phone);
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const leads = await listLeads();

  for (const lead of leads) {
    const stored = normalizePhone(lead.phone);
    if (stored === normalized && lead.createdAt.getTime() > oneDayAgo) {
      return lead;
    }
  }

  return null;
}

export async function cleanupLeadsOlderThan(maxAgeMs: number): Promise<number> {
  let cleaned = 0;
  const threshold = Date.now() - maxAgeMs;
  await mutateState((state) => {
    for (const [id, lead] of Object.entries(state.data.leads)) {
      if (new Date(lead.createdAt).getTime() < threshold) {
        delete state.data.leads[id];
        cleaned++;
      }
    }
  });
  return cleaned;
}

export async function saveIntakeSubmission(submission: IntakeSubmission): Promise<void> {
  await mutateState((state) => {
    state.data.intakeSubmissions[submission.id] = {
      ...submission,
      createdAt: new Date(submission.createdAt),
      updatedAt: new Date(submission.updatedAt)
    };
  });
}

export async function getIntakeSubmission(intakeId: string): Promise<IntakeSubmission | null> {
  const state = await readState();
  const submission = state.data.intakeSubmissions[intakeId];
  if (!submission) {
    return null;
  }
  return toRuntimeIntakeSubmission(submission);
}

export async function updateIntakeWorkflowStatus(
  intakeId: string,
  status: IntakeWorkflowStatus
): Promise<void> {
  await mutateState((state) => {
    const existing = state.data.intakeSubmissions[intakeId];
    if (!existing) {
      return;
    }
    state.data.intakeSubmissions[intakeId] = {
      ...existing,
      workflowStatus: status,
      updatedAt: new Date()
    };
  });
}

export async function appendIntakeEvent(event: IntakeEvent): Promise<void> {
  await mutateState((state) => {
    const bucket = state.data.intakeEvents[event.intakeId] || [];
    bucket.push({
      ...event,
      timestamp: new Date(event.timestamp)
    });
    state.data.intakeEvents[event.intakeId] = bucket;
  });
}

export async function listIntakeEvents(intakeId: string): Promise<IntakeEvent[]> {
  const state = await readState();
  const events = state.data.intakeEvents[intakeId] || [];
  return events
    .map(toRuntimeIntakeEvent)
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
}

export async function saveChatSession(context: ChatContext): Promise<void> {
  await mutateState((state) => {
    state.data.sessions[context.sessionId] = {
      ...context,
      updatedAt: new Date().toISOString()
    };
  });
}

export async function getChatSession(sessionId: string): Promise<ChatContext | null> {
  const state = await readState();
  const session = state.data.sessions[sessionId];
  if (!session) {
    return null;
  }
  const runtimeSession = toRuntimeSession(session);
  return {
    sessionId: runtimeSession.sessionId,
    collectedData: runtimeSession.collectedData,
    step: runtimeSession.step,
    history: runtimeSession.history
  };
}

export async function countChatSessions(): Promise<number> {
  const state = await readState();
  return Object.keys(state.data.sessions).length;
}

export async function cleanupChatSessions(options: {
  maxAgeMs: number;
  maxHistoryEntries: number;
}): Promise<number> {
  let cleaned = 0;
  const threshold = Date.now() - options.maxAgeMs;

  await mutateState((state) => {
    for (const [sessionId, session] of Object.entries(state.data.sessions)) {
      const updatedAt = new Date(session.updatedAt).getTime();
      const stale = updatedAt < threshold;
      const tooLong = session.history.length > options.maxHistoryEntries;
      if (stale || tooLong) {
        delete state.data.sessions[sessionId];
        cleaned++;
      }
    }
  });

  return cleaned;
}

export function getPersistenceConfig(): { dataDir: string; dataFile: string } {
  const dataDir = activeDataDir || PRIMARY_DATA_DIR;
  return {
    dataDir,
    dataFile: path.join(dataDir, DATA_FILE_NAME)
  };
}
