// Icon Components
export { default as Icon } from './Icon.astro';

// Icon name constants for type safety
export const ICONS = {
  // Service icons
  ACTIVITY: 'activity',
  HEARTPULSE: 'heartpulse',
  HAND: 'hand',
  
  // Stats icons
  CALENDAR: 'calendar',
  USERS: 'users',
  AWARD: 'award',
  GRADUATION: 'graduation',
  
  // Contact icons
  PHONE: 'phone',
  MAIL: 'mail',
  MAP_PIN: 'mapPin',
  CLOCK: 'clock',
  
  // UI icons
  CHECK: 'check',
  CHECK_CIRCLE: 'checkCircle',
  STAR: 'star',
  ARROW_RIGHT: 'arrowRight',
  ARROW_DOWN: 'arrowDown',
  SEND: 'send',
  QUOTE: 'quote',
  MENU: 'menu',
  X: 'x',
  CHEVRON_RIGHT: 'chevronRight',
  EXTERNAL_LINK: 'externalLink',
  SHIELD: 'shield',
  VERIFIED: 'verified',
  CHECK_BADGE: 'checkBadge',
  CALENDAR_DAYS: 'calendarDays',
  SPARKLES: 'sparkles',
} as const;

export type IconName = typeof ICONS[keyof typeof ICONS];
