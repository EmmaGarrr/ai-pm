import React from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { useGlobalStore, useSystemStore, useUserStore } from '../store';
import { AppError, ValidationError, SystemAlert } from '../types';

export interface ErrorHandlerConfig {
  enableLogging: boolean;
  enableToast: boolean;
  enableRetry: boolean;
  maxRetries: number;
  retryDelay: number;
  enableUserFeedback: boolean;
  errorReportingEndpoint?: string;
}

export interface ErrorContext {
  component?: string;
  action?: string;
  timestamp: Date;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId?: string;
}

export interface ErrorHandlingOptions {
  showToast?: boolean;
  logToConsole?: boolean;
  reportToServer?: boolean;
  retry?: boolean;
  userMessage?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorCounts: Map<string, number> = new Map();
  private retryAttempts: Map<string, number> = new Map();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = {
      enableLogging: true,
      enableToast: true,
      enableRetry: true,
      maxRetries: 3,
      retryDelay: 1000,
      enableUserFeedback: true,
      ...config,
    };

    // Set up global error handlers
    this.setupGlobalErrorHandlers();
  }

  private setupGlobalErrorHandlers(): void {
    // Handle uncaught errors
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.handleError(event.error, {
          component: 'Global',
          action: 'uncaught_error',
          timestamp: new Date(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      });

      // Handle unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.handleError(event.reason, {
          component: 'Global',
          action: 'unhandled_promise_rejection',
          timestamp: new Date(),
          url: window.location.href,
          userAgent: navigator.userAgent,
        });
      });
    }
  }

  private getErrorContext(): ErrorContext {
    try {
      // Try to get user store data, but don't fail if it's not available
      let userId = undefined;
      let sessionId = undefined;
      
      try {
        const userStore = useUserStore.getState();
        userId = userStore.user?.id;
        sessionId = userStore.session?.id;
      } catch (e) {
        // Store not available, continue without user context
      }
      
      return {
        timestamp: new Date(),
        userId,
        sessionId,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };
    } catch (e) {
      // Fallback context if anything fails
      return {
        timestamp: new Date(),
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      };
    }
  }

  private logError(error: Error, context: ErrorContext): void {
    if (!this.config.enableLogging) return;

    const errorData = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: context.timestamp.toISOString(),
    };

    // Log to console
    console.error('Error caught by error handler:', errorData);

    // Try to log to system store, but don't fail if it's not available
    try {
      const systemStore = useSystemStore.getState();
      systemStore.addAlert({
        id: `error-${Date.now()}-${Math.random()}`,
        type: 'system',
        severity: 'error',
        message: error.message,
        description: `Error in ${context.component || 'unknown'}: ${context.action || 'unknown action'}`,
        timestamp: context.timestamp,
        resolved: false,
        source: 'error-handler',
        metadata: errorData,
      });
    } catch (e) {
      // System store not available, continue without logging
    }
  }

  private showErrorToUser(error: Error, options: ErrorHandlingOptions): void {
    if (!this.config.enableToast) return;

    const userMessage = options.userMessage || this.getUserFriendlyMessage(error);
    
    // Try to set error in global store, but don't fail if it's not available
    try {
      const globalStore = useGlobalStore.getState();
      globalStore.setError(new Error(userMessage));
    } catch (e) {
      // Global store not available, continue without setting error
    }
  }

  private getUserFriendlyMessage(error: Error): string {
    // Handle specific error types
    if (error.name === 'NetworkError') {
      return 'Unable to connect to the server. Please check your internet connection.';
    }

    if (error.name === 'TimeoutError') {
      return 'The request took too long to complete. Please try again.';
    }

    if (error.name === 'AuthenticationError') {
      return 'Please log in to continue.';
    }

    if (error.name === 'PermissionError') {
      return 'You do not have permission to perform this action.';
    }

    if (error.name === 'ValidationError') {
      return (error as ValidationError).field 
        ? `Invalid ${ (error as ValidationError).field }: ${ error.message }`
        : error.message;
    }

    // Handle HTTP status codes
    if ('status' in error) {
      const status = (error as any).status;
      switch (status) {
        case 400: return 'Invalid request. Please check your input.';
        case 401: return 'Please log in to continue.';
        case 403: return 'You do not have permission to access this resource.';
        case 404: return 'The requested resource was not found.';
        case 429: return 'Too many requests. Please wait a moment and try again.';
        case 500: return 'An internal server error occurred. Please try again later.';
        case 502: return 'The server is temporarily unavailable. Please try again later.';
        case 503: return 'The service is temporarily unavailable. Please try again later.';
      }
    }

    // Default message
    return 'An unexpected error occurred. Please try again.';
  }

  private async reportErrorToServer(error: Error, context: ErrorContext): Promise<void> {
    if (!this.config.errorReportingEndpoint) return;

    try {
      const errorData = {
        message: error.message,
        stack: error.stack,
        name: error.name,
        context,
        timestamp: context.timestamp.toISOString(),
      };

      await fetch(this.config.errorReportingEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData),
      });
    } catch (reportError) {
      console.error('Failed to report error to server:', reportError);
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    errorKey: string,
    context: ErrorContext
  ): Promise<T> {
    const attempts = this.retryAttempts.get(errorKey) || 0;
    
    if (attempts >= this.config.maxRetries) {
      this.retryAttempts.delete(errorKey);
      throw new Error(`Maximum retry attempts (${this.config.maxRetries}) exceeded`);
    }

    this.retryAttempts.set(errorKey, attempts + 1);

    // Wait before retrying
    await new Promise(resolve => 
      setTimeout(resolve, this.config.retryDelay * Math.pow(2, attempts))
    );

    try {
      const result = await operation();
      this.retryAttempts.delete(errorKey);
      return result;
    } catch (retryError) {
      return this.retryOperation(operation, errorKey, context);
    }
  }

  private trackError(error: Error): void {
    const errorKey = `${error.name}:${error.message}`;
    const currentCount = this.errorCounts.get(errorKey) || 0;
    this.errorCounts.set(errorKey, currentCount + 1);

    // Reset count after 5 minutes
    setTimeout(() => {
      this.errorCounts.delete(errorKey);
    }, 5 * 60 * 1000);
  }

  private shouldRetry(error: Error): boolean {
    // Don't retry authentication errors
    if (error.name === 'AuthenticationError' || error.name === 'PermissionError') {
      return false;
    }

    // Don't retry validation errors
    if (error.name === 'ValidationError') {
      return false;
    }

    // Retry network errors and timeouts
    if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
      return true;
    }

    // Retry 5xx server errors
    if ('status' in error) {
      const status = (error as any).status;
      return status >= 500 && status < 600;
    }

    // Retry rate limit errors
    if ('status' in error && (error as any).status === 429) {
      return true;
    }

    return false;
  }

  async handleError<T>(
    error: Error,
    context: Partial<ErrorContext> = {},
    options: ErrorHandlingOptions = {},
    operation?: () => Promise<T>
  ): Promise<T | undefined> {
    const fullContext = { ...this.getErrorContext(), ...context };
    const errorKey = `${error.name}:${error.message}`;

    this.trackError(error);
    this.logError(error, fullContext);

    // Show error to user
    if (options.showToast !== false) {
      this.showErrorToUser(error, options);
    }

    // Report to server
    if (options.reportToServer !== false) {
      await this.reportErrorToServer(error, fullContext);
    }

    // Retry if enabled and appropriate
    if (options.retry !== false && this.shouldRetry(error) && operation && this.config.enableRetry) {
      try {
        return await this.retryOperation(operation, errorKey, fullContext);
      } catch (retryError) {
        if (retryError instanceof Error) {
          this.handleError(retryError, { ...fullContext, action: 'retry_failed' }, { showToast: false });
        }
        throw retryError;
      }
    }

    // Re-throw if no retry needed or operation not provided
    throw error;
  }

  // Convenience methods for common error types
  handleNetworkError(error: Error, context?: Partial<ErrorContext>): void {
    this.handleError(error, { 
      component: 'Network', 
      action: 'request_failed', 
      ...context 
    });
  }

  handleValidationError(error: ValidationError, context?: Partial<ErrorContext>): void {
    this.handleError(error, { 
      component: 'Validation', 
      action: 'form_validation', 
      ...context 
    });
  }

  handleAuthenticationError(error: Error, context?: Partial<ErrorContext>): void {
    this.handleError(error, { 
      component: 'Authentication', 
      action: 'auth_failed', 
      ...context 
    });
  }

  handleWebSocketError(error: Error, context?: Partial<ErrorContext>): void {
    this.handleError(error, { 
      component: 'WebSocket', 
      action: 'connection_error', 
      ...context 
    });
  }

  // Async wrapper with error handling
  async wrapAsync<T>(
    operation: () => Promise<T>,
    context: Partial<ErrorContext> = {},
    options: ErrorHandlingOptions = {}
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof Error) {
        return await this.handleError(error, context, options, operation) as Promise<T>;
      }
      throw error;
    }
  }

  // Sync wrapper with error handling
  wrapSync<T>(
    operation: () => T,
    context: Partial<ErrorContext> = {},
    options: ErrorHandlingOptions = {}
  ): T {
    try {
      return operation();
    } catch (error) {
      if (error instanceof Error) {
        throw this.handleError(error, context, options);
      }
      throw error;
    }
  }

  // Get error statistics
  getErrorStats(): { totalErrors: number; errorTypes: Record<string, number> } {
    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);
    const errorTypes: Record<string, number> = {};
    
    for (const [errorKey, count] of this.errorCounts.entries()) {
      const errorType = errorKey.split(':')[0];
      errorTypes[errorType] = (errorTypes[errorType] || 0) + count;
    }

    return { totalErrors, errorTypes };
  }

  // Clear error tracking
  clearErrorStats(): void {
    this.errorCounts.clear();
    this.retryAttempts.clear();
  }

  // Update configuration
  updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Export singleton instance
export const errorHandler = new ErrorHandler({
  enableLogging: true,
  enableToast: true,
  enableRetry: true,
  maxRetries: 3,
  retryDelay: 1000,
  enableUserFeedback: true,
  errorReportingEndpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
});

// Export convenience methods
export const {
  handleError,
  handleNetworkError,
  handleValidationError,
  handleAuthenticationError,
  handleWebSocketError,
  wrapAsync,
  wrapSync,
  getErrorStats,
  clearErrorStats,
  updateConfig: updateErrorHandlerConfig,
} = errorHandler;

// React hook for error handling
export function useErrorHandler() {
  return {
    handleError,
    handleNetworkError,
    handleValidationError,
    handleAuthenticationError,
    handleWebSocketError,
    wrapAsync,
    wrapSync,
    getErrorStats,
    clearErrorStats,
  };
}

// Higher-order component for error boundaries
export function withErrorHandling<P>(
  Component: React.ComponentType<P>,
  errorContext: Partial<ErrorContext> = {}
) {
  return function WithErrorHandling(props: P) {
    return React.createElement(
      ErrorBoundary,
      { context: errorContext },
      React.createElement(Component, { ...props })
    );
  };
}