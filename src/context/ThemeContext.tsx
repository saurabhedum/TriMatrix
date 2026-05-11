import React, { createContext, useContext, useState, useEffect } from 'react';

type ThemeContextType = {
  theme: number;
  setTheme: (t: number) => void;
};

const ThemeContext = createContext<ThemeContextType>({ theme: 1, setTheme: () => {} });

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState(1);

  useEffect(() => {
    // Remove all previous theme classes
    for (let i = 1; i <= 20; i++) {
      document.documentElement.classList.remove(`theme-${i}`);
    }
    // Add the new theme class
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
