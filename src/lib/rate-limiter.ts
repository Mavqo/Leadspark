import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface RateLimitEntry {
  count: number;
  resetTime: number;
  updatedAt: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

interface PersistedRateLimiterState {
  version: 1;
  entries: Record<string, RateLimitEntry>;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

const DEFAULT_CONFIGS: Record<string, RateLimitConfig> = {
  'chat:ip': { windowMs: 60 * 1000, maxRequests: 30 },
  'chat:session': { windowMs: 60 * 1000, maxRequests: 20 },
  'lead:ip': { windowMs: 60 * 1000, maxRequests: 10 },
  'webhook:ip': { windowMs: 60 * 1000, maxRequests: 60 },
  'admin:lead': { windowMs: 60 * 1000, maxRequests: 5 }
};

function parseIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    console.warn(`[RateLimiter] Invalid env ${name}=${raw}. Using fallback ${fallback}.`);
    return fallback;
  }

  return parsed;
}

function makeConfig(prefix: string, fallback: RateLimitConfig): RateLimitConfig {
  return {
    windowMs: parseIntEnv(`RATE_LIMIT_${prefix}_WINDOW_MS`, fallback.windowMs),
    maxRequests: parseIntEnv(`RATE_LIMIT_${prefix}_MAX_REQUESTS`, fallback.maxRequests)
  };
}

export class RateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private configs: Map<string, RateLimitConfig>;
  private readonly storageFile: string;
  private readonly maxEntries: number;

  private readonly DEFAULT_IP_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 30 };

  constructor() {
    this.configs = new Map([
      ['chat:ip', makeConfig('CHAT_IP', DEFAULT_CONFIGS['chat:ip'])],
      ['chat:session', makeConfig('CHAT_SESSION', DEFAULT_CONFIGS['chat:session'])],
      ['lead:ip', makeConfig('LEAD_IP', DEFAULT_CONFIGS['lead:ip'])],
      ['webhook:ip', makeConfig('WEBHOOK_IP', DEFAULT_CONFIGS['webhook:ip'])],
      ['admin:lead', makeConfig('ADMIN_LEAD', DEFAULT_CONFIGS['admin:lead'])]
    ]);

    const dataDir = process.env.LEADSPARK_DATA_DIR
      ? path.resolve(process.env.LEADSPARK_DATA_DIR)
      : path.resolve(process.cwd(), 'data');

    this.storageFile = process.env.RATE_LIMIT_STORAGE_FILE
      ? path.resolve(process.env.RATE_LIMIT_STORAGE_FILE)
      : path.join(dataDir, 'rate-limits.json');

    this.maxEntries = parseIntEnv('RATE_LIMIT_MAX_ENTRIES', 5000);

    this.loadPersistedEntries();

    const cleanupTimer = setInterval(() => this.cleanup(), 5 * 60 * 1000);
    cleanupTimer.unref?.();
  }

  check(identifier: string, type: string): RateLimitResult {
    const config = this.configs.get(type) || this.DEFAULT_IP_LIMIT;
    const key = `${type}:${identifier}`;
    const now = Date.now();

    const entry = this.storage.get(key);

    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs,
        updatedAt: now
      };
      this.storage.set(key, newEntry);
      this.enforceEntryBounds(now);
      this.persistSafely();

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - 1),
        resetTime: newEntry.resetTime
      };
    }

    if (entry.count < config.maxRequests) {
      entry.count += 1;
      entry.updatedAt = now;
      this.storage.set(key, entry);
      this.persistSafely();

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - entry.count),
        resetTime: entry.resetTime
      };
    }

    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter
    };
  }

  checkWithHeaders(identifier: string, type: string): {
    allowed: boolean;
    headers: Record<string, string>;
    retryAfter?: number;
  } {
    const result = this.check(identifier, type);
    const config = this.configs.get(type) || this.DEFAULT_IP_LIMIT;

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': config.maxRequests.toString(),
      'X-RateLimit-Remaining': Math.max(0, result.remaining).toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
    };

    if (!result.allowed && result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
    }

    return {
      allowed: result.allowed,
      headers,
      retryAfter: result.retryAfter
    };
  }

  static getClientIP(request: Request): string {
    const headers = request.headers;

    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    const realIP = headers.get('x-real-ip');
    if (realIP) return realIP;

    const cfConnectingIP = headers.get('cf-connecting-ip');
    if (cfConnectingIP) return cfConnectingIP;

    const userAgent = headers.get('user-agent') || 'unknown';
    const hourTimestamp = Math.floor(Date.now() / (60 * 60 * 1000));
    return `fallback_${Buffer.from(userAgent).toString('base64').slice(0, 20)}_${hourTimestamp}`;
  }

  setConfig(type: string, windowMs: number, maxRequests: number): void {
    this.configs.set(type, { windowMs, maxRequests });
  }

  reset(identifier: string, type: string): void {
    const key = `${type}:${identifier}`;
    if (this.storage.delete(key)) {
      this.persistSafely();
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.storage.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => this.storage.delete(key));

    if (keysToDelete.length > 0) {
      this.persistSafely();
      console.log(`[RateLimiter] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  getStats(): { totalEntries: number; types: Record<string, number> } {
    const types: Record<string, number> = {};

    this.storage.forEach((_, key) => {
      const type = key.split(':').slice(0, 2).join(':');
      types[type] = (types[type] || 0) + 1;
    });

    return {
      totalEntries: this.storage.size,
      types
    };
  }

  getPersistenceConfig(): { storageFile: string; maxEntries: number } {
    return {
      storageFile: this.storageFile,
      maxEntries: this.maxEntries
    };
  }

  private loadPersistedEntries(): void {
    try {
      const raw = readFileSync(this.storageFile, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<PersistedRateLimiterState>;
      if (!parsed || parsed.version !== 1 || !parsed.entries || typeof parsed.entries !== 'object') {
        return;
      }

      const now = Date.now();
      for (const [key, value] of Object.entries(parsed.entries)) {
        if (!value) continue;

        const count = Number(value.count);
        const resetTime = Number(value.resetTime);
        const updatedAt = Number(value.updatedAt ?? now);

        if (!Number.isFinite(count) || !Number.isFinite(resetTime) || count <= 0 || resetTime <= now) {
          continue;
        }

        this.storage.set(key, {
          count,
          resetTime,
          updatedAt: Number.isFinite(updatedAt) ? updatedAt : now
        });
      }

      this.enforceEntryBounds(now);
      if (this.storage.size > 0) {
        console.log(`[RateLimiter] Restored ${this.storage.size} persisted entries`);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return;
      }
      console.warn('[RateLimiter] Failed to load persisted state, continuing with in-memory mode:', error);
    }
  }

  private enforceEntryBounds(now: number): void {
    if (this.storage.size <= this.maxEntries) {
      return;
    }

    for (const [key, entry] of this.storage.entries()) {
      if (now > entry.resetTime) {
        this.storage.delete(key);
      }
    }

    if (this.storage.size <= this.maxEntries) {
      return;
    }

    const entriesByAge = Array.from(this.storage.entries())
      .sort(([, a], [, b]) => a.updatedAt - b.updatedAt);

    const toRemove = this.storage.size - this.maxEntries;
    for (let i = 0; i < toRemove; i++) {
      const key = entriesByAge[i]?.[0];
      if (key) {
        this.storage.delete(key);
      }
    }
  }

  private persistSafely(): void {
    try {
      const dir = path.dirname(this.storageFile);
      mkdirSync(dir, { recursive: true });

      const payload: PersistedRateLimiterState = {
        version: 1,
        entries: Object.fromEntries(this.storage.entries())
      };

      const tmp = `${this.storageFile}.${process.pid}.${Date.now()}.tmp`;
      writeFileSync(tmp, JSON.stringify(payload, null, 2), 'utf-8');
      renameSync(tmp, this.storageFile);
    } catch (error) {
      console.warn('[RateLimiter] Failed to persist state, using in-memory fallback:', error);
    }
  }
}

export const rateLimiter = new RateLimiter();

export function createRateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({
      error: 'Too many requests. Please slow down.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': retryAfter.toString()
      }
    }
  );
}
