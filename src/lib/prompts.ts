import type { ChatContext, ChatStep } from '../types/paziente';

/**
 * System prompt for the AI assistant "Emma"
 * Defines the personality, role, and conversation flow
 */
export const SYSTEM_PROMPT = `Sei Emma, l'assistente virtuale di LeadSpark by Mavqo.

IL TUO RUOLO:
- Accogli i potenziali clienti con professionalità ed empatia
- Raccogli informazioni per qualificare il lead e avviare l'onboarding
- Aiuta a capire il bisogno specifico di automazione o lead generation del cliente
- Indirizza verso il team Mavqo per approfondimenti tecnici o commerciali

TONO DI VOCE:
- Professionale, diretto e orientato al business
- Chiaro, senza tecnicismi inutili
- Curioso e attento alle esigenze del cliente
- Rassicurante sul processo di follow-up

FLOW CONVERSAZIONALE:
1. SALUTO: Benvenuto caloroso, presentati come Emma di LeadSpark
2. ESIGENZA: Chiedi cosa li ha portati a contattarci e quale problema vogliono risolvere
3. CONTESTO: Settore, dimensione aziendale, volume di lead attuale
4. URGENZA: Capire la priorità e la timeline del progetto
5. DISPONIBILITÀ: Quando sono disponibili per una call con il team
6. CONTATTI: Nome completo, telefono, email, sito web (opzionale)
7. CHIUSURA: Conferma raccolta dati, comunica che il team Mavqo ricontatterà presto

REGOLE IMPORTANTI:
- Una domanda alla volta, flow naturale
- Se il cliente fornisce più info insieme, ringrazia e prosegui
- Se mancano dati, chiedi gentilmente
- Se l'urgenza è "alta", sottolinea che verranno contattati entro 24h
- Non promettere prezzi o SLA specifici (il team gestirà)

ESEMPI DI RISPOSTA:
- "Capisco, sembra un problema che frena la crescita. Mi aiuta a capire meglio: quanti lead ricevete mediamente ogni settimana?"
- "Grazie per queste informazioni. Per aiutarti al meglio, preferiresti una call nei prossimi 2 giorni o hai più flessibilità?"
- "Perfetto! Ho raccolto tutte le informazioni. Il team Mavqo ti ricontatterà entro 24 ore per una prima call conoscitiva."`;

/**
 * Gets the instruction text for a specific conversation step
 * @param step - Current chat step
 * @returns Instruction string for the AI
 */
function getStepInstruction(step: ChatStep): string {
  const instructions: Record<ChatStep, string> = {
    greeting: 'Saluta il cliente, presentati come Emma di LeadSpark by Mavqo e chiedi gentilmente cosa li ha portati a contattarci.',
    symptom: 'Chiedi dettagli sui sintomi: cosa sentono, dove localizzano il problema, come influisce sulla loro vita quotidiana.',
    duration: 'Chiedi da quanto tempo hanno questo problema e se è cambiato nel tempo.',
    urgency: 'Valuta l\'urgenza: chiedi se hanno bisogno di un appuntamento urgente o se possono attendere qualche giorno.',
    availability: 'Chiedi la loro disponibilità oraria: preferiscono mattina, pomeriggio, o hanno flessibilità?',
    contact: 'Raccogli i dati di contatto: nome completo, numero di telefono e email (opzionale).',
    complete: 'Conferma che hai raccolto tutte le informazioni, ringrazia il paziente e comunica che verrà ricontattato presto.'
  };
  
  return instructions[step] || '';
}

/**
 * Builds the complete conversation prompt for the AI
 * Includes system prompt, conversation history, collected data, and current step instruction
 * 
 * @param context - Current chat context
 * @returns Complete prompt string for the AI
 */
export function buildConversationPrompt(context: ChatContext): string {
  const { step, collectedData, history } = context;
  
  let prompt = SYSTEM_PROMPT + '\n\n';
  
  // Add conversation history (last 6 messages for context window management)
  if (history.length > 0) {
    prompt += 'STORIA DELLA CONVERSAZIONE:\n';
    history.slice(-6).forEach(msg => {
      prompt += `${msg.role === 'user' ? 'Paziente' : 'Emma'}: ${msg.content}\n`;
    });
    prompt += '\n';
  }
  
  // Add already collected data
  const collectedFields = Object.entries(collectedData)
    .filter(([, value]) => value !== undefined && value !== '')
    .map(([key, value]) => `${key}: ${value}`);
  
  if (collectedFields.length > 0) {
    prompt += 'DATI GIÀ RACCOLTI:\n' + collectedFields.join('\n') + '\n\n';
  }
  
  // Add current step instruction
  prompt += `STEP ATTUALE: ${step}\n`;
  prompt += getStepInstruction(step);
  
  return prompt;
}

/**
 * Prompt for extracting structured lead data from conversation
 * Used to parse conversation and extract patient information
 */
export const EXTRACTION_PROMPT = `Estrai le seguenti informazioni dalla conversazione con il paziente.
Restituisci SOLO un oggetto JSON valido con questi campi (usa stringa vuota o null se non presente):

{
  "name": "nome completo del paziente",
  "phone": "numero di telefono",
  "email": "email (opzionale)",
  "sintomi": "descrizione dei sintomi",
  "durata": "da quanto tempo",
  "urgenza": "bassa|media|alta",
  "disponibilita": "quando disponibile per visita",
  "notes": "note aggiuntive rilevanti"
}

Regola per urgenza:
- "alta": se menziona dolore forte, acuto, recente (ultimi giorni), impossibilità a muoversi, trauma recente
- "media": disagio moderato, dolori persistenti ma gestibili
- "bassa": controllo di routine, miglioramento già in corso, solo informazioni`;

/**
 * Builds the extraction prompt with conversation context
 * 
 * @param conversation - Full conversation text
 * @returns Extraction prompt with conversation
 */
export function buildExtractionPrompt(conversation: string): string {
  return `${EXTRACTION_PROMPT}\n\nCONVERSAZIONE:\n${conversation}`;
}
