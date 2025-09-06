import React from 'react';
import { cn } from '@/lib/utils';

interface ConfidenceIndicatorProps {
  confidence: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const ConfidenceIndicator: React.FC<ConfidenceIndicatorProps> = ({
  confidence,
  size = 'md',
  showLabel = true,
  className,
}) => {
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBgColor = (conf: number) => {
    if (conf >= 0.8) return 'bg-green-600';
    if (conf >= 0.6) return 'bg-yellow-600';
    return 'bg-red-600';
  };

  const getConfidenceLabel = (conf: number) => {
    if (conf >= 0.8) return 'High';
    if (conf >= 0.6) return 'Medium';
    return 'Low';
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          container: 'h-4 w-16',
          text: 'text-xs',
          progress: 'h-1',
        };
      case 'lg':
        return {
          container: 'h-8 w-32',
          text: 'text-base',
          progress: 'h-3',
        };
      default:
        return {
          container: 'h-6 w-24',
          text: 'text-sm',
          progress: 'h-2',
        };
    }
  };

  const sizeClasses = getSizeClasses();
  const confidenceColor = getConfidenceColor(confidence);
  const confidenceBgColor = getConfidenceBgColor(confidence);
  const confidenceLabel = getConfidenceLabel(confidence);

  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <div className={cn('bg-gray-200 rounded-full overflow-hidden', sizeClasses.container)}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', confidenceBgColor, sizeClasses.progress)}
          style={{ width: `${Math.max(0, Math.min(100, confidence * 100))}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex items-center space-x-1">
          <span className={cn('font-medium', confidenceColor, sizeClasses.text)}>
            {Math.round(confidence * 100)}%
          </span>
          <span className={cn('text-gray-500', sizeClasses.text)}>
            ({confidenceLabel})
          </span>
        </div>
      )}
    </div>
  );
};

export default ConfidenceIndicator;