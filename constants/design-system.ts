/**
 * Corva Design System
 * 
 * Centralized design tokens for consistent UI across the app.
 * Inspired by Stripe, Robinhood, and Wealthsimple.
 */

// =============================================================================
// COLORS
// =============================================================================

export const COLORS = {
  // Backgrounds
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceElevated: '#252525',
  surfaceGlass: 'rgba(37, 37, 37, 0.6)',

  // Brand - Primary (Lime Green)
  primary: '#8BCF68',
  primaryLight: '#BEB348',
  primaryMuted: 'rgba(139, 207, 104, 0.15)',
  primaryGlow: 'rgba(139, 207, 104, 0.3)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.7)',
  textTertiary: 'rgba(255, 255, 255, 0.5)',
  textInverse: '#000000',

  // Semantic - Status Colors
  positive: '#22C55E',
  positiveMuted: 'rgba(34, 197, 94, 0.15)',
  negative: '#EF4444',
  negativeMuted: 'rgba(239, 68, 68, 0.15)',
  warning: '#F59E0B',
  warningMuted: 'rgba(245, 158, 11, 0.15)',
  info: '#3B82F6',
  infoMuted: 'rgba(59, 130, 246, 0.15)',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderActive: 'rgba(255, 255, 255, 0.2)',

  // Glass Effects
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.7)',
  overlayLight: 'rgba(0, 0, 0, 0.5)',
} as const;

// =============================================================================
// SPACING (8pt Grid System)
// =============================================================================

export const SPACING = {
  /** 4px */
  xs: 4,
  /** 8px */
  sm: 8,
  /** 12px */
  md: 12,
  /** 16px */
  lg: 16,
  /** 20px */
  xl: 20,
  /** 24px */
  '2xl': 24,
  /** 32px */
  '3xl': 32,
  /** 40px */
  '4xl': 40,
  /** 48px */
  '5xl': 48,
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

export const RADIUS = {
  /** 4px - Small elements */
  xs: 4,
  /** 8px - Buttons, small cards */
  sm: 8,
  /** 12px - Input fields */
  md: 12,
  /** 16px - Cards */
  lg: 16,
  /** 20px - Large cards */
  xl: 20,
  /** 24px - Modals, sheets */
  '2xl': 24,
  /** 9999px - Pills, avatars */
  full: 9999,
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

export const SHADOWS = {
  /** Subtle card shadow */
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  /** Elevated elements */
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  /** Modal/sheet shadow */
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  /** Glow effect with brand color */
  glow: {
    shadowColor: '#8BCF68',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// =============================================================================
// TYPOGRAPHY
// =============================================================================

export const FONT_SIZE = {
  /** 10px - Tiny labels */
  xs: 10,
  /** 12px - Captions, badges */
  sm: 12,
  /** 14px - Secondary text */
  md: 14,
  /** 16px - Body text */
  base: 16,
  /** 18px - Large body, small titles */
  lg: 18,
  /** 20px - Section headers */
  xl: 20,
  /** 24px - Page titles */
  '2xl': 24,
  /** 30px - Large titles */
  '3xl': 30,
  /** 36px - Hero numbers */
  '4xl': 36,
  /** 48px - Display numbers */
  '5xl': 48,
} as const;

export const FONT_WEIGHT = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const LINE_HEIGHT = {
  /** 1.2 - Compact, for headings and display text */
  tight: 1.2,
  /** 1.35 - Slightly compact, for titles */
  snug: 1.35,
  /** 1.5 - Normal, for body text */
  normal: 1.5,
  /** 1.65 - Relaxed, for larger text blocks */
  relaxed: 1.65,
} as const;

// =============================================================================
// TOUCH TARGETS
// =============================================================================

/** Minimum touch target size per accessibility guidelines */
export const TOUCH_MIN = 44;

// =============================================================================
// ANIMATION
// =============================================================================

export const ANIMATION = {
  /** Fast interactions (button press) */
  fast: 150,
  /** Normal transitions */
  normal: 250,
  /** Slow, deliberate animations */
  slow: 400,
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

export const Z_INDEX = {
  base: 0,
  card: 1,
  header: 10,
  modal: 100,
  toast: 1000,
} as const;

// =============================================================================
// COMMON STYLES
// =============================================================================

/** Standard glass card style */
export const GLASS_CARD_STYLE = {
  backgroundColor: COLORS.surfaceGlass,
  borderWidth: 1,
  borderColor: COLORS.glassBorder,
  borderRadius: RADIUS.lg,
};

/** Standard glass card with highlight */
export const GLASS_CARD_WITH_HIGHLIGHT = {
  ...GLASS_CARD_STYLE,
  // Add the highlight line as a child View with:
  // position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: COLORS.glassHighlight
};

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ColorKey = keyof typeof COLORS;
export type SpacingKey = keyof typeof SPACING;
export type RadiusKey = keyof typeof RADIUS;
export type ShadowKey = keyof typeof SHADOWS;
