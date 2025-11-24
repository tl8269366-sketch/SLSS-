
import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeColor = 'blue' | 'purple' | 'green' | 'orange' | 'slate';

interface Theme {
  name: string;
  color: ThemeColor;
  classes: {
    bg: string;
    bgHover: string;
    text: string;
    bgLight: string;
    border: string;
    ring: string;
  };
}

export const THEMES: Record<ThemeColor, Theme> = {
  blue: {
    name: '科技蓝 (Default)',
    color: 'blue',
    classes: { bg: 'bg-blue-600', bgHover: 'hover:bg-blue-700', text: 'text-blue-600', bgLight: 'bg-blue-50', border: 'border-blue-200', ring: 'ring-blue-500' }
  },
  purple: {
    name: '星云紫 (Nebula)',
    color: 'purple',
    classes: { bg: 'bg-purple-600', bgHover: 'hover:bg-purple-700', text: 'text-purple-600', bgLight: 'bg-purple-50', border: 'border-purple-200', ring: 'ring-purple-500' }
  },
  green: {
    name: '翡翠绿 (Emerald)',
    color: 'green',
    classes: { bg: 'bg-emerald-600', bgHover: 'hover:bg-emerald-700', text: 'text-emerald-600', bgLight: 'bg-emerald-50', border: 'border-emerald-200', ring: 'ring-emerald-500' }
  },
  orange: {
    name: '活力橙 (Orange)',
    color: 'orange',
    classes: { bg: 'bg-orange-600', bgHover: 'hover:bg-orange-700', text: 'text-orange-600', bgLight: 'bg-orange-50', border: 'border-orange-200', ring: 'ring-orange-500' }
  },
  slate: {
    name: '极简灰 (Slate)',
    color: 'slate',
    classes: { bg: 'bg-slate-700', bgHover: 'hover:bg-slate-800', text: 'text-slate-700', bgLight: 'bg-slate-100', border: 'border-slate-300', ring: 'ring-slate-500' }
  }
};

interface ThemeContextType {
  theme: ThemeColor;
  setTheme: (theme: ThemeColor) => void;
  themeConfig: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<ThemeColor>('blue');

  useEffect(() => {
    const saved = localStorage.getItem('slss_theme');
    if (saved && THEMES[saved as ThemeColor]) {
      setTheme(saved as ThemeColor);
    }
  }, []);

  const handleSetTheme = (newTheme: ThemeColor) => {
    setTheme(newTheme);
    localStorage.setItem('slss_theme', newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, themeConfig: THEMES[theme] }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
