import React from 'react';
import { cn } from '@/lib/utils';
import { Loader, Activity, Zap } from 'lucide-react';

interface LoadingStateProps {
  type: 'spinner' | 'dots' | 'pulse' | 'bars' | 'skeleton';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  type,
  size = 'md',
  message,
  className,
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          spinner: 'w-4 h-4',
          dots: 'w-1 h-1',
          bars: 'h-1',
          skeleton: 'h-4',
        };
      case 'lg':
        return {
          spinner: 'w-8 h-8',
          dots: 'w-2 h-2',
          bars: 'h-2',
          skeleton: 'h-8',
        };
      case 'xl':
        return {
          spinner: 'w-12 h-12',
          dots: 'w-3 h-3',
          bars: 'h-3',
          skeleton: 'h-12',
        };
      default:
        return {
          spinner: 'w-6 h-6',
          dots: 'w-1.5 h-1.5',
          bars: 'h-1.5',
          skeleton: 'h-6',
        };
    }
  };

  const sizeClasses = getSizeClasses();

  const renderSpinner = () => (
    <Loader className={cn('animate-spin', sizeClasses.spinner, 'text-blue-500')} />
  );

  const renderDots = () => (
    <div className="flex space-x-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-blue-500 rounded-full animate-bounce',
            sizeClasses.dots
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );

  const renderPulse = () => (
    <div className={cn('bg-blue-500 rounded-full animate-pulse', sizeClasses.spinner)} />
  );

  const renderBars = () => (
    <div className="flex space-x-1">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-blue-500 animate-pulse',
            sizeClasses.bars,
            'w-1'
          )}
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </div>
  );

  const renderSkeleton = () => (
    <div className={cn('bg-gray-200 rounded animate-pulse', sizeClasses.skeleton)} />
  );

  const renderContent = () => {
    switch (type) {
      case 'spinner':
        return renderSpinner();
      case 'dots':
        return renderDots();
      case 'pulse':
        return renderPulse();
      case 'bars':
        return renderBars();
      case 'skeleton':
        return renderSkeleton();
      default:
        return renderSpinner();
    }
  };

  return (
    <div className={cn('flex flex-col items-center justify-center space-y-2', className)}>
      {renderContent()}
      {message && (
        <p className="text-sm text-gray-600 animate-pulse">{message}</p>
      )}
    </div>
  );
};

// Page loading component
interface PageLoadingProps {
  message?: string;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Loading...',
  className,
}) => (
  <div className={cn('min-h-screen flex items-center justify-center', className)}>
    <div className="text-center">
      <LoadingState type="spinner" size="xl" />
      <p className="mt-4 text-lg font-medium text-gray-700">{message}</p>
    </div>
  </div>
);

// Content loading component
interface ContentLoadingProps {
  rows?: number;
  className?: string;
}

export const ContentLoading: React.FC<ContentLoadingProps> = ({
  rows = 3,
  className,
}) => (
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
      </div>
    ))}
  </div>
);

// Card loading component
interface CardLoadingProps {
  count?: number;
  className?: string;
}

export const CardLoading: React.FC<CardLoadingProps> = ({
  count = 3,
  className,
}) => (
  <div className={cn('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="space-y-3">
          <div className="h-6 bg-gray-200 rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-full animate-pulse"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6 animate-pulse"></div>
          <div className="h-20 bg-gray-200 rounded w-full animate-pulse"></div>
        </div>
      </div>
    ))}
  </div>
);

// Table loading component
interface TableLoadingProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableLoading: React.FC<TableLoadingProps> = ({
  rows = 5,
  columns = 4,
  className,
}) => (
  <div className={cn('overflow-hidden', className)}>
    <div className="space-y-3">
      {/* Header */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-6 bg-gray-200 rounded animate-pulse"></div>
        ))}
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div key={colIndex} className="h-4 bg-gray-200 rounded animate-pulse"></div>
          ))}
        </div>
      ))}
    </div>
  </div>
);

export default LoadingState;