// Echo Design System - Color Palettes (Dark Charcoal & Modern Light)

export const darkPalette = {
  // Backgrounds
  background: '#090D16',       // Deep charcoal-midnight
  backgroundSecondary: '#0E1422',
  cardBackground: '#121826',   // Luminous charcoal card
  cardSecondary: '#192236',
  surface: '#182032',
  elevated: '#202C44',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.05)',
  borderActive: 'rgba(99, 102, 241, 0.5)',
  glassBackground: 'rgba(18, 24, 38, 0.75)',

  // Brand Accents
  primary: '#6366F1',          // Electric Indigo
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  primaryGlow: 'rgba(99, 102, 241, 0.3)',
  
  accent: '#8B5CF6',           // Royal Violet
  accentLight: '#A78BFA',
  accentGlow: 'rgba(139, 92, 246, 0.3)',
  
  gradientPrimary: ['#6366F1', '#8B5CF6'],
  gradientAccent: ['#8B5CF6', '#A855F7', '#C084FC'],
  gradientCard: ['#121826', '#171F32'],
  gradientHero: ['#1E1B4B', '#131826'],
  gradientRecord: ['#EF4444', '#F43F5E'],

  // Functional
  recordRed: '#EF4444',
  recordGlow: 'rgba(239, 68, 68, 0.4)',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  cyan: '#06B6D4',
  emerald: '#10B981',
  amber: '#F59E0B',

  // Typography
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textDisabled: '#475569',

  // Categories
  categories: {
    Whereabouts: '#06B6D4',
    Tasks: '#F59E0B',
    Work: '#6366F1',
    Ideas: '#EC4899',
    People: '#8B5CF6',
    Health: '#10B981',
    Personal: '#3B82F6',
    Study: '#8B5CF6',
  },

  sentiments: {
    positive: '#10B981',
    urgent: '#EF4444',
    thoughtful: '#8B5CF6',
    concerned: '#F59E0B',
    neutral: '#94A3B8',
  },
};

export const lightPalette = {
  // Backgrounds
  background: '#F8FAFC',       // Clean alabaster / slate
  backgroundSecondary: '#F1F5F9',
  cardBackground: '#FFFFFF',   // Pure white card
  cardSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  elevated: '#FFFFFF',
  border: 'rgba(0, 0, 0, 0.08)',
  borderLight: 'rgba(0, 0, 0, 0.04)',
  borderActive: 'rgba(79, 70, 229, 0.5)',
  glassBackground: 'rgba(255, 255, 255, 0.85)',

  // Brand Accents
  primary: '#4F46E5',          // Deep Indigo
  primaryDark: '#4338CA',
  primaryLight: '#6366F1',
  primaryGlow: 'rgba(79, 70, 229, 0.2)',
  
  accent: '#7C3AED',           // Deep Purple
  accentLight: '#8B5CF6',
  accentGlow: 'rgba(124, 58, 237, 0.2)',
  
  gradientPrimary: ['#4F46E5', '#7C3AED'],
  gradientAccent: ['#7C3AED', '#9333EA', '#A855F7'],
  gradientCard: ['#FFFFFF', '#F8FAFC'],
  gradientHero: ['#EEF2FF', '#FFFFFF'],
  gradientRecord: ['#DC2626', '#E11D48'],

  // Functional
  recordRed: '#DC2626',
  recordGlow: 'rgba(220, 38, 38, 0.25)',
  success: '#059669',
  warning: '#D97706',
  error: '#DC2626',
  cyan: '#0891B2',
  emerald: '#059669',
  amber: '#D97706',

  // Typography
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  textDisabled: '#CBD5E1',

  // Categories
  categories: {
    Whereabouts: '#0891B2',
    Tasks: '#D97706',
    Work: '#4F46E5',
    Ideas: '#DB2777',
    People: '#7C3AED',
    Health: '#059669',
    Personal: '#2563EB',
    Study: '#7C3AED',
  },

  sentiments: {
    positive: '#059669',
    urgent: '#DC2626',
    thoughtful: '#7C3AED',
    concerned: '#D97706',
    neutral: '#64748B',
  },
};

// Default export is dark mode
export const colors = darkPalette;
export default darkPalette;
