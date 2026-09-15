/**
 * Theme Configuration Export
 * Import this file to use centralized theme colors
 */

import themeColors, { userTheme, vendorTheme, brand } from './colors';

// Re-export all themes
export { themeColors, userTheme, vendorTheme, brand };

// Helper functions for common theme usage
export const getThemeColor = (colorPath) => {
  const paths = colorPath.split('.');
  let value = themeColors;

  for (const path of paths) {
    value = value[path];
    if (value === undefined) {
      console.warn(`Theme color path "${colorPath}" not found`);
      return '#720C3E'; // Fallback to primary
    }
  }

  return value;
};

// Common theme utilities
export const theme = {
  colors: themeColors,
  getColor: getThemeColor,
  brand
};

export default theme;
