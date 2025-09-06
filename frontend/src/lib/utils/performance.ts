import { useRef, useEffect, useCallback } from 'react';

export interface DebounceOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
  maxWait?: number;
}

export interface ThrottleOptions {
  delay: number;
  leading?: boolean;
  trailing?: boolean;
}

// Debounce function implementation
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  options: number | DebounceOptions = 300
): (...args: Parameters<T>) => void {
  const delay = typeof options === 'number' ? options : options.delay;
  const leading = typeof options === 'number' ? false : options.leading ?? false;
  const trailing = typeof options === 'number' ? true : options.trailing ?? true;
  const maxWait = typeof options === 'number' ? undefined : options.maxWait;

  let timeoutId: NodeJS.Timeout | null = null;
  let lastCallTime = 0;
  let lastArgs: Parameters<T> | null = null;
  let result: ReturnType<T> | null = null;

  const later = () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall < delay && lastArgs) {
      // If maxWait is set and we've exceeded it, execute immediately
      if (maxWait && timeSinceLastCall >= maxWait) {
        execute();
      } else {
        // Otherwise, wait more
        timeoutId = setTimeout(later, delay - timeSinceLastCall);
      }
    } else {
      execute();
    }
  };

  const execute = () => {
    if (lastArgs && trailing) {
      result = func(...lastArgs);
      lastArgs = null;
    }
    timeoutId = null;
  };

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const isInvoking = leading && !timeoutId;

    lastArgs = args;
    lastCallTime = now;

    if (isInvoking) {
      result = func(...args);
      lastArgs = null;
    }

    if (!timeoutId) {
      timeoutId = setTimeout(later, delay);
    }

    return result;
  };
}

// Throttle function implementation
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  options: number | ThrottleOptions = 300
): (...args: Parameters<T>) => void {
  const delay = typeof options === 'number' ? options : options.delay;
  const leading = typeof options === 'number' ? true : options.leading ?? true;
  const trailing = typeof options === 'number' ? true : options.trailing ?? true;

  let timeoutId: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;
  let result: ReturnType<T> | null = null;
  let lastCallTime = 0;

  const later = () => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    if (timeSinceLastCall >= delay && lastArgs) {
      if (trailing) {
        result = func(...lastArgs);
      }
      lastArgs = null;
      timeoutId = null;
    }
  };

  return (...args: Parameters<T>) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallTime;

    // Reset if we've waited longer than the delay
    if (timeSinceLastCall >= delay) {
      lastCallTime = now;
    }

    if (leading && timeSinceLastCall >= delay) {
      result = func(...args);
      lastArgs = null;
    } else {
      lastArgs = args;
      if (!timeoutId) {
        timeoutId = setTimeout(later, delay - timeSinceLastCall);
      }
    }

    return result;
  };
}

// React hook for debouncing values
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// React hook for debouncing functions
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay, ...deps]
  ) as T;
}

// React hook for throttling functions
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList
): T {
  const callbackRef = useRef(callback);
  const lastRanRef = useRef<number>(Date.now());

  useEffect(() => {
    callbackRef.current = callback;
  }, deps);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRanRef.current;

      if (timeSinceLastRun >= delay) {
        lastRanRef.current = now;
        callbackRef.current(...args);
      }
    },
    [delay, ...deps]
  ) as T;
}

// React hook for throttling values
export function useThrottle<T>(value: T, delay: number): T {
  const [throttledValue, setThrottledValue] = React.useState<T>(value);
  const lastUpdateRef = useRef<number>(Date.now());

  React.useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current;

    if (timeSinceLastUpdate >= delay) {
      setThrottledValue(value);
      lastUpdateRef.current = now;
    } else {
      const handler = setTimeout(() => {
        setThrottledValue(value);
        lastUpdateRef.current = Date.now();
      }, delay - timeSinceLastUpdate);

      return () => {
        clearTimeout(handler);
      };
    }
  }, [value, delay]);

  return throttledValue;
}

// Rate limiter implementation
export class RateLimiter {
  private calls: number = 0;
  private lastReset: number = Date.now();
  private readonly maxCalls: number;
  private readonly windowMs: number;

  constructor(maxCalls: number, windowMs: number) {
    this.maxCalls = maxCalls;
    this.windowMs = windowMs;
  }

  canMakeCall(): boolean {
    const now = Date.now();
    const timeSinceLastReset = now - this.lastReset;

    // Reset window if enough time has passed
    if (timeSinceLastReset >= this.windowMs) {
      this.calls = 0;
      this.lastReset = now;
    }

    return this.calls < this.maxCalls;
  }

  makeCall(): boolean {
    if (!this.canMakeCall()) {
      return false;
    }

    this.calls++;
    return true;
  }

  get remainingCalls(): number {
    const now = Date.now();
    const timeSinceLastReset = now - this.lastReset;

    if (timeSinceLastReset >= this.windowMs) {
      return this.maxCalls;
    }

    return Math.max(0, this.maxCalls - this.calls);
  }

  getTimeUntilReset(): number {
    const now = Date.now();
    const timeSinceLastReset = now - this.lastReset;
    return Math.max(0, this.windowMs - timeSinceLastReset);
  }
}

// Async debounce for async functions
export function asyncDebounce<T extends (...args: any[]) => Promise<any>>(
  func: T,
  delay: number
): (...args: Parameters<T>) => Promise<ReturnType<T>> {
  let timeoutId: NodeJS.Timeout | null = null;
  let pendingPromise: Promise<ReturnType<T>> | null = null;
  let pendingArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>): Promise<ReturnType<T>> => {
    pendingArgs = args;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    return new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          if (pendingArgs) {
            const result = await func(...pendingArgs);
            resolve(result);
          }
        } catch (error) {
          reject(error);
        } finally {
          pendingArgs = null;
          timeoutId = null;
        }
      }, delay);
    });
  };
}

// Batch processor for grouping multiple operations
export class BatchProcessor<T> {
  private batch: T[] = [];
  private timeoutId: NodeJS.Timeout | null = null;
  private readonly delay: number;
  private readonly processor: (items: T[]) => Promise<void> | void;
  private readonly maxBatchSize: number;

  constructor(
    processor: (items: T[]) => Promise<void> | void,
    delay: number = 100,
    maxBatchSize: number = 100
  ) {
    this.processor = processor;
    this.delay = delay;
    this.maxBatchSize = maxBatchSize;
  }

  add(item: T): void {
    this.batch.push(item);

    // Process immediately if batch is full
    if (this.batch.length >= this.maxBatchSize) {
      this.process();
      return;
    }

    // Otherwise, schedule processing
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      this.process();
    }, this.delay);
  }

  private async process(): Promise<void> {
    if (this.batch.length === 0) return;

    const itemsToProcess = [...this.batch];
    this.batch = [];
    this.timeoutId = null;

    try {
      await this.processor(itemsToProcess);
    } catch (error) {
      console.error('Batch processing failed:', error);
      // Re-add failed items to the batch for retry
      this.batch.unshift(...itemsToProcess);
    }
  }

  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.process();
  }

  getBatchSize(): number {
    return this.batch.length;
  }
}

// Performance utilities for measuring execution time
export class PerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  measure<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();
    const duration = end - start;

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return result;
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();
    const duration = end - start;

    if (!this.measurements.has(name)) {
      this.measurements.set(name, []);
    }
    this.measurements.get(name)!.push(duration);

    return result;
  }

  getStats(name: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    total: number;
  } | null {
    const measurements = this.measurements.get(name);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const count = measurements.length;
    const total = measurements.reduce((sum, duration) => sum + duration, 0);
    const average = total / count;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { count, average, min, max, total };
  }

  clear(): void {
    this.measurements.clear();
  }
}

// Export a singleton instance for performance monitoring
export const performanceMonitor = new PerformanceMonitor();