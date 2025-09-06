import { lazy, ComponentType, ReactNode } from 'react';
import { useRouteLoaderData } from 'react-router-dom';

// Route-based code splitting with prefetching
export interface RouteConfig {
  path: string;
  component: ComponentType<any>;
  preload?: boolean;
  prefetch?: boolean;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}

// Create lazy-loaded routes with optimized loading
export function createLazyRoute<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    preload?: boolean;
    prefetch?: boolean;
    loadingComponent?: ReactNode;
    errorComponent?: ReactNode;
  } = {}
) {
  const LazyComponent = lazy(importFn);
  
  const LazyRouteWrapper = (props: Parameters<T>[0]) => {
    return <LazyComponent {...props} />;
  };

  // Preload function
  LazyRouteWrapper.preload = () => {
    return importFn();
  };

  // Prefetch function (lower priority)
  LazyRouteWrapper.prefetch = () => {
    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(() => importFn());
    } else {
      setTimeout(() => importFn(), 1000);
    }
  };

  return LazyRouteWrapper;
}

// Chunk-based code splitting utilities
export class CodeSplitManager {
  private loadedChunks = new Set<string>();
  private loadingChunks = new Set<string>();
  private chunkPromises = new Map<string, Promise<any>>();

  // Load a chunk with deduplication
  async loadChunk<T>(chunkName: string, importFn: () => Promise<T>): Promise<T> {
    if (this.loadedChunks.has(chunkName)) {
      return this.chunkPromises.get(chunkName)!;
    }

    if (this.loadingChunks.has(chunkName)) {
      return this.chunkPromises.get(chunkName)!;
    }

    this.loadingChunks.add(chunkName);
    
    const promise = importFn()
      .then((module) => {
        this.loadedChunks.add(chunkName);
        this.loadingChunks.delete(chunkName);
        return module;
      })
      .catch((error) => {
        this.loadingChunks.delete(chunkName);
        this.chunkPromises.delete(chunkName);
        throw error;
      });

    this.chunkPromises.set(chunkName, promise);
    return promise;
  }

  // Preload multiple chunks
  async preloadChunks(chunks: Array<{
    name: string;
    importFn: () => Promise<any>;
    priority?: 'high' | 'medium' | 'low';
  }>): Promise<void> {
    // Sort by priority
    const sortedChunks = [...chunks].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return (priorityOrder[a.priority || 'medium'] - priorityOrder[b.priority || 'medium']);
    });

    // Load in batches
    const batchSize = 3;
    for (let i = 0; i < sortedChunks.length; i += batchSize) {
      const batch = sortedChunks.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(chunk => this.loadChunk(chunk.name, chunk.importFn))
      );
      
      // Small delay between batches
      if (i + batchSize < sortedChunks.length) {
        await new Promise(resolve => setTimeout(resolve, 50));
      }
    }
  }

  // Check if chunk is loaded
  isChunkLoaded(chunkName: string): boolean {
    return this.loadedChunks.has(chunkName);
  }

  // Get loaded chunks
  getLoadedChunks(): string[] {
    return Array.from(this.loadedChunks);
  }

  // Get loading chunks
  getLoadingChunks(): string[] {
    return Array.from(this.loadingChunks);
  }

  // Clear all chunks
  clearChunks(): void {
    this.loadedChunks.clear();
    this.loadingChunks.clear();
    this.chunkPromises.clear();
  }
}

// Global instance
export const codeSplitManager = new CodeSplitManager();

// React hook for code splitting
export function useCodeSplit() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const loadComponent = React.useCallback(async (
    componentName: string,
    importFn: () => Promise<any>
  ): Promise<ComponentType<any>> => {
    setLoading(true);
    setError(null);

    try {
      const module = await codeSplitManager.loadChunk(componentName, importFn);
      return module.default || module;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load component');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const preloadComponent = React.useCallback(async (
    componentName: string,
    importFn: () => Promise<any>
  ): Promise<void> => {
    try {
      await codeSplitManager.loadChunk(componentName, importFn);
    } catch (err) {
      console.warn(`Failed to preload component ${componentName}:`, err);
    }
  }, []);

  return {
    loadComponent,
    preloadComponent,
    loading,
    error,
    isLoaded: codeSplitManager.isChunkLoaded.bind(codeSplitManager),
    getLoadedChunks: codeSplitManager.getLoadedChunks.bind(codeSplitManager),
    getLoadingChunks: codeSplitManager.getLoadingChunks.bind(codeSplitManager),
  };
}

// Intersection Observer-based lazy loading hook
export function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);

  React.useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
    }, {
      threshold: 0.1,
      rootMargin: '50px',
      ...options,
    });

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [elementRef, options]);

  return isIntersecting;
}

// Performance monitoring for code splitting
export class CodeSplitMonitor {
  private metrics = new Map<string, {
    loadTime: number;
    loadDate: Date;
    success: boolean;
    size?: number;
  }>();

  trackLoad(chunkName: string, loadTime: number, success: boolean, size?: number) {
    this.metrics.set(chunkName, {
      loadTime,
      loadDate: new Date(),
      success,
      size,
    });

    // Send to analytics service
    this.sendToAnalytics({
      event: 'chunk_load',
      chunkName,
      loadTime,
      success,
      size,
      timestamp: Date.now(),
    });
  }

  private sendToAnalytics(data: any) {
    // Implement your analytics tracking here
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'chunk_load', {
        event_category: 'performance',
        event_label: data.chunkName,
        value: Math.round(data.loadTime),
      });
    }

    // Also track in performance API if available
    if (typeof window !== 'undefined' && window.performance) {
      window.performance.mark(`chunk_load_${data.chunkName}`);
    }
  }

  getMetrics() {
    return Array.from(this.metrics.entries()).map(([name, data]) => ({
      name,
      ...data,
    }));
  }

  getAverageLoadTime() {
    const metrics = this.getMetrics();
    if (metrics.length === 0) return 0;
    
    const totalTime = metrics.reduce((sum, metric) => sum + metric.loadTime, 0);
    return totalTime / metrics.length;
  }

  getSuccessRate() {
    const metrics = this.getMetrics();
    if (metrics.length === 0) return 0;
    
    const successful = metrics.filter(metric => metric.success).length;
    return (successful / metrics.length) * 100;
  }

  clearMetrics() {
    this.metrics.clear();
  }
}

// Global instance
export const codeSplitMonitor = new CodeSplitMonitor();

// Higher-order component for lazy loading
export function withLazyLoading<P extends object>(
  Component: ComponentType<P>,
  options: {
    placeholder?: ReactNode;
    loadingComponent?: ReactNode;
    errorComponent?: ReactNode;
    preload?: boolean;
  } = {}
) {
  return function LazyComponent(props: P) {
    const { loadComponent, loading, error } = useCodeSplit();
    const [LoadedComponent, setLoadedComponent] = React.useState<ComponentType<P> | null>(null);

    React.useEffect(() => {
      if (options.preload) {
        const componentName = Component.displayName || Component.name || 'Anonymous';
        loadComponent(componentName, () => Promise.resolve({ default: Component }))
          .then((Comp) => setLoadedComponent(() => Comp))
          .catch(console.error);
      }
    }, [loadComponent, Component, options.preload]);

    if (error) {
      return options.errorComponent || (
        <div className="p-4 text-red-600">Failed to load component</div>
      );
    }

    if (loading) {
      return options.loadingComponent || (
        <div className="p-4">Loading...</div>
      );
    }

    if (LoadedComponent) {
      return <LoadedComponent {...props} />;
    }

    return options.placeholder || (
      <div className="p-4 bg-gray-100 animate-pulse">Component placeholder</div>
    );
  };
}

// Dynamic import utility with error handling
export function dynamicImport<T>(
  importFn: () => Promise<T>,
  options: {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<T> {
  const { timeout = 10000, retries = 3, retryDelay = 1000 } = options;

  return new Promise((resolve, reject) => {
    let attempt = 0;
    let timeoutId: NodeJS.Timeout;

    const attemptImport = () => {
      attempt++;
      
      timeoutId = setTimeout(() => {
        if (attempt < retries) {
          console.warn(`Import attempt ${attempt} failed, retrying...`);
          setTimeout(attemptImport, retryDelay);
        } else {
          reject(new Error('Import timeout'));
        }
      }, timeout);

      importFn()
        .then((module) => {
          clearTimeout(timeoutId);
          resolve(module);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          if (attempt < retries) {
            console.warn(`Import attempt ${attempt} failed, retrying...`);
            setTimeout(attemptImport, retryDelay);
          } else {
            reject(error);
          }
        });
    };

    attemptImport();
  });
}

// Prefetch utilities
export class PrefetchManager {
  private prefetchedUrls = new Set<string>();
  private observer: IntersectionObserver | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const url = entry.target.getAttribute('data-prefetch');
              if (url && !this.prefetchedUrls.has(url)) {
                this.prefetchUrl(url);
                this.prefetchedUrls.add(url);
              }
            }
          });
        },
        { rootMargin: '50px' }
      );
    }
  }

  prefetchUrl(url: string) {
    if (typeof window === 'undefined') return;

    // Use link prefetch for resources
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url;
    document.head.appendChild(link);

    // Remove after a short delay
    setTimeout(() => {
      document.head.removeChild(link);
    }, 5000);
  }

  observe(element: HTMLElement) {
    this.observer?.observe(element);
  }

  unobserve(element: HTMLElement) {
    this.observer?.unobserve(element);
  }

  disconnect() {
    this.observer?.disconnect();
  }
}

// Global instance
export const prefetchManager = new PrefetchManager();