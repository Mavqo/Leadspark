export interface Service {
  id: string;
  icon: string;
  title: string;
  description: string;
  features: string[];
  color: 'blue' | 'emerald' | 'teal' | 'cyan' | 'violet';
  image: string;
}

export const services: Service[] = [
  {
    id: 'fisioterapia-sportiva',
    icon: 'activity',
    title: 'Fisioterapia Sportiva',
    description: 'Trattamenti specializzati per atleti e sportivi di ogni livello. Recupero ottimale da infortuni muscolari, articolari e tendinei.',
    features: ['Riabilitazione post-infortunio', 'Prevenzione infortuni', 'Miglioramento prestazioni'],
    color: 'blue',
    image: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&q=80'
  },
  {
    id: 'riabilitazione-post-operatoria',
    icon: 'heartpulse',
    title: 'Riabilitazione Post-operatoria',
    description: 'Percorsi di recupero personalizzati dopo interventi chirurgici. Ritorna alle tue attività quotidiane in modo sicuro e graduale.',
    features: ['Recupero funzionale', 'Terapia del dolore', 'Supporto psicologico'],
    color: 'emerald',
    image: 'https://images.unsplash.com/photo-1551076805-e1869033e561?w=400&q=80'
  },
  {
    id: 'terapia-manuale',
    icon: 'hand',
    title: 'Terapia Manuale',
    description: 'Tecniche manuali avanzate per il trattamento di dolori muscoloscheletrici, tensioni croniche e problematiche posturali.',
    features: ['Osteopatia', 'Massoterapia', 'Mobilizzazione articolare'],
    color: 'teal',
    image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&q=80'
  }
];

export const colorClasses: Record<string, { 
  bg: string; 
  text: string; 
  border: string; 
  gradient: string;
  lightBg: string;
}> = {
  blue: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    lightBg: 'bg-blue-50 dark:bg-blue-900/20',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    gradient: 'from-blue-500 to-blue-600'
  },
  emerald: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    lightBg: 'bg-emerald-50 dark:bg-emerald-900/20',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    gradient: 'from-emerald-500 to-emerald-600'
  },
  teal: {
    bg: 'bg-teal-100 dark:bg-teal-900/30',
    lightBg: 'bg-teal-50 dark:bg-teal-900/20',
    text: 'text-teal-600 dark:text-teal-400',
    border: 'border-teal-200 dark:border-teal-800',
    gradient: 'from-teal-500 to-teal-600'
  },
  cyan: {
    bg: 'bg-cyan-100 dark:bg-cyan-900/30',
    lightBg: 'bg-cyan-50 dark:bg-cyan-900/20',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-200 dark:border-cyan-800',
    gradient: 'from-cyan-500 to-cyan-600'
  },
  violet: {
    bg: 'bg-violet-100 dark:bg-violet-900/30',
    lightBg: 'bg-violet-50 dark:bg-violet-900/20',
    text: 'text-violet-600 dark:text-violet-400',
    border: 'border-violet-200 dark:border-violet-800',
    gradient: 'from-violet-500 to-violet-600'
  }
};

export function getServiceById(id: string): Service | undefined {
  return services.find(service => service.id === id);
}

export function getServicesByColor(color: Service['color']): Service[] {
  return services.filter(service => service.color === color);
}
