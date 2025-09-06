/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../ThemeProvider';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(() => ({
    theme: 'light',
    setTheme: jest.fn(),
    resolvedTheme: 'light',
  })),
  ThemeProvider: jest.fn(({ children }) => <div data-testid="theme-provider">{children}</div>),
}));

describe('ThemeProvider', () => {
  const mockProps = {
    children: <div data-testid="child-content">Child Content</div>,
    defaultTheme: 'light',
    enableSystem: true,
    storageKey: 'test-theme',
    className: 'test-class',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<ThemeProvider>Content</ThemeProvider>);
    
    expect(screen.getByTestId('theme-provider')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ThemeProvider {...mockProps} className="custom-class" />);
    
    const container = screen.getByTestId('theme-provider');
    expect(container).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<ThemeProvider {...mockProps} />);
    
    const container = screen.getByTestId('theme-provider');
    expect(container).toHaveAttribute('role', 'region');
    expect(container).toHaveAttribute('aria-label', 'Theme provider');
  });

  it('passes props to next-themes ThemeProvider', () => {
    const { ThemeProvider: MockThemeProvider } = require('next-themes');
    
    render(<ThemeProvider {...mockProps} />);
    
    expect(MockThemeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        defaultTheme: 'light',
        enableSystem: true,
        storageKey: 'test-theme',
        children: expect.anything(),
      }),
      {}
    );
  });
});

describe('useTheme hook', () => {
  const TestComponent = () => {
    const { theme, setTheme, resolvedTheme } = useTheme();
    return (
      <div>
        <span data-testid="current-theme">{theme}</span>
        <span data-testid="resolved-theme">{resolvedTheme}</span>
        <button
          data-testid="set-theme"
          onClick={() => setTheme('dark')}
        >
          Set Dark Theme
        </button>
      </div>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('provides current theme', () => {
    const { useTheme: mockUseTheme } = require('next-themes');
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: jest.fn(),
      resolvedTheme: 'light',
    });

    render(<TestComponent />);

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light');
  });

  it('provides resolved theme', () => {
    const { useTheme: mockUseTheme } = require('next-themes');
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: jest.fn(),
      resolvedTheme: 'dark',
    });

    render(<TestComponent />);

    expect(screen.getByTestId('current-theme')).toHaveTextContent('system');
    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark');
  });

  it('allows theme change', () => {
    const mockSetTheme = jest.fn();
    const { useTheme: mockUseTheme } = require('next-themes');
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    });

    render(<TestComponent />);

    const setThemeButton = screen.getByTestId('set-theme');
    fireEvent.click(setThemeButton);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('handles theme change errors gracefully', () => {
    const mockSetTheme = jest.fn(() => {
      throw new Error('Failed to set theme');
    });
    const { useTheme: mockUseTheme } = require('next-themes');
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    });

    const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    render(<TestComponent />);

    const setThemeButton = screen.getByTestId('set-theme');
    fireEvent.click(setThemeButton);

    expect(mockConsoleError).toHaveBeenCalled();

    mockConsoleError.mockRestore();
  });
});

describe('High Contrast Mode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applies high contrast classes when enabled', () => {
    const { useTheme: mockUseTheme } = require('next-themes');
    mockUseTheme.mockReturnValue({
      theme: 'high-contrast',
      setTheme: jest.fn(),
      resolvedTheme: 'high-contrast',
    });

    const TestComponent = () => {
      const { theme } = useTheme();
      return (
        <div data-testid="test-component" className={`theme-${theme}`}>
          Content
        </div>
      );
    };

    render(<TestComponent />);

    const component = screen.getByTestId('test-component');
    expect(component).toHaveClass('theme-high-contrast');
  });

  it('switches between themes correctly', () => {
    const mockSetTheme = jest.fn();
    const { useTheme: mockUseTheme } = require('next-themes');
    
    mockUseTheme.mockReturnValueOnce({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    });

    const TestComponent = () => {
      const { theme, setTheme } = useTheme();
      return (
        <div>
          <span data-testid="current-theme">{theme}</span>
          <button
            data-testid="toggle-theme"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          >
            Toggle Theme
          </button>
        </div>
      );
    };

    render(<TestComponent />);

    expect(screen.getByTestId('current-theme')).toHaveTextContent('light');

    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
    });

    const toggleButton = screen.getByTestId('toggle-theme');
    fireEvent.click(toggleButton);

    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });
});

describe('Accessibility Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('respects reduced motion preference', () => {
    const mockSetTheme = jest.fn();
    const { useTheme: mockUseTheme } = require('next-themes');
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      resolvedTheme: 'light',
    });

    // Mock reduced motion preference
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addListener: jest.fn(), // deprecated
        removeListener: jest.fn(), // deprecated
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    });

    const TestComponent = () => {
      const { theme } = useTheme();
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      return (
        <div data-testid="test-component" className={`${theme} ${prefersReducedMotion ? 'reduce-motion' : ''}`}>
          Content
        </div>
      );
    };

    render(<TestComponent />);

    const component = screen.getByTestId('test-component');
    expect(component).toHaveClass('reduce-motion');
  });

  it('handles theme persistence in localStorage', () => {
    const mockSetTheme = jest.fn();
    const { useTheme: mockUseTheme } = require('next-themes');
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      resolvedTheme: 'dark',
    });

    // Mock localStorage
    const localStorageMock = {
      getItem: jest.fn(() => 'dark'),
      setItem: jest.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
    });

    const TestComponent = () => {
      const { theme } = useTheme();
      return <div data-testid="test-component">{theme}</div>;
    };

    render(<TestComponent />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('theme');
    expect(screen.getByTestId('test-component')).toHaveTextContent('dark');
  });
});