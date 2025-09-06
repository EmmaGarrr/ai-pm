import React, { useState, useCallback, useEffect } from 'react';

// Security Enhancements
export interface SecurityConfig {
  enableCSP: boolean;
  enableXSSProtection: boolean;
  enableInputSanitization: boolean;
  enableRateLimiting: boolean;
  maxRequestsPerMinute: number;
  allowedOrigins: string[];
  blockedPatterns: string[];
  sanitizeHTML: boolean;
  validateInput: boolean;
}

export class SecurityManager {
  private config: SecurityConfig;
  private requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      enableCSP: true,
      enableXSSProtection: true,
      enableInputSanitization: true,
      enableRateLimiting: true,
      maxRequestsPerMinute: 60,
      allowedOrigins: ['*'],
      blockedPatterns: [
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        /javascript:/gi,
        /on\w+\s*=/gi,
        /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      ],
      sanitizeHTML: true,
      validateInput: true,
      ...config,
    };

    this.initializeSecurity();
  }

  private initializeSecurity(): void {
    if (typeof window === 'undefined') return;

    // Apply CSP headers if enabled
    if (this.config.enableCSP) {
      this.applyCSP();
    }

    // Apply XSS protection
    if (this.config.enableXSSProtection) {
      this.applyXSSProtection();
    }

    // Set up input validation
    if (this.config.validateInput) {
      this.setupInputValidation();
    }
  }

  private applyCSP(): void {
    const cspHeader = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https: wss:",
      "frame-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "block-all-mixed-content",
      "upgrade-insecure-requests",
    ].join('; ');

    // Apply to meta tag
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = cspHeader;
    document.head.appendChild(meta);
  }

  private applyXSSProtection(): void {
    const meta = document.createElement('meta');
    meta.httpEquiv = 'X-XSS-Protection';
    meta.content = '1; mode=block';
    document.head.appendChild(meta);

    const xFrameOptions = document.createElement('meta');
    xFrameOptions.httpEquiv = 'X-Frame-Options';
    xFrameOptions.content = 'DENY';
    document.head.appendChild(xFrameOptions);

    const contentTypeOptions = document.createElement('meta');
    contentTypeOptions.httpEquiv = 'X-Content-Type-Options';
    contentTypeOptions.content = 'nosniff';
    document.head.appendChild(contentTypeOptions);

    const referrerPolicy = document.createElement('meta');
    referrerPolicy.httpEquiv = 'Referrer-Policy';
    referrerPolicy.content = 'strict-origin-when-cross-origin';
    document.head.appendChild(referrerPolicy);
  }

  private setupInputValidation(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | HTMLTextAreaElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        const sanitized = this.sanitizeInput(target.value);
        if (sanitized !== target.value) {
          target.value = sanitized;
          console.warn('Potential XSS attack detected and sanitized');
        }
      }
    });
  }

  sanitizeInput(input: string): string {
    if (!this.config.enableInputSanitization) return input;

    let sanitized = input;

    // Remove blocked patterns
    this.config.blockedPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });

    // HTML entity encoding
    sanitized = sanitized.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    return sanitized;
  }

  validateOrigin(origin: string): boolean {
    if (this.config.allowedOrigins.includes('*')) return true;
    return this.config.allowedOrigins.includes(origin);
  }

  isRateLimited(identifier: string): boolean {
    if (!this.config.enableRateLimiting) return false;

    const now = Date.now();
    const minute = 60 * 1000;
    
    const record = this.requestCounts.get(identifier);
    
    if (!record) {
      this.requestCounts.set(identifier, { count: 1, resetTime: now + minute });
      return false;
    }

    if (now > record.resetTime) {
      this.requestCounts.set(identifier, { count: 1, resetTime: now + minute });
      return false;
    }

    if (record.count >= this.config.maxRequestsPerMinute) {
      return true;
    }

    record.count++;
    return false;
  }

  sanitizeHTML(html: string): string {
    if (!this.config.sanitizeHTML) return html;

    // Basic HTML sanitization
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/data:\s*text\/html/gi, '');
  }

  validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  generateCSRFToken(): string {
    return Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.initializeSecurity();
  }
}

// Rate Limiting Hook
export const useRateLimit = (limit: number, windowMs: number = 60000) => {
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [remainingRequests, setRemainingRequests] = useState(limit);
  const requestTimes = useRef<number[]>([]);

  const checkRateLimit = useCallback(() => {
    const now = Date.now();
    const windowStart = now - windowMs;

    // Remove old requests
    requestTimes.current = requestTimes.current.filter(time => time > windowStart);

    if (requestTimes.current.length >= limit) {
      setIsRateLimited(true);
      setRemainingRequests(0);
      return false;
    }

    requestTimes.current.push(now);
    setRemainingRequests(limit - requestTimes.current.length);
    setIsRateLimited(false);
    return true;
  }, [limit, windowMs]);

  const resetRateLimit = useCallback(() => {
    requestTimes.current = [];
    setIsRateLimited(false);
    setRemainingRequests(limit);
  }, [limit]);

  useEffect(() => {
    const interval = setInterval(() => {
      checkRateLimit();
    }, 1000);

    return () => clearInterval(interval);
  }, [checkRateLimit]);

  return {
    isRateLimited,
    remainingRequests,
    checkRateLimit,
    resetRateLimit,
  };
};

// Analytics and Monitoring
export interface AnalyticsEvent {
  event: string;
  category: string;
  action?: string;
  label?: string;
  value?: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  timeToInteractive: number;
}

export class AnalyticsManager {
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetrics | null = null;
  private config: {
    enabled: boolean;
    sampleRate: number;
    endpoint?: string;
    maxEvents: number;
  };

  constructor(config: {
    enabled: boolean;
    sampleRate: number;
    endpoint?: string;
    maxEvents?: number;
  } = { enabled: true, sampleRate: 1, maxEvents: 1000 }) {
    this.config = {
      maxEvents: 1000,
      ...config,
    };

    if (this.config.enabled) {
      this.initializeAnalytics();
    }
  }

  private initializeAnalytics(): void {
    if (typeof window === 'undefined') return;

    // Track performance metrics
    this.trackPerformanceMetrics();

    // Track user interactions
    this.setupEventTracking();

    // Track errors
    this.setupErrorTracking();

    // Track page views
    this.trackPageView();
  }

  private trackPerformanceMetrics(): void {
    if (typeof window === 'undefined' || !window.performance) return;

    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      const paint = performance.getEntriesByType('paint');
      const lcp = performance.getEntriesByType('largest-contentful-paint')[0];
      const fid = performance.getEntriesByType('first-input')[0];
      const cls = performance.getEntriesByType('layout-shift');

      this.metrics = {
        pageLoadTime: navigation.loadEventEnd - navigation.navigationStart,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        largestContentfulPaint: lcp?.startTime || 0,
        firstInputDelay: fid?.processingStart - fid?.startTime || 0,
        cumulativeLayoutShift: cls.reduce((sum, entry) => sum + entry.value, 0),
        timeToInteractive: navigation.domInteractive - navigation.navigationStart,
      };

      this.trackEvent('performance', 'metrics_loaded', undefined, undefined, this.metrics);
    });
  }

  private setupEventTracking(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      const eventName = target.getAttribute('data-analytics-event') || 'click';
      const eventCategory = target.getAttribute('data-analytics-category') || 'interaction';
      
      this.trackEvent(eventCategory, eventName, {
        element: target.tagName.toLowerCase(),
        text: target.textContent?.slice(0, 50),
      });
    });

    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      this.trackEvent('form', 'submit', {
        formId: form.id || 'unknown',
        formAction: form.action,
      });
    });
  }

  private setupErrorTracking(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('error', (event) => {
      this.trackEvent('error', 'javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackEvent('error', 'promise_rejection', {
        message: event.reason?.message || 'Unknown promise rejection',
      });
    });
  }

  private trackPageView(): void {
    if (typeof document === 'undefined') return;

    this.trackEvent('page_view', 'page_loaded', {
      title: document.title,
      url: window.location.href,
      referrer: document.referrer,
    });
  }

  trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) return;

    const event: AnalyticsEvent = {
      event: `${category}_${action}`,
      category,
      action,
      label,
      value,
      timestamp: Date.now(),
      metadata,
    };

    this.events.push(event);

    // Keep only the most recent events
    if (this.events.length > this.config.maxEvents) {
      this.events = this.events.slice(-this.config.maxEvents);
    }

    // Send to analytics endpoint if configured
    if (this.config.endpoint) {
      this.sendEvent(event);
    }
  }

  private async sendEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.config.endpoint) return;

    try {
      await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event),
        keepalive: true,
      });
    } catch (error) {
      console.warn('Failed to send analytics event:', error);
    }
  }

  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  getMetrics(): PerformanceMetrics | null {
    return this.metrics;
  }

  clearEvents(): void {
    this.events = [];
  }

  exportData(): string {
    return JSON.stringify({
      events: this.events,
      metrics: this.metrics,
      exportTime: Date.now(),
    }, null, 2);
  }
}

// Internationalization Support
export interface Translation {
  [key: string]: string | Translation;
}

export interface I18nConfig {
  defaultLanguage: string;
  fallbackLanguage: string;
  supportedLanguages: string[];
  translations: Record<string, Translation>;
  enableLocalStorage: boolean;
}

export class TranslationManager {
  private config: I18nConfig;
  private currentLanguage: string;
  private listeners: Set<(language: string) => void> = new Set();

  constructor(config: I18nConfig) {
    this.config = config;
    this.currentLanguage = this.getStoredLanguage() || config.defaultLanguage;
  }

  private getStoredLanguage(): string | null {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem('language');
  }

  private storeLanguage(language: string): void {
    if (!this.config.enableLocalStorage || typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem('language', language);
  }

  setLanguage(language: string): void {
    if (!this.config.supportedLanguages.includes(language)) {
      console.warn(`Language "${language}" is not supported`);
      return;
    }

    this.currentLanguage = language;
    this.storeLanguage(language);
    this.notifyListeners();
  }

  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  t(key: string, params?: Record<string, string>): string {
    const keys = key.split('.');
    let translation: any = this.config.translations[this.currentLanguage];

    // Try fallback language if translation not found
    if (!translation) {
      translation = this.config.translations[this.config.fallbackLanguage];
    }

    // Navigate through nested keys
    for (const k of keys) {
      if (translation && typeof translation === 'object' && k in translation) {
        translation = translation[k];
      } else {
        return key; // Return key if translation not found
      }
    }

    if (typeof translation !== 'string') {
      return key; // Return key if translation is not a string
    }

    // Replace parameters
    if (params) {
      return translation.replace(/\{(\w+)\}/g, (match, param) => {
        return params[param] || match;
      });
    }

    return translation;
  }

  addListener(listener: (language: string) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentLanguage));
  }

  getSupportedLanguages(): string[] {
    return [...this.config.supportedLanguages];
  }
}

// React hook for translations
export const useTranslation = (translationManager: TranslationManager) => {
  const [language, setLanguage] = useState(translationManager.getCurrentLanguage());

  useEffect(() => {
    const unsubscribe = translationManager.addListener(setLanguage);
    return unsubscribe;
  }, [translationManager]);

  const t = useCallback((key: string, params?: Record<string, string>) => {
    return translationManager.t(key, params);
  }, [translationManager, language]);

  const changeLanguage = useCallback((newLanguage: string) => {
    translationManager.setLanguage(newLanguage);
  }, [translationManager]);

  return {
    t,
    language,
    changeLanguage,
    supportedLanguages: translationManager.getSupportedLanguages(),
  };
};

// Language Switcher Component
export const LanguageSwitcher: React.FC<{
  translationManager: TranslationManager;
  className?: string;
}> = ({ translationManager, className }) => {
  const { language, changeLanguage, supportedLanguages } = useTranslation(translationManager);

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <select
        value={language}
        onChange={(e) => changeLanguage(e.target.value)}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {lang.toUpperCase()}
          </option>
        ))}
      </select>
    </div>
  );
};

// Export instances
export const securityManager = new SecurityManager();
export const analyticsManager = new AnalyticsManager({
  enabled: true,
  sampleRate: 0.1,
  maxEvents: 1000,
});

// Default translation manager (can be configured)
export const translationManager = new TranslationManager({
  defaultLanguage: 'en',
  fallbackLanguage: 'en',
  supportedLanguages: ['en', 'es', 'fr', 'de', 'ja', 'zh'],
  translations: {
    en: {
      common: {
        loading: 'Loading...',
        error: 'An error occurred',
        success: 'Success',
        cancel: 'Cancel',
        confirm: 'Confirm',
        save: 'Save',
        delete: 'Delete',
        edit: 'Edit',
      },
    },
    // Add other languages as needed
  },
  enableLocalStorage: true,
});