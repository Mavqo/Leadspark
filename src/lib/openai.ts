import OpenAI from 'openai';
import type { ChatContext, ChatMessage, ChatResponse, PartialPaziente } from '../types/paziente';
import { buildConversationPrompt, buildExtractionPrompt } from './prompts';

const openai = new OpenAI({
  apiKey: import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
});

const MODEL = 'gpt-4o-mini';
const TEMPERATURE = 0.7;
const MAX_TOKENS = 500;

export interface CreateChatCompletionOptions {
  message: string;
  context: ChatContext;
}

export async function createChatCompletion({
  message,
  context
}: CreateChatCompletionOptions): Promise<ChatResponse> {
  try {
    // Aggiungi il messaggio utente alla history
    const updatedHistory: ChatMessage[] = [
      ...context.history,
      { role: 'user', content: message }
    ];

    // Costruisci il prompt completo
    const systemPrompt = buildConversationPrompt({
      ...context,
      history: updatedHistory
    });

    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ]
    });

    const reply = response.choices[0]?.message?.content?.trim() || '';

    // Determina il prossimo step e se è completo
    const { step, complete, leadData } = await determineStepAndExtractData(
      message,
      reply,
      context
    );

    return {
      reply,
      leadData,
      complete,
      step
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    // Fallback response
    return {
      reply: getFallbackResponse(context.step),
      leadData: undefined,
      complete: false,
      step: context.step
    };
  }
}

async function determineStepAndExtractData(
  userMessage: string,
  assistantReply: string,
  context: ChatContext
): Promise<{ step: ChatContext['step']; complete: boolean; leadData?: Partial<PartialPaziente> }> {
  const steps: ChatContext['step'][] = ['greeting', 'symptom', 'duration', 'urgency', 'availability', 'contact', 'complete'];
  const currentIndex = steps.indexOf(context.step);
  
  // Estrai dati dalla conversazione
  const leadData = await extractLeadData(context.history, userMessage, assistantReply);
  
  // Merge con dati già raccolti
  const mergedData = { ...context.collectedData, ...leadData };
  
  // Determina il prossimo step basato sui dati mancanti
  let nextStep = context.step;
  let complete = false;
  
  if (currentIndex < steps.length - 1) {
    // Verifica se abbiamo abbastanza informazioni per procedere
    if (shouldAdvanceStep(context.step, mergedData, userMessage)) {
      nextStep = steps[currentIndex + 1];
    }
  }
  
  // Verifica se abbiamo tutti i dati necessari
  const requiredFields: (keyof PartialPaziente)[] = ['name', 'phone', 'sintomi', 'durata', 'urgenza', 'disponibilita'];
  const hasAllRequired = requiredFields.every(field => {
    const value = mergedData[field];
    return value !== undefined && value !== '' && value !== null;
  });
  
  if (hasAllRequired && nextStep !== 'complete') {
    nextStep = 'complete';
    complete = true;
  }
  
  return { step: nextStep, complete, leadData: mergedData };
}

function shouldAdvanceStep(
  currentStep: ChatContext['step'],
  data: Partial<PartialPaziente>,
  userMessage: string
): boolean {
  const msg = userMessage.toLowerCase();
  
  switch (currentStep) {
    case 'greeting':
      // Avanza se l'utente ha descritto qualcosa
      return msg.length > 10;
    case 'symptom':
      // Avanza se ha descritto sintomi
      return !!(data.sintomi && data.sintomi.length > 5) || msg.length > 15;
    case 'duration':
      // Avanza se ha indicato una durata
      return !!(data.durata && data.durata.length > 0) || 
             /\d+\s*(giorn|settiman|mes|ann|ora)/i.test(userMessage);
    case 'urgency':
      // Avanza se ha indicato urgenza
      return !!data.urgenza || 
             /urgent|subito|possibile|aspett|non urgent|tranquill/i.test(msg);
    case 'availability':
      // Avanza se ha indicato disponibilità
      return !!(data.disponibilita && data.disponibilita.length > 0) || 
             /mattin|pomerigg|sera|lun|mar|mer|gio|ven|sab|dom/i.test(msg);
    case 'contact':
      // Avanza se ha fornito nome e telefono
      return !!(data.name && data.phone && data.name.length > 2 && data.phone.length > 5);
    default:
      return false;
  }
}

export async function extractLeadData(
  history: ChatMessage[],
  currentUserMessage: string,
  currentAssistantReply: string
): Promise<Partial<PartialPaziente>> {
  try {
    // Costruisci il testo della conversazione
    const conversation = history
      .map(msg => `${msg.role === 'user' ? 'Paziente' : 'Emma'}: ${msg.content}`)
      .join('\n');
    
    const fullConversation = `${conversation}\nPaziente: ${currentUserMessage}\nEmma: ${currentAssistantReply}`;
    
    const extractionPrompt = buildExtractionPrompt(fullConversation);
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.3, // Più deterministico per estrazione
      max_tokens: 400,
      messages: [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: 'Estrai i dati in formato JSON:' }
      ],
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) return {};
    
    const extracted = JSON.parse(content);
    
    // Filtra solo campi validi
    const result: Partial<PartialPaziente> = {};
    if (extracted.name) result.name = extracted.name;
    if (extracted.phone) result.phone = extracted.phone;
    if (extracted.email) result.email = extracted.email;
    if (extracted.sintomi) result.sintomi = extracted.sintomi;
    if (extracted.durata) result.durata = extracted.durata;
    if (extracted.urgenza && ['bassa', 'media', 'alta'].includes(extracted.urgenza)) {
      result.urgenza = extracted.urgenza;
    }
    if (extracted.disponibilita) result.disponibilita = extracted.disponibilita;
    if (extracted.notes) result.notes = extracted.notes;
    
    return result;
  } catch (error) {
    console.error('Error extracting lead data:', error);
    return {};
  }
}

function getFallbackResponse(step: ChatContext['step']): string {
  const fallbacks: Record<ChatContext['step'], string> = {
    greeting: 'Ciao! Sono Emma, l\'assistente del Centro Fisioterapia Movimento. Come posso aiutarti oggi?',
    symptom: 'Mi dispiace sentire che non stai bene. Puoi dirmi di più sui sintomi che stai avvertendo?',
    duration: 'Capisco. Da quanto tempo hai questo problema?',
    urgency: 'Grazie per queste informazioni. Hai bisogno di essere contattato urgentemente o può attendere qualche giorno?',
    availability: 'Perfetto. Quando saresti disponibile per una visita? Preferisci mattina o pomeriggio?',
    contact: 'Per completare la richiesta, ho bisogno dei tuoi dati di contatto. Potresti darmi il tuo nome completo e numero di telefono?',
    complete: 'Grazie mille! Ho raccolto tutte le informazioni necessarie. Un nostro operatore ti ricontatterà al più presto per fissare l\'appuntamento.'
  };
  
  return fallbacks[step] || 'Mi scuso per il disagio tecnico. Come posso aiutarti ulteriormente?';
}

export function generateSessionId(): string {
  // SECURITY FIX: Use crypto.randomUUID() instead of Math.random()
  // for cryptographically secure session ID generation
  return `sess_${Date.now()}_${crypto.randomUUID()}`;
}
