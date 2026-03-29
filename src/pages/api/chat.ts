import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createChatCompletion, generateSessionId } from '../../lib/openai';
import { rateLimiter, createRateLimitResponse } from '../../lib/rate-limiter';
import type { ChatContext, ChatRequest, ChatResponse } from '../../types/paziente';

// Schema validazione request
const chatRequestSchema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().min(1).max(100),
  context: z.object({
    collectedData: z.record(z.any()).optional(),
    step: z.enum(['greeting', 'symptom', 'duration', 'urgency', 'availability', 'contact', 'complete']).optional(),
    history: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string()
    })).optional()
  }).optional()
});

// In-memory storage per sessioni (in produzione usare Redis)
const sessions = new Map<string, ChatContext>();

export const POST: APIRoute = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    // 1. Rate limiting per IP
    const clientIP = rateLimiter.constructor.getClientIP(request);
    const ipLimit = rateLimiter.checkWithHeaders(clientIP, 'chat:ip');
    
    if (!ipLimit.allowed) {
      console.warn(`[Chat API] Rate limit exceeded for IP: ${clientIP}`);
      return createRateLimitResponse(ipLimit.retryAfter || 60);
    }
    
    // 2. Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_JSON' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Validazione Zod
    const parseResult = chatRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return new Response(
        JSON.stringify({ 
          error: 'Validation failed', 
          code: 'VALIDATION_ERROR',
          details: { errors }
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { message, sessionId, context: clientContext } = parseResult.data;
    
    // 4. Rate limiting per sessione
    const sessionLimit = rateLimiter.checkWithHeaders(sessionId, 'chat:session');
    if (!sessionLimit.allowed) {
      console.warn(`[Chat API] Rate limit exceeded for session: ${sessionId}`);
      return createRateLimitResponse(sessionLimit.retryAfter || 60);
    }
    
    // 5. Recupera o crea contesto sessione
    let context: ChatContext;
    if (sessions.has(sessionId)) {
      context = sessions.get(sessionId)!;
      // Merge con dati client se forniti
      if (clientContext) {
        context.collectedData = { ...context.collectedData, ...(clientContext.collectedData || {}) };
        if (clientContext.step) context.step = clientContext.step;
        if (clientContext.history) context.history = clientContext.history;
      }
    } else {
      context = {
        sessionId,
        collectedData: clientContext?.collectedData || {},
        step: clientContext?.step || 'greeting',
        history: clientContext?.history || []
      };
    }
    
    // 6. Chiama OpenAI
    const chatResponse = await createChatCompletion({ message, context });
    
    // 7. Aggiorna contesto
    context.history.push({ role: 'user', content: message });
    context.history.push({ role: 'assistant', content: chatResponse.reply });
    context.step = chatResponse.step || context.step;
    if (chatResponse.leadData) {
      context.collectedData = { ...context.collectedData, ...chatResponse.leadData };
    }
    
    // Salva sessione
    sessions.set(sessionId, context);
    
    // 8. Prepara risposta
    const responseData: ChatResponse = {
      reply: chatResponse.reply,
      leadData: chatResponse.leadData,
      complete: chatResponse.complete,
      step: chatResponse.step
    };
    
    // 9. Headers di risposta
    const headers = new Headers({
      'Content-Type': 'application/json',
      ...ipLimit.headers,
      ...sessionLimit.headers,
      'X-Response-Time': `${Date.now() - startTime}ms`
    });
    
    // Log per debug
    console.log(`[Chat API] Session ${sessionId}, Step: ${responseData.step}, Complete: ${responseData.complete}, Time: ${Date.now() - startTime}ms`);
    
    return new Response(JSON.stringify(responseData), { status: 200, headers });
    
  } catch (error) {
    console.error('[Chat API] Error:', error);
    
    // Determina se è un errore OpenAI
    const isOpenAIError = error instanceof Error && 
      (error.message.includes('OpenAI') || error.message.includes('API key'));
    
    const statusCode = isOpenAIError ? 503 : 500;
    const errorCode = isOpenAIError ? 'OPENAI_ERROR' : 'INTERNAL_ERROR';
    const errorMessage = isOpenAIError 
      ? 'Service temporarily unavailable. Please try again.'
      : 'An unexpected error occurred.';
    
    return new Response(
      JSON.stringify({ 
        error: errorMessage, 
        code: errorCode,
        fallbackReply: 'Mi scuso, sto avendo qualche difficoltà tecnica. Puoi ripetere per favore?'
      }),
      { 
        status: statusCode, 
        headers: { 
          'Content-Type': 'application/json',
          'X-Response-Time': `${Date.now() - startTime}ms`
        } 
      }
    );
  }
};

// Endpoint GET per health check
export const GET: APIRoute = () => {
  return new Response(
    JSON.stringify({ 
      status: 'ok', 
      service: 'chat-api',
      timestamp: new Date().toISOString(),
      sessions: sessions.size
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// Cleanup sessioni vecchie ogni ora
setInterval(() => {
  const oneHourAgo = Date.now() - (60 * 60 * 1000);
  let cleaned = 0;
  
  sessions.forEach((context, sessionId) => {
    // Rimuovi se ultimo messaggio > 1 ora
    const lastMessage = context.history[context.history.length - 1];
    if (lastMessage) {
      // Nota: in produzione aggiungere timestamp ai messaggi
      // Per ora rimuoviamo sessioni con history troppo lunga
      if (context.history.length > 50) {
        sessions.delete(sessionId);
        cleaned++;
      }
    }
  });
  
  if (cleaned > 0) {
    console.log(`[Chat API] Cleaned up ${cleaned} old sessions`);
  }
}, 60 * 60 * 1000);
