import React, { createContext, useContext, useState, useEffect } from 'react';
import { darkPalette, lightPalette } from './colors';
import { spacing, radius } from './spacing';
import typography from './typography';

const ThemeContext = createContext({
  isDark: true,
  colors: darkPalette,
  spacing,
  radius,
  typography,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(true);

  const colors = isDark ? darkPalette : lightPalette;

  const toggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const setThemeMode = (mode) => {
    setIsDark(mode === 'dark');
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        colors,
        spacing,
        radius,
        typography,
        toggleTheme,
        setThemeMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
