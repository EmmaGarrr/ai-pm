import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Theme types
export type ThemeMode = 'light' | 'dark' | 'system';
export type ContrastMode = 'normal' | 'high' | 'increased';
export type ColorScheme = 'default' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

export interface ThemeConfig {
  mode: ThemeMode;
  contrast: ContrastMode;
  colorScheme: ColorScheme;
  fontSize: 'small' | 'medium' | 'large' | 'x-large';
  reduceMotion: boolean;
  focusVisible: boolean;
  customColors?: {
    primary?: string;
    secondary?: string;
    background?: string;
    surface?: string;
    text?: string;
  };
}

interface ThemeContextType {
  theme: ThemeConfig;
  setTheme: (config: Partial<ThemeConfig>) => void;
  toggleTheme: () => void;
  setContrast: (contrast: ContrastMode) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setFontSize: (size: ThemeConfig['fontSize']) => void;
  setReduceMotion: (reduce: boolean) => void;
  setFocusVisible: (visible: boolean) => void;
  setCustomColor: (key: keyof ThemeConfig['customColors'], color: string) => void;
  resetTheme: () => void;
  exportTheme: () => string;
  importTheme: (config: string) => boolean;
}

const defaultTheme: ThemeConfig = {
  mode: 'system',
  contrast: 'normal',
  colorScheme: 'default',
  fontSize: 'medium',
  reduceMotion: false,
  focusVisible: true,
  customColors: {},
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeConfig>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme-config');
      if (saved) {
        try {
          return { ...defaultTheme, ...JSON.parse(saved) };
        } catch {
          return defaultTheme;
        }
      }
    }
    return defaultTheme;
  });

  // Apply theme to document
  const applyTheme = useCallback((config: ThemeConfig) => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Theme mode
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = config.mode === 'dark' || (config.mode === 'system' && systemPrefersDark);
    
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');

    // Contrast mode
    root.setAttribute('data-contrast', config.contrast);

    // Color scheme for color blindness
    root.setAttribute('data-color-scheme', config.colorScheme);

    // Font size
    root.setAttribute('data-font-size', config.fontSize);

    // Reduce motion
    root.setAttribute('data-reduce-motion', config.reduceMotion.toString());

    // Focus visible
    root.setAttribute('data-focus-visible', config.focusVisible.toString());

    // Apply custom colors
    if (config.customColors) {
      Object.entries(config.customColors).forEach(([key, value]) => {
        if (value) {
          root.style.setProperty(`--color-${key}`, value);
        }
      });
    }

    // Apply high contrast styles
    if (config.contrast === 'high') {
      root.style.setProperty('--border-width', '3px');
      root.style.setProperty('--focus-outline-width', '3px');
      root.style.setProperty('--focus-outline-color', '#fff');
    } else if (config.contrast === 'increased') {
      root.style.setProperty('--border-width', '2px');
      root.style.setProperty('--focus-outline-width', '2px');
      root.style.setProperty('--focus-outline-color', '#000');
    } else {
      root.style.setProperty('--border-width', '1px');
      root.style.setProperty('--focus-outline-width', '2px');
      root.style.removeProperty('--focus-outline-color');
    }

    // Apply color vision deficiency filters
    const filters: Record<ColorScheme, string> = {
      default: 'none',
      protanopia: 'url(#protanopia)',
      deuteranopia: 'url(#deuteranopia)',
      tritanopia: 'url(#tritanopia)',
      achromatopsia: 'grayscale(100%)',
    };

    root.style.filter = filters[config.colorScheme];

    // Save to localStorage
    localStorage.setItem('theme-config', JSON.stringify(config));
  }, []);

  // Update theme when it changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (theme.mode !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyTheme(theme);

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  const setTheme = useCallback((config: Partial<ThemeConfig>) => {
    setThemeState(prev => ({ ...prev, ...config }));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => ({
      ...prev,
      mode: prev.mode === 'light' ? 'dark' : 'light',
    }));
  }, []);

  const setContrast = useCallback((contrast: ContrastMode) => {
    setThemeState(prev => ({ ...prev, contrast }));
  }, []);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setThemeState(prev => ({ ...prev, colorScheme: scheme }));
  }, []);

  const setFontSize = useCallback((size: ThemeConfig['fontSize']) => {
    setThemeState(prev => ({ ...prev, fontSize: size }));
  }, []);

  const setReduceMotion = useCallback((reduce: boolean) => {
    setThemeState(prev => ({ ...prev, reduceMotion: reduce }));
  }, []);

  const setFocusVisible = useCallback((visible: boolean) => {
    setThemeState(prev => ({ ...prev, focusVisible: visible }));
  }, []);

  const setCustomColor = useCallback((key: keyof ThemeConfig['customColors'], color: string) => {
    setThemeState(prev => ({
      ...prev,
      customColors: { ...prev.customColors, [key]: color },
    }));
  }, []);

  const resetTheme = useCallback(() => {
    setThemeState(defaultTheme);
  }, []);

  const exportTheme = useCallback(() => {
    return JSON.stringify(theme, null, 2);
  }, [theme]);

  const importTheme = useCallback((config: string) => {
    try {
      const parsed = JSON.parse(config);
      setThemeState(prev => ({ ...prev, ...parsed }));
      return true;
    } catch {
      return false;
    }
  }, []);

  const value: ThemeContextType = {
    theme,
    setTheme,
    toggleTheme,
    setContrast,
    setColorScheme,
    setFontSize,
    setReduceMotion,
    setFocusVisible,
    setCustomColor,
    resetTheme,
    exportTheme,
    importTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
      {/* SVG filters for color vision deficiency */}
      <svg style={{ display: 'none' }}>
        <defs>
          <filter id="protanopia">
            <feColorMatrix type="matrix" values="0.567, 0.433, 0,     0, 0
                                                   0.558, 0.442, 0,     0, 0
                                                   0,     0.242, 0.758, 0, 0
                                                   0,     0,     0,     1, 0" />
          </filter>
          <filter id="deuteranopia">
            <feColorMatrix type="matrix" values="0.625, 0.375, 0,   0, 0
                                                   0.7,   0.3,   0,   0, 0
                                                   0,     0.3,   0.7, 0, 0
                                                   0,     0,     0,   1, 0" />
          </filter>
          <filter id="tritanopia">
            <feColorMatrix type="matrix" values="0.95, 0.05,  0,     0, 0
                                                   0,    0.433, 0.567, 0, 0
                                                   0,    0.475, 0.525, 0, 0
                                                   0,    0,     0,     1, 0" />
          </filter>
        </defs>
      </svg>
    </ThemeContext.Provider>
  );
};

// Theme switcher component
export const ThemeSwitcher: React.FC<{ className?: string }> = ({ className }) => {
  const { theme, toggleTheme, setContrast, setColorScheme, setFontSize, setReduceMotion } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
        aria-label="Theme settings"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Theme Mode
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      setTheme({ mode });
                      if (mode === 'system') {
                        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        document.documentElement.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
                      } else {
                        document.documentElement.setAttribute('data-theme', mode);
                      }
                    }}
                    className={cn(
                      'px-3 py-2 text-sm rounded-md transition-colors',
                      theme.mode === mode
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                  >
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contrast
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['normal', 'high', 'increased'] as ContrastMode[]).map((contrast) => (
                  <button
                    key={contrast}
                    onClick={() => setContrast(contrast)}
                    className={cn(
                      'px-3 py-2 text-sm rounded-md transition-colors',
                      theme.contrast === contrast
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                  >
                    {contrast.charAt(0).toUpperCase() + contrast.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Color Vision
              </label>
              <select
                value={theme.colorScheme}
                onChange={(e) => setColorScheme(e.target.value as ColorScheme)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="default">Default</option>
                <option value="protanopia">Protanopia (Red-blind)</option>
                <option value="deuteranopia">Deuteranopia (Green-blind)</option>
                <option value="tritanopia">Tritanopia (Blue-blind)</option>
                <option value="achromatopsia">Achromatopsia (Color-blind)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Font Size
              </label>
              <div className="grid grid-cols-4 gap-2">
                {(['small', 'medium', 'large', 'x-large'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => setFontSize(size)}
                    className={cn(
                      'px-2 py-1 text-sm rounded-md transition-colors',
                      theme.fontSize === size
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    )}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reduce Motion
              </label>
              <button
                onClick={() => setReduceMotion(!theme.reduceMotion)}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  theme.reduceMotion ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    theme.reduceMotion ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Focus Visible
              </label>
              <button
                onClick={() => {
                  const newValue = !theme.focusVisible;
                  setFocusVisible(newValue);
                  document.documentElement.setAttribute('data-focus-visible', newValue.toString());
                }}
                className={cn(
                  'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                  theme.focusVisible ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                    theme.focusVisible ? 'translate-x-6' : 'translate-x-1'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// CSS variables injection
export const injectThemeVariables = () => {
  if (typeof document === 'undefined') return;

  const styleId = 'theme-variables';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    :root {
      /* Light theme colors */
      --color-primary: #3b82f6;
      --color-primary-foreground: #ffffff;
      --color-secondary: #6b7280;
      --color-secondary-foreground: #ffffff;
      --color-background: #ffffff;
      --color-surface: #f3f4f6;
      --color-text: #111827;
      --color-text-secondary: #6b7280;
      --color-border: #e5e7eb;
      --color-error: #ef4444;
      --color-warning: #f59e0b;
      --color-success: #10b981;
      --color-info: #3b82f6;

      /* Dark theme colors */
      --color-primary-dark: #60a5fa;
      --color-primary-foreground-dark: #1e293b;
      --color-secondary-dark: #9ca3af;
      --color-secondary-foreground-dark: #1e293b;
      --color-background-dark: #111827;
      --color-surface-dark: #1f2937;
      --color-text-dark: #f9fafb;
      --color-text-secondary-dark: #d1d5db;
      --color-border-dark: #374151;
      --color-error-dark: #f87171;
      --color-warning-dark: #fbbf24;
      --color-success-dark: #34d399;
      --color-info-dark: #60a5fa;

      /* Typography */
      --font-size-small: 0.875rem;
      --font-size-medium: 1rem;
      --font-size-large: 1.125rem;
      --font-size-x-large: 1.25rem;
      --line-height: 1.5;
      --font-weight-normal: 400;
      --font-weight-medium: 500;
      --font-weight-semibold: 600;
      --font-weight-bold: 700;

      /* Spacing */
      --spacing-xs: 0.5rem;
      --spacing-sm: 0.75rem;
      --spacing-md: 1rem;
      --spacing-lg: 1.5rem;
      --spacing-xl: 2rem;
      --spacing-2xl: 3rem;

      /* Borders */
      --border-width: 1px;
      --border-radius: 0.5rem;
      --border-radius-sm: 0.25rem;
      --border-radius-lg: 0.75rem;
      --border-radius-xl: 1rem;

      /* Focus */
      --focus-outline-width: 2px;
      --focus-outline-color: #3b82f6;
      --focus-outline-offset: 2px;

      /* Shadows */
      --shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
      --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
      --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

      /* Transitions */
      --transition-duration: 150ms;
      --transition-timing: cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Theme-specific styles */
    [data-theme="light"] {
      color-scheme: light;
      --color-primary: var(--color-primary);
      --color-primary-foreground: var(--color-primary-foreground);
      --color-secondary: var(--color-secondary);
      --color-secondary-foreground: var(--color-secondary-foreground);
      --color-background: var(--color-background);
      --color-surface: var(--color-surface);
      --color-text: var(--color-text);
      --color-text-secondary: var(--color-text-secondary);
      --color-border: var(--color-border);
      --color-error: var(--color-error);
      --color-warning: var(--color-warning);
      --color-success: var(--color-success);
      --color-info: var(--color-info);
    }

    [data-theme="dark"] {
      color-scheme: dark;
      --color-primary: var(--color-primary-dark);
      --color-primary-foreground: var(--color-primary-foreground-dark);
      --color-secondary: var(--color-secondary-dark);
      --color-secondary-foreground: var(--color-secondary-foreground-dark);
      --color-background: var(--color-background-dark);
      --color-surface: var(--color-surface-dark);
      --color-text: var(--color-text-dark);
      --color-text-secondary: var(--color-text-secondary-dark);
      --color-border: var(--color-border-dark);
      --color-error: var(--color-error-dark);
      --color-warning: var(--color-warning-dark);
      --color-success: var(--color-success-dark);
      --color-info: var(--color-info-dark);
    }

    /* High contrast styles */
    [data-contrast="high"] {
      --color-border: #000000;
      --color-text: #000000;
      --color-background: #ffffff;
      --color-surface: #ffffff;
    }

    [data-contrast="high"][data-theme="dark"] {
      --color-border: #ffffff;
      --color-text: #ffffff;
      --color-background: #000000;
      --color-surface: #000000;
    }

    /* Font size styles */
    [data-font-size="small"] {
      font-size: var(--font-size-small);
    }

    [data-font-size="medium"] {
      font-size: var(--font-size-medium);
    }

    [data-font-size="large"] {
      font-size: var(--font-size-large);
    }

    [data-font-size="x-large"] {
      font-size: var(--font-size-x-large);
    }

    /* Reduce motion styles */
    [data-reduce-motion="true"] * {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }

    /* Focus visible styles */
    [data-focus-visible="false"] *:focus {
      outline: none;
    }
  `;

  document.head.appendChild(style);
};

// Auto-inject styles on component import
if (typeof window !== 'undefined') {
  injectThemeVariables();
}