// Site metadata and configuration
export const siteConfig = {
  name: 'LeadSpark',
  shortName: 'LeadSpark',
  tagline: 'AI-powered lead intake for SMBs',
  description: 'LeadSpark by Mavqo — capture, qualify, and route inbound leads automatically with AI-powered intake automation.',
  url: 'https://leads.mavqo.dev',
  ogImage: '/og-image.jpg',
  locale: 'it_IT',
  
  // Contact Information
  contact: {
    phone: '+39 02 1234 5678',
    phoneHref: 'tel:+390212345678',
    email: 'info@movimento.it',
    emailHref: 'mailto:info@movimento.it',
    address: 'Via Roma 123, Milano',
    mapsUrl: 'https://maps.google.com',
    hours: {
      weekdays: 'Lun-Ven: 9:00-19:00',
      saturday: 'Sabato su appuntamento',
      sunday: 'Chiuso'
    }
  },
  
  // Business Information
  business: {
    founded: 2009,
    experience: '15+',
    patients: '5000+',
    certifications: '25+',
    rating: 4.9,
    reviews: 200
  },
  
  // Navigation
  navigation: {
    main: [
      { label: 'Home', href: '#hero' },
      { label: 'Servizi', href: '#services' },
      { label: 'Chi Siamo', href: '#about' },
      { label: 'Testimonianze', href: '#testimonials' },
      { label: 'Contatti', href: '#contact' }
    ],
    cta: {
      label: 'Prenota',
      href: '#contact'
    }
  },
  
  // Social Links
  social: {
    facebook: 'https://facebook.com',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com'
  },
  
  // SEO
  seo: {
    titleTemplate: '%s | LeadSpark by Mavqo',
    defaultTitle: 'LeadSpark — AI Lead Intake Automation for SMBs',
    keywords: ['lead generation', 'lead intake', 'ai automation', 'smb', 'mavqo', 'leadspark', 'crm automation']
  }
};

// Team members data
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  specialization: string;
  image: string;
  experience: string;
  education: string;
  certifications: string[];
}

export const team: TeamMember[] = [
  {
    id: 'marco-rossi',
    name: 'Dott. Marco Rossi',
    role: 'Fisioterapista Specialista',
    specialization: 'Riabilitazione Sportiva',
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80',
    experience: '15+ anni',
    education: 'Laurea in Fisioterapia, Master in Sport',
    certifications: ['AIFI', 'FMS Level 2', 'DNS']
  },
  {
    id: 'laura-bianchi',
    name: 'Dott.ssa Laura Bianchi',
    role: 'Fisioterapista Osteopata',
    specialization: 'Terapia Manuale & Osteopatia',
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80',
    experience: '12+ anni',
    education: 'Laurea in Fisioterapia, D.O. Osteopatia',
    certifications: ['ROI', 'IATM', 'Fascial Manipulation']
  },
  {
    id: 'giuseppe-verdi',
    name: 'Dott. Giuseppe Verdi',
    role: 'Fisioterapista Specialista',
    specialization: 'Riabilitazione Neurologica',
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80',
    experience: '10+ anni',
    education: 'Laurea in Fisioterapia, Specializzazione Neuro',
    certifications: ['AIFI', 'Bobath', 'PNF']
  }
];

// Stats data
export interface Stat {
  icon: string;
  value: string;
  label: string;
}

export const stats: Stat[] = [
  { icon: 'calendar', value: '15+', label: 'Anni di esperienza' },
  { icon: 'users', value: '5000+', label: 'Pazienti trattati' },
  { icon: 'award', value: '25+', label: 'Certificazioni' },
  { icon: 'graduation', value: '100%', label: 'Team specializzato' }
];

// Contact info cards
export interface ContactInfo {
  icon: string;
  label: string;
  value: string;
  href?: string;
  description: string;
}

export const contactInfo: ContactInfo[] = [
  {
    icon: 'phone',
    label: 'Telefono',
    value: siteConfig.contact.phone,
    href: siteConfig.contact.phoneHref,
    description: 'Chiamaci per urgenze'
  },
  {
    icon: 'mail',
    label: 'Email',
    value: siteConfig.contact.email,
    href: siteConfig.contact.emailHref,
    description: 'Rispondiamo entro 24h'
  },
  {
    icon: 'mapPin',
    label: 'Indirizzo',
    value: siteConfig.contact.address,
    href: siteConfig.contact.mapsUrl,
    description: 'Facilmente raggiungibile'
  },
  {
    icon: 'clock',
    label: 'Orari',
    value: siteConfig.contact.hours.weekdays,
    description: siteConfig.contact.hours.saturday
  }
];

// Testimonials data
export interface Testimonial {
  id: string;
  name: string;
  role: string;
  avatar: string;
  rating: number;
  text: string;
  service: string;
}

export const testimonials: Testimonial[] = [
  {
    id: 'anna-m',
    name: 'Anna M.',
    role: 'Atleta amatoriale',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80',
    rating: 5,
    text: 'Dopo un infortunio al ginocchio che mi aveva costretto a smettere di correre, il Dott. Rossi mi ha guidato in un percorso di recupero eccezionale. In 3 mesi sono tornata a correre meglio di prima. Professionalità e umanità fuori dal comune.',
    service: 'Fisioterapia Sportiva'
  },
  {
    id: 'roberto-c',
    name: 'Roberto C.',
    role: 'Impiegato',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80',
    rating: 5,
    text: 'Soffrivo di mal di schiena cronico da anni. La Dott.ssa Bianchi ha individuato la causa e con un percorso di terapia manuale ha risolto un problema che pensavo dovesse accompagnarmi per sempre. Non posso che ringraziarla.',
    service: 'Terapia Manuale'
  },
  {
    id: 'maria-g',
    name: 'Maria G.',
    role: 'Pensionata',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80',
    rating: 5,
    text: "Dopo l'operazione all'anca ero scoraggiata e impaurita. Il Dott. Verdi e tutto il team mi hanno accompagnata con pazienza e competenza. Oggi cammino senza dolore e ho riottenuto la mia autonomia. Grazie di cuore!",
    service: 'Riabilitazione Post-operatoria'
  }
];

// Trust badges
export const trustBadges = [
  { value: '4.9/5', label: 'Valutazione media' },
  { value: '200+', label: 'Recensioni verificate' },
  { value: '98%', label: 'Pazienti soddisfatti' },
  { value: '85%', label: 'Raccomandano' }
];

// Mission statement
export const missionStatement = {
  title: 'La nostra missione',
  text: 'Crediamo che ogni paziente meriti un percorso di cura personalizzato, basato sulle più recenti evidenze scientifiche e sul rispetto dei tempi individuali. Il nostro obiettivo non è solo alleviare il dolore, ma restituire autonomia e qualità di vita a ogni persona che ci affida la propria salute.'
};
