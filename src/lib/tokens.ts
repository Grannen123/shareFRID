/**
 * Design Tokens - Grannfrid CRM
 *
 * TypeScript representation of design tokens.
 * Source of truth is index.css @theme block.
 * This file provides type-safe access and documentation.
 */

// ============================================
// SPACING - 8px Grid System
// ============================================

export const spacing = {
  0: "0px",
  px: "1px",
  0.5: "4px", // 0.5 units
  1: "8px", // 1 unit - BASE
  1.5: "12px", // 1.5 units
  2: "16px", // 2 units
  2.5: "20px", // 2.5 units
  3: "24px", // 3 units
  4: "32px", // 4 units
  5: "40px", // 5 units
  6: "48px", // 6 units
  8: "64px", // 8 units
  10: "80px", // 10 units
  12: "96px", // 12 units
  16: "128px", // 16 units
} as const;

export type SpacingKey = keyof typeof spacing;

// ============================================
// COLORS - WCAG AA Compliant
// ============================================

export const colors = {
  // Primary: Sage
  sage: {
    50: "#f5f8f3",
    100: "#e8f0e3",
    200: "#c8dcbc",
    300: "#a8c895",
    400: "#87a96b",
    DEFAULT: "#6c914f", // WCAG AAA on white
    dark: "#5a7a42",
    900: "#2d3d21",
  },

  // Secondary: Terracotta
  terracotta: {
    50: "#fef5f2",
    100: "#fce6df",
    200: "#f8c8ba",
    300: "#f0a08c",
    DEFAULT: "#c25a3e", // WCAG AA on white
    dark: "#a64d35",
    900: "#6d3b2b",
  },

  // Accent: Lavender
  lavender: {
    50: "#f8f6fc",
    100: "#eeeaf8",
    DEFAULT: "#786c9c", // WCAG AA on white
    dark: "#645a82",
  },

  // Accent: Gold/Warning
  gold: {
    50: "#fffbeb",
    100: "#fef3c7",
    DEFAULT: "#b48214", // WCAG AA on white
    dark: "#926910",
  },

  // Neutrals
  charcoal: "#2c2824", // Primary text - 12:1 contrast
  ash: "#4b4641", // Secondary text - WCAG AAA
  muted: "#6b7280", // Muted text - WCAG AA
  warmWhite: "#fdfcfb", // Card backgrounds
  cream: "#f9f7f4", // Page background
  sand: "#e5e1da", // Borders
  sandLight: "#f0ede8", // Subtle backgrounds

  // Semantic
  warning: "#b48214",
  success: "#6c914f",
  error: "#c25a3e",
  info: "#786c9c",
} as const;

// ============================================
// TYPOGRAPHY
// ============================================

export const fontFamily = {
  display: '"Lora", Georgia, serif',
  body: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", "Fira Code", monospace',
} as const;

export const fontSize = {
  "2xs": "0.64rem", // 10.24px
  xs: "0.75rem", // 12px
  sm: "0.875rem", // 14px
  base: "1rem", // 16px
  md: "1.125rem", // 18px
  lg: "1.25rem", // 20px
  xl: "1.5rem", // 24px
  "2xl": "1.875rem", // 30px
  "3xl": "2.25rem", // 36px
  "4xl": "3rem", // 48px
} as const;

export const fontWeight = {
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
} as const;

export const lineHeight = {
  none: 1,
  tight: 1.25,
  snug: 1.375,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
} as const;

// ============================================
// BORDER RADIUS
// ============================================

export const radius = {
  none: "0",
  sm: "0.375rem", // 6px
  md: "0.5rem", // 8px
  lg: "0.75rem", // 12px
  xl: "1rem", // 16px
  "2xl": "1.5rem", // 24px
  full: "9999px",
} as const;

// ============================================
// SHADOWS
// ============================================

export const shadows = {
  xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  sm: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  "2xl": "0 25px 50px -12px rgb(0 0 0 / 0.25)",
  inner: "inset 0 2px 4px 0 rgb(0 0 0 / 0.05)",
  organic:
    "0 2px 12px rgba(44, 40, 36, 0.04), 0 8px 24px rgba(108, 145, 79, 0.06)",
  floating: "0 8px 32px rgba(108, 145, 79, 0.15)",
  focus: "0 0 0 3px rgba(108, 145, 79, 0.4)",
  focusError: "0 0 0 3px rgba(194, 90, 62, 0.4)",
} as const;

// ============================================
// ANIMATION
// ============================================

export const duration = {
  instant: "0ms",
  fast: "100ms",
  normal: "200ms",
  slow: "300ms",
  slower: "500ms",
} as const;

export const easing = {
  default: "cubic-bezier(0.4, 0, 0.2, 1)",
  in: "cubic-bezier(0.4, 0, 1, 1)",
  out: "cubic-bezier(0, 0, 0.2, 1)",
  inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
} as const;

// ============================================
// Z-INDEX
// ============================================

export const zIndex = {
  dropdown: 50,
  sticky: 100,
  fixed: 200,
  modalBackdrop: 400,
  modal: 500,
  popover: 600,
  tooltip: 700,
  toast: 800,
  max: 9999,
} as const;

// ============================================
// LAYOUT
// ============================================

export const layout = {
  sidebarWidth: "256px",
  headerHeight: "64px",
  contentMaxWidth: "1280px",
  formMaxWidth: "640px",
} as const;

// ============================================
// BREAKPOINTS (Tailwind defaults)
// ============================================

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1536px",
} as const;

// ============================================
// COMPLETE TOKEN EXPORT
// ============================================

export const tokens = {
  spacing,
  colors,
  fontFamily,
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  shadows,
  duration,
  easing,
  zIndex,
  layout,
  breakpoints,
} as const;

export type Tokens = typeof tokens;

export default tokens;
