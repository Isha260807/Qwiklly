/**
 * Centralized Theme Colors Configuration
 * Customized Service Provider Marketplace Palette
 * 
 * Palette:
 * - Primary:       #720C3E
 * - Primary Dark:  #4D082A
 * - Primary Light: #9A2459
 * - Accent:        #E8A0B8
 * - Background:    #FFF7FA
 * - Card:          #FFFFFF
 * - Heading:       #24151D
 * - Body Text:     #6F5A64
 * - Border:        #E8D9DF
 * - Success:       #2E8B57
 * - Warning:       #D99A2B
 * - Error:         #C0394B
 */

// Core Brand Colors
const brand = {
  primary: '#720C3E',
  primaryDark: '#4D082A',
  primaryLight: '#9A2459',
  accent: '#E8A0B8',
  background: '#FFF7FA',
  card: '#FFFFFF',
  heading: '#24151D',
  body: '#6F5A64',
  border: '#E8D9DF',
  success: '#2E8B57',
  warning: '#D99A2B',
  error: '#C0394B',
  // Legacy aliases to maintain backward compatibility across components
  teal: '#720C3E',
  yellow: '#E8A0B8',
  orange: '#9A2459',
  gradient: 'linear-gradient(135deg, #720C3E 0%, #9A2459 50%, #E8A0B8 100%)',
  conic: 'conic-gradient(from 0deg, #720C3E, #9A2459, #E8A0B8, #720C3E)'
};

// User Theme Colors
const userTheme = {
  primary: brand.primary,
  primaryDark: brand.primaryDark,
  primaryLight: brand.primaryLight,
  accent: brand.accent,
  background: brand.background,
  card: brand.card,
  heading: brand.heading,
  body: brand.body,
  border: brand.border,
  success: brand.success,
  warning: brand.warning,
  error: brand.error,
  backgroundGradient: 'linear-gradient(180deg, #FFF7FA 0%, #FFFFFF 25%, #FFF7FA 100%)',
  gradient: brand.gradient,
  headerGradient: 'linear-gradient(135deg, #720C3E 0%, #9A2459 100%)',
  headerBg: '#FFF7FA',
  button: brand.primary,
  icon: brand.primary,
  cardShadow: '0 8px 16px -2px rgba(114, 12, 62, 0.08), 0 4px 8px -1px rgba(114, 12, 62, 0.05)',
  cardBorder: '1px solid #E8D9DF',
  brand: brand
};

// Vendor Theme Colors
const vendorTheme = {
  primary: brand.primary,
  primaryDark: brand.primaryDark,
  primaryLight: brand.primaryLight,
  accent: brand.accent,
  background: brand.background,
  card: brand.card,
  heading: brand.heading,
  body: brand.body,
  border: brand.border,
  success: brand.success,
  warning: brand.warning,
  error: brand.error,
  backgroundGradient: 'linear-gradient(to bottom, rgba(114, 12, 62, 0.03) 0%, rgba(232, 160, 184, 0.02) 10%, #FFFFFF 20%)',
  gradient: brand.gradient,
  headerGradient: 'linear-gradient(135deg, #720C3E 0%, #4D082A 100%)',
  button: brand.primary,
  icon: brand.primary,
  brand: brand
};

// Default theme (for backward compatibility)
const themeColors = userTheme;

// Export all themes
export { userTheme, vendorTheme, brand };
export default themeColors;
