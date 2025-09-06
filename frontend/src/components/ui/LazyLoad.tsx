import React, { Suspense, ComponentType, LazyExoticComponent, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader, AlertCircle, RefreshCw } from 'lucide-react';

// Loading component with customizable options
interface LoadingComponentProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'spinner' | 'skeleton' | 'dots' | 'pulse';
  message?: string;
  className?: string;
  fullPage?: boolean;
  minHeight?: string;
}

export const LoadingComponent: React.FC<LoadingComponentProps> = ({
  size = 'md',
  variant = 'spinner',
  message = 'Loading...',
  className,
  fullPage = false,
  minHeight = '200px',
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-8 h-8';
      case 'xl': return 'w-12 h-12';
      default: return 'w-6 h-6';
    }
  };

  const renderLoader = () => {
    switch (variant) {
      case 'skeleton':
        return (
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        );
      case 'dots':
        return (
          <div className="flex space-x-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={cn('bg-blue-500 rounded-full animate-bounce', getSizeClasses())}
                style={{ animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        );
      case 'pulse':
        return (
          <div className={cn('bg-blue-500 rounded-full animate-pulse', getSizeClasses())} />
        );
      default:
        return <Loader className={cn('animate-spin text-blue-500', getSizeClasses())} />;
    }
  };

  if (fullPage) {
    return (
      <div className={cn('fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50', className)}>
        <div className="text-center">
          {renderLoader()}
          {message && (
            <p className="mt-4 text-gray-600 text-sm">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center justify-center', className)} style={{ minHeight }}>
      <div className="text-center">
        {renderLoader()}
        {message && (
          <p className="mt-2 text-gray-600 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
};

// Error component for lazy loading failures
interface ErrorComponentProps {
  error: Error;
  retry?: () => void;
  message?: string;
  className?: string;
  fullPage?: boolean;
}

export const ErrorComponent: React.FC<ErrorComponentProps> = ({
  error,
  retry,
  message = 'Failed to load component',
  className,
  fullPage = false,
}) => {
  const content = (
    <div className={cn('text-center', className)}>
      <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
      <p className="text-red-600 font-medium mb-2">{message}</p>
      <p className="text-gray-500 text-sm mb-4">{error.message}</p>
      {retry && (
        <button
          onClick={retry}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry</span>
        </button>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
        {content}
      </div>
    );
  }

  return content;
};

// Lazy loading wrapper with error handling
interface LazyLoadProps {
  loader: ComponentType<any>;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  fallback?: ReactNode;
  retry?: () => void;
  delay?: number;
  timeout?: number;
}

export const LazyLoad: React.FC<LazyLoadProps> = ({
  loader: Component,
  loadingComponent,
  errorComponent,
  fallback,
  retry,
  delay = 200,
  timeout = 10000,
}) => {
  const LazyComponent = React.lazy(() => {
    return new Promise<{ default: ComponentType<any> }>((resolve, reject) => {
      // Add delay to prevent flash of loading state
      setTimeout(() => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Component loading timeout'));
        }, timeout);

        // Load the component
        Component({})
          .then((module) => {
            clearTimeout(timeoutId);
            resolve(module);
          })
          .catch((error) => {
            clearTimeout(timeoutId);
            reject(error);
          });
      }, delay);
    });
  });

  const defaultLoading = loadingComponent || <LoadingComponent />;
  const defaultError = errorComponent || (
    <ErrorComponent 
      error={new Error('Failed to load component')} 
      retry={retry} 
    />
  );

  return (
    <Suspense fallback={fallback || defaultLoading}>
      <React.ErrorBoundary
        FallbackComponent={({ error, resetErrorBoundary }) => (
          errorComponent || (
            <ErrorComponent 
              error={error} 
              retry={retry || resetErrorBoundary} 
            />
          )
        )}
        onReset={retry}
      >
        <LazyComponent />
      </React.ErrorBoundary>
    </Suspense>
  );
};

// Route-based lazy loading
interface RouteLazyLoadProps {
  component: ComponentType<any>;
  path: string;
  exact?: boolean;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
}

export const RouteLazyLoad: React.FC<RouteLazyLoadProps> = ({
  component: Component,
  path,
  exact = true,
  loadingComponent,
  errorComponent,
}) => {
  const LazyComponent = React.lazy(() => {
    // Preload the component when route is matched
    return new Promise<{ default: ComponentType<any> }>((resolve) => {
      setTimeout(() => {
        resolve({ default: Component });
      }, 100);
    });
  });

  return (
    <Suspense fallback={loadingComponent || <LoadingComponent fullPage />}>
      <React.ErrorBoundary
        FallbackComponent={({ error }) => (
          errorComponent || (
            <ErrorComponent 
              error={error} 
              fullPage 
            />
          )
        )}
      >
        <LazyComponent />
      </React.ErrorBoundary>
    </Suspense>
  );
};

// Component-level lazy loading with intersection observer
interface LazyComponentProps {
  component: ComponentType<any>;
  placeholder?: ReactNode;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
  component: Component,
  placeholder,
  loadingComponent,
  errorComponent,
  rootMargin = '50px',
  threshold = 0.1,
  triggerOnce = true,
  onLoad,
  onError,
}) => {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [shouldLoad, setShouldLoad] = React.useState(false);
  const observerRef = React.useRef<IntersectionObserver | null>(null);
  const elementRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!elementRef.current || shouldLoad) return;

    observerRef.current = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          if (triggerOnce && observerRef.current) {
            observerRef.current.disconnect();
          }
        }
      },
      { rootMargin, threshold }
    );

    observerRef.current.observe(elementRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [rootMargin, threshold, triggerOnce, shouldLoad]);

  React.useEffect(() => {
    if (!shouldLoad || isLoaded || isLoading) return;

    const loadComponent = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simulate dynamic import
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsLoaded(true);
        onLoad?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to load component');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadComponent();
  }, [shouldLoad, isLoaded, isLoading, onLoad, onError]);

  if (error) {
    return (
      errorComponent || (
        <ErrorComponent error={error} />
      )
    );
  }

  if (isLoading) {
    return loadingComponent || <LoadingComponent />;
  }

  if (isLoaded) {
    return <Component />;
  }

  return (
    <div ref={elementRef} className="min-h-[100px]">
      {placeholder || <LoadingComponent variant="skeleton" />}
    </div>
  );
};

// Progressive image loading
interface ProgressiveImageProps {
  src: string;
  placeholder?: string;
  alt: string;
  className?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  blurDataURL?: string;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  src,
  placeholder,
  alt,
  className,
  onLoad,
  onError,
  blurDataURL,
}) => {
  const [imageSrc, setImageSrc] = React.useState(placeholder || blurDataURL || '');
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    if (!src) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      setError(null);
      onLoad?.();
    };
    img.onerror = () => {
      const error = new Error('Failed to load image');
      setError(error);
      setIsLoading(false);
      onError?.(error);
    };
    img.src = src;
  }, [src, onLoad, onError]);

  if (error) {
    return (
      <div className={cn('bg-gray-200 rounded-lg flex items-center justify-center', className)}>
        <div className="text-center p-4">
          <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">Failed to load image</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <img
        src={imageSrc}
        alt={alt}
        className={cn(
          'w-full h-full object-cover transition-all duration-300',
          isLoading && 'filter blur-sm scale-105',
          !isLoading && 'filter blur-0 scale-100'
        )}
      />
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse" />
      )}
    </div>
  );
};

// Batch lazy loading for multiple components
interface BatchLazyLoadProps {
  components: Array<{
    id: string;
    component: ComponentType<any>;
    priority: 'high' | 'medium' | 'low';
  }>;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode;
  batchSize?: number;
}

export const BatchLazyLoad: React.FC<BatchLazyLoadProps> = ({
  components,
  loadingComponent,
  errorComponent,
  batchSize = 3,
}) => {
  const [loadedComponents, setLoadedComponents] = React.useState<Set<string>>(new Set());
  const [loadingIds, setLoadingIds] = React.useState<Set<string>>(new Set());
  const [errors, setErrors] = React.useState<Map<string, Error>>(new Map());

  // Sort by priority
  const sortedComponents = [...components].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  React.useEffect(() => {
    const loadNextBatch = () => {
      const unloadedComponents = sortedComponents.filter(
        comp => !loadedComponents.has(comp.id) && !loadingIds.has(comp.id)
      );

      if (unloadedComponents.length === 0) return;

      const batch = unloadedComponents.slice(0, batchSize);
      const newLoadingIds = new Set(loadingIds);

      batch.forEach(comp => newLoadingIds.add(comp.id));
      setLoadingIds(newLoadingIds);

      // Load batch
      Promise.allSettled(
        batch.map(async (comp) => {
          try {
            // Simulate loading
            await new Promise(resolve => setTimeout(resolve, 100));
            setLoadedComponents(prev => new Set(prev).add(comp.id));
          } catch (error) {
            setErrors(prev => new Map(prev).set(comp.id, error as Error));
          } finally {
            setLoadingIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(comp.id);
              return newSet;
            });
          }
        })
      ).then(() => {
        // Load next batch if there are more components
        if (unloadedComponents.length > batchSize) {
          setTimeout(loadNextBatch, 100);
        }
      });
    };

    loadNextBatch();
  }, [components, loadedComponents, loadingIds, batchSize, sortedComponents]);

  return (
    <div className="space-y-4">
      {sortedComponents.map(({ id, component: Component }) => {
        const isLoaded = loadedComponents.has(id);
        const isLoading = loadingIds.has(id);
        const error = errors.get(id);

        if (error) {
          return (
            <div key={id}>
              {errorComponent || (
                <ErrorComponent error={error} />
              )}
            </div>
          );
        }

        if (isLoading) {
          return (
            <div key={id}>
              {loadingComponent || <LoadingComponent />}
            </div>
          );
        }

        if (isLoaded) {
          return <Component key={id} />;
        }

        return (
          <div key={id} className="min-h-[100px]">
            <LoadingComponent variant="skeleton" />
          </div>
        );
      })}
    </div>
  );
};

// Performance monitoring for lazy loading
export const LazyLoadingMonitor = () => {
  const [metrics, setMetrics] = React.useState({
    loadedComponents: 0,
    failedComponents: 0,
    averageLoadTime: 0,
    totalLoadTime: 0,
  });

  // This would integrate with your performance monitoring system
  // For now, it's a placeholder that could be expanded

  return (
    <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 text-xs">
      <h4 className="font-semibold mb-2">Lazy Loading Metrics</h4>
      <div className="space-y-1">
        <div>Loaded: {metrics.loadedComponents}</div>
        <div>Failed: {metrics.failedComponents}</div>
        <div>Avg Time: {metrics.averageLoadTime.toFixed(0)}ms</div>
      </div>
    </div>
  );
};

// Utility hooks for lazy loading
export const useLazyLoad = () => {
  const [loadedComponents, setLoadedComponents] = React.useState<Set<string>>(new Set());
  const [loadingComponents, setLoadingComponents] = React.useState<Set<string>>(new Set());

  const loadComponent = React.useCallback(async (
    id: string,
    loadFn: () => Promise<any>
  ) => {
    if (loadedComponents.has(id) || loadingComponents.has(id)) {
      return;
    }

    setLoadingComponents(prev => new Set(prev).add(id));

    try {
      await loadFn();
      setLoadedComponents(prev => new Set(prev).add(id));
    } catch (error) {
      console.error(`Failed to load component ${id}:`, error);
    } finally {
      setLoadingComponents(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  }, [loadedComponents, loadingComponents]);

  const isLoaded = React.useCallback((id: string) => loadedComponents.has(id), [loadedComponents]);
  const isLoading = React.useCallback((id: string) => loadingComponents.has(id), [loadingComponents]);

  return {
    loadComponent,
    isLoaded,
    isLoading,
    loadedComponents: Array.from(loadedComponents),
    loadingComponents: Array.from(loadingComponents),
  };
};

export default LazyLoad;