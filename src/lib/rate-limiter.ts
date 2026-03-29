interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

class RateLimiter {
  private storage = new Map<string, RateLimitEntry>();
  private configs: Map<string, RateLimitConfig>;
  
  // Default configs
  private readonly DEFAULT_IP_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 30 };
  private readonly DEFAULT_SESSION_LIMIT: RateLimitConfig = { windowMs: 60 * 1000, maxRequests: 10 };

  constructor() {
    this.configs = new Map([
      ['chat:ip', { windowMs: 60 * 1000, maxRequests: 30 }],      // 30 req/min per IP
      ['chat:session', { windowMs: 60 * 1000, maxRequests: 20 }], // 20 req/min per sessione
      ['lead:ip', { windowMs: 60 * 1000, maxRequests: 10 }],      // 10 req/min per IP
      ['webhook:ip', { windowMs: 60 * 1000, maxRequests: 60 }],   // 60 req/min per IP
    ]);
    
    // Cleanup periodico ogni 5 minuti
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Verifica se la richiesta è entro i limiti
   * @param identifier - IP o Session ID
   * @param type - Tipo di endpoint (chat:ip, chat:session, lead:ip, webhook:ip)
   * @returns Oggetto con esito e info sul rate limit
   */
  check(identifier: string, type: string): { 
    allowed: boolean; 
    remaining: number; 
    resetTime: number;
    retryAfter?: number;
  } {
    const config = this.configs.get(type) || this.DEFAULT_IP_LIMIT;
    const key = `${type}:${identifier}`;
    const now = Date.now();
    
    const entry = this.storage.get(key);
    
    // Se non c'è entry o è scaduta, crea nuova
    if (!entry || now > entry.resetTime) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + config.windowMs
      };
      this.storage.set(key, newEntry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newEntry.resetTime
      };
    }
    
    // Se sotto il limite, incrementa
    if (entry.count < config.maxRequests) {
      entry.count++;
      this.storage.set(key, entry);
      
      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetTime: entry.resetTime
      };
    }
    
    // Limite superato
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter
    };
  }

  /**
   * Verifica e restituisce headers per la risposta HTTP
   */
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

  /**
   * Ottieni IP dalla richiesta Astro
   */
  static getClientIP(request: Request): string {
    // Prova a ottenere IP da header comuni
    const headers = request.headers;
    
    const forwarded = headers.get('x-forwarded-for');
    if (forwarded) {
      // Prendi il primo IP se ci sono multiple
      return forwarded.split(',')[0].trim();
    }
    
    const realIP = headers.get('x-real-ip');
    if (realIP) return realIP;
    
    const cfConnectingIP = headers.get('cf-connecting-ip');
    if (cfConnectingIP) return cfConnectingIP;
    
    // Fallback: usa un identificatore basato sullo user-agent + timestamp approssimato
    // (non perfetto ma meglio di niente per demo)
    const userAgent = headers.get('user-agent') || 'unknown';
    const hourTimestamp = Math.floor(Date.now() / (60 * 60 * 1000));
    return `fallback_${Buffer.from(userAgent).toString('base64').slice(0, 20)}_${hourTimestamp}`;
  }

  /**
   * Configura limiti personalizzati
   */
  setConfig(type: string, windowMs: number, maxRequests: number): void {
    this.configs.set(type, { windowMs, maxRequests });
  }

  /**
   * Resetta il contatore per un identificatore
   */
  reset(identifier: string, type: string): void {
    const key = `${type}:${identifier}`;
    this.storage.delete(key);
  }

  /**
   * Pulisci entry scadute
   */
  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.storage.forEach((entry, key) => {
      if (now > entry.resetTime) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => this.storage.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`[RateLimiter] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }

  /**
   * Ottieni statistiche (per debug)
   */
  getStats(): { totalEntries: number; types: Record<string, number> } {
    const types: Record<string, number> = {};
    
    this.storage.forEach((_, key) => {
      const type = key.split(':')[0];
      types[type] = (types[type] || 0) + 1;
    });
    
    return {
      totalEntries: this.storage.size,
      types
    };
  }
}

// Esporta singleton
export const rateLimiter = new RateLimiter();

// Helper per risposte errore
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
