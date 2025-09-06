"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  RefreshCw, 
  Home, 
  Copy, 
  ExternalLink,
  Bug,
  AlertCircle,
  Info
} from "lucide-react";
import { errorHandler, ErrorContext } from "@/lib/error/errorHandler";
import { useGlobalStore } from "@/lib/store";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; errorInfo: React.ErrorInfo; errorId: string; onReset: () => void }>;
  fallbackComponent?: React.ReactNode;
  context?: Partial<ErrorContext>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  resetKeys?: Array<string | number>;
  resetOnPropsChange?: boolean;
}

class ErrorBoundaryInternal extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId: number | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Handle error with error handler
    errorHandler.handleError(error, {
      component: errorInfo.componentStack?.split('\n')[0]?.trim() || 'Unknown',
      action: 'render_error',
      ...this.props.context,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetKeys, resetOnPropsChange } = this.props;
    const { hasError } = this.state;

    // Reset error boundary when reset keys change
    if (hasError && resetOnPropsChange && prevProps.resetKeys !== resetKeys) {
      if (this.arraysEqual(prevProps.resetKeys || [], resetKeys || [])) {
        return;
      }
      this.resetErrorBoundary();
    }
  }

  private arraysEqual(a: Array<string | number>, b: Array<string | number>): boolean {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }

  resetErrorBoundary = () => {
    // Clear any pending reset timeout
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: "",
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  handleCopyError = () => {
    if (!this.state.error) return;
    
    const errorText = `
Error ID: ${this.state.errorId}
Time: ${new Date().toISOString()}
URL: ${window.location.href}
Error: ${this.state.error.message}
Stack: ${this.state.error.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
    `.trim();

    navigator.clipboard.writeText(errorText).then(() => {
      // Show success feedback
      const globalStore = useGlobalStore.getState();
      globalStore.setError(new Error('Error details copied to clipboard'));
    });
  };

  handleReportIssue = () => {
    const errorDetails = encodeURIComponent(`
**Error ID:** ${this.state.errorId}
**Time:** ${new Date().toISOString()}
**URL:** ${window.location.href}
**Error:** ${this.state.error?.message}
**Stack:** ${this.state.error?.stack}
**Component Stack:** ${this.state.errorInfo?.componentStack}
    `);

    const issueUrl = `https://github.com/your-repo/issues/new?title=Error+Report:+${encodeURIComponent(this.state.error?.message || 'Unknown Error')}&body=${errorDetails}`;
    window.open(issueUrl, '_blank');
  };

  render() {
    const { hasError, error, errorInfo, errorId } = this.state;
    const { fallback, fallbackComponent, children } = this.props;

    if (!hasError) {
      return children;
    }

    // Use custom fallback component if provided
    if (fallbackComponent) {
      return <>{fallbackComponent}</>;
    }

    // Use custom fallback render prop if provided
    if (fallback) {
      const FallbackComponent = fallback;
      return (
        <FallbackComponent
          error={error!}
          errorInfo={errorInfo!}
          errorId={errorId}
          onReset={this.resetErrorBoundary}
        />
      );
    }

    // Default error UI
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-2xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-xl font-semibold text-red-600">
              Oops! Something went wrong
            </CardTitle>
            <p className="text-muted-foreground">
              We're sorry, but an unexpected error occurred. Our team has been notified.
            </p>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Error Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-medium">Error Details</h4>
                <Badge variant="outline" className="text-xs">
                  {errorId}
                </Badge>
              </div>
              
              <div className="bg-muted p-3 rounded-md">
                <p className="text-sm font-mono break-all">
                  {error?.message}
                </p>
              </div>

              {errorInfo?.componentStack && (
                <details className="space-y-2">
                  <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground">
                    Component Stack Trace
                  </summary>
                  <ScrollArea className="h-32 w-full">
                    <pre className="text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                      {errorInfo.componentStack}
                    </pre>
                  </ScrollArea>
                </details>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={this.resetErrorBoundary} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button variant="outline" onClick={this.handleReload} className="flex-1">
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              <Button variant="outline" onClick={this.handleGoHome} className="flex-1">
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Additional Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="ghost" onClick={this.handleCopyError} className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy Error Details
              </Button>
              <Button variant="ghost" onClick={this.handleReportIssue} className="flex-1">
                <Bug className="h-4 w-4 mr-2" />
                Report Issue
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Info className="h-4 w-4" />
                <span>If this problem persists, please contact support.</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Error ID: {errorId}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
}

// Export the ErrorBoundary component
export const ErrorBoundary = React.forwardRef<
  React.ComponentRef<typeof ErrorBoundaryInternal>,
  ErrorBoundaryProps
>((props, ref) => <ErrorBoundaryInternal {...props} ref={ref} />);

ErrorBoundary.displayName = 'ErrorBoundary';

// Simpler error boundary for specific components
interface SimpleErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error) => void;
}

export function SimpleErrorBoundary({ children, fallback, onError }: SimpleErrorBoundaryProps) {
  const [hasError, setHasError] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      setHasError(true);
      setError(event.error);
      onError?.(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [onError]);

  if (hasError) {
    return fallback || (
      <div className="p-4 border border-red-200 rounded-md bg-red-50">
        <div className="flex items-center gap-2 text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Something went wrong</span>
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-1">{error.message}</p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

// Hook-based error boundary for functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
    errorHandler.handleError(error, { component: 'Hook', action: 'error_boundary' });
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return { captureError, resetError };
}

// Higher-order component for error boundaries
export function withErrorBoundary<P>(
  Component: React.ComponentType<P>,
  errorBoundaryProps: Omit<ErrorBoundaryProps, 'children'> = {}
) {
  return function WithErrorBoundary(props: P) {
    return (
      <ErrorBoundary {...errorBoundaryProps}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Default export
export default ErrorBoundary;