/**
 * Typography Components
 * 
 * Reusable text components with consistent styling from the design system.
 * Each component provides semantic meaning and visual hierarchy.
 */

import React from 'react';
import { Text, TextStyle, StyleSheet, TextProps } from 'react-native';
import { COLORS, FONT_SIZE, FONT_WEIGHT, LINE_HEIGHT } from '../../constants/design-system';

// =============================================================================
// TYPES
// =============================================================================

type TypographyColor = 'primary' | 'secondary' | 'tertiary' | 'inverse' | 'positive' | 'negative' | 'warning' | 'brand';

interface BaseTypographyProps extends TextProps {
  children: React.ReactNode;
  color?: TypographyColor;
  align?: 'left' | 'center' | 'right';
}

// =============================================================================
// HELPERS
// =============================================================================

const getColor = (color: TypographyColor = 'primary'): string => {
  switch (color) {
    case 'primary':
      return COLORS.textPrimary;
    case 'secondary':
      return COLORS.textSecondary;
    case 'tertiary':
      return COLORS.textTertiary;
    case 'inverse':
      return COLORS.textInverse;
    case 'positive':
      return COLORS.positive;
    case 'negative':
      return COLORS.negative;
    case 'warning':
      return COLORS.warning;
    case 'brand':
      return COLORS.primary;
    default:
      return COLORS.textPrimary;
  }
};

// =============================================================================
// DISPLAY NUMBER
// =============================================================================

/**
 * DisplayNumber - Large hero numbers (36px, extrabold)
 * 
 * Use for: Revenue totals, main statistics, large counters
 * Example: "$12,450" on dashboard cards
 */
export const DisplayNumber: React.FC<BaseTypographyProps> = ({
  children,
  color = 'primary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.displayNumber,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// HEADING
// =============================================================================

/**
 * Heading - Page/section headings (24px, bold)
 * 
 * Use for: Screen titles, major section headers
 * Example: "Dashboard", "Clients", "Reports"
 */
export const Heading: React.FC<BaseTypographyProps> = ({
  children,
  color = 'primary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.heading,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// TITLE
// =============================================================================

/**
 * Title - Card titles, subsection headers (18px, semibold)
 * 
 * Use for: Card headers, list section titles, modal titles
 * Example: "Monthly Revenue", "Upcoming Appointments"
 */
export const Title: React.FC<BaseTypographyProps> = ({
  children,
  color = 'primary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.title,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// SUBTITLE
// =============================================================================

/**
 * Subtitle - Secondary titles (16px, medium)
 * 
 * Use for: Subtitle text, emphasized labels
 * Example: Card subtitles, form section labels
 */
export const Subtitle: React.FC<BaseTypographyProps> = ({
  children,
  color = 'secondary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.subtitle,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// BODY
// =============================================================================

/**
 * Body - Standard body text (14px, normal)
 * 
 * Use for: Paragraphs, descriptions, list item text
 * Example: Client notes, appointment details
 */
export const Body: React.FC<BaseTypographyProps> = ({
  children,
  color = 'primary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.body,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// BODY SMALL
// =============================================================================

/**
 * BodySmall - Smaller body text (13px, normal)
 * 
 * Use for: Secondary descriptions, compact list items
 * Example: Email addresses, phone numbers in lists
 */
export const BodySmall: React.FC<BaseTypographyProps> = ({
  children,
  color = 'secondary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.bodySmall,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// CAPTION
// =============================================================================

/**
 * Caption - Small labels and captions (12px, medium)
 * 
 * Use for: Labels, timestamps, badges, helper text
 * Example: "Last updated 2h ago", badge text
 */
export const Caption: React.FC<BaseTypographyProps> = ({
  children,
  color = 'secondary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.caption,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// MICRO
// =============================================================================

/**
 * Micro - Tiny text (10px, medium)
 * 
 * Use for: Very small labels, fine print, status indicators
 * Example: "PRO" badge, tiny metadata
 */
export const Micro: React.FC<BaseTypographyProps> = ({
  children,
  color = 'tertiary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.micro,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// LABEL
// =============================================================================

/**
 * Label - Form labels and emphasis (14px, semibold)
 * 
 * Use for: Form field labels, emphasized text, buttons
 * Example: Input labels, button text
 */
export const Label: React.FC<BaseTypographyProps> = ({
  children,
  color = 'primary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.label,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// NUMBER
// =============================================================================

/**
 * Number - Numeric values with tabular figures (16px, semibold)
 * 
 * Use for: Statistics, counts, currency values in lists
 * Example: "24 clients", "$1,250", "85%"
 */
export const NumberText: React.FC<BaseTypographyProps> = ({
  children,
  color = 'primary',
  align = 'left',
  style,
  ...props
}) => (
  <Text
    style={[
      styles.number,
      { color: getColor(color), textAlign: align },
      style,
    ]}
    {...props}
  >
    {children}
  </Text>
);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  displayNumber: {
    fontSize: FONT_SIZE['4xl'],
    fontWeight: FONT_WEIGHT.extrabold,
    lineHeight: FONT_SIZE['4xl'] * LINE_HEIGHT.tight,
    letterSpacing: -0.5,
  } as TextStyle,

  heading: {
    fontSize: FONT_SIZE['2xl'],
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE['2xl'] * LINE_HEIGHT.tight,
    letterSpacing: -0.3,
  } as TextStyle,

  title: {
    fontSize: FONT_SIZE.lg,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.lg * LINE_HEIGHT.snug,
    letterSpacing: -0.2,
  } as TextStyle,

  subtitle: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.snug,
  } as TextStyle,

  body: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.normal,
  } as TextStyle,

  bodySmall: {
    fontSize: 13,
    fontWeight: FONT_WEIGHT.normal,
    lineHeight: 13 * LINE_HEIGHT.normal,
  } as TextStyle,

  caption: {
    fontSize: FONT_SIZE.sm,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.sm * LINE_HEIGHT.normal,
  } as TextStyle,

  micro: {
    fontSize: FONT_SIZE.xs,
    fontWeight: FONT_WEIGHT.medium,
    lineHeight: FONT_SIZE.xs * LINE_HEIGHT.normal,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  } as TextStyle,

  label: {
    fontSize: FONT_SIZE.md,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.md * LINE_HEIGHT.snug,
  } as TextStyle,

  number: {
    fontSize: FONT_SIZE.base,
    fontWeight: FONT_WEIGHT.semibold,
    lineHeight: FONT_SIZE.base * LINE_HEIGHT.tight,
    fontVariant: ['tabular-nums'],
  } as TextStyle,
});

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  DisplayNumber,
  Heading,
  Title,
  Subtitle,
  Body,
  BodySmall,
  Caption,
  Micro,
  Label,
  NumberText,
};
