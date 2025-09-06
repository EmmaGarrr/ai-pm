/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock next-themes
jest.mock('next-themes', () => ({
  useTheme: jest.fn(() => ({
    theme: 'light',
    setTheme: jest.fn(),
    resolvedTheme: 'light',
  })),
  ThemeProvider: jest.fn(({ children }) => <div data-testid="theme-provider">{children}</div>),
}));

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn(),
    getAll: jest.fn(),
    has: jest.fn(),
    entries: jest.fn(),
    forEach: jest.fn(),
    keys: jest.fn(),
    values: jest.fn(),
    toString: jest.fn(),
  }),
  usePathname: () => '/',
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    dismiss: jest.fn(),
  },
  Toaster: jest.fn(() => <div data-testid="toaster">Mock Toaster</div>),
}));

// Mock react-intersection-observer
jest.mock('react-intersection-observer', () => ({
  useInView: jest.fn(() => [{ isIntersecting: true }, jest.fn()]),
}));

// Mock idb-keyval
jest.mock('idb-keyval', () => ({
  openDB: jest.fn(),
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => '2024-01-01 12:00'),
}));

// Mock Workbox
jest.mock('workbox-window', () => ({
  register: jest.fn(),
}));

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  send: jest.fn(),
  close: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1,
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.matchMedia
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

// Mock document methods
Object.defineProperty(document, 'createElement', {
  value: jest.fn(() => ({
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
  })),
});

Object.defineProperty(document, 'head', {
  value: {
    appendChild: jest.fn(),
  },
});

Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn(),
  },
});

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock IndexedDB
const mockDB = {
  objectStoreNames: {
    contains: jest.fn(),
  },
  transaction: jest.fn(),
  close: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(),
};

const mockObjectStore = {
  add: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
};

const mockRequest = {
  onsuccess: null,
  onerror: null,
  result: null,
  error: null,
};

global.indexedDB = {
  open: jest.fn(() => mockRequest),
} as any;

// Mock caches API
global.caches = {
  open: jest.fn().mockResolvedValue({
    keys: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(true),
    match: jest.fn().mockResolvedValue(new Response('test')),
    add: jest.fn().mockResolvedValue(undefined),
    addAll: jest.fn().mockResolvedValue(undefined),
  }),
  keys: jest.fn().mockResolvedValue([]),
  delete: jest.fn().mockResolvedValue(true),
} as any;

// Set up test utilities
global.describe = describe;
global.it = it;
global.test = test;
global.expect = expect;
global.jest = jest;

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Export test utilities
export * from '@testing-library/react';
export { jest };