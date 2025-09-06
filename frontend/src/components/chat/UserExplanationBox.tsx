import React from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface UserExplanationBoxProps {
  content: string;
  confidence?: number;
  timestamp?: Date;
  className?: string;
  showCopyButton?: boolean;
}

const UserExplanationBox: React.FC<UserExplanationBoxProps> = ({
  content,
  confidence,
  timestamp,
  className,
  showCopyButton = true,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  return (
    <div className={cn(
      'bg-blue-50 border border-blue-200 rounded-lg p-4 relative',
      'hover:shadow-md transition-shadow duration-200',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">U</span>
          </div>
          <h3 className="text-sm font-semibold text-blue-900">User Explanation</h3>
        </div>
        <div className="flex items-center space-x-2">
          {timestamp && (
            <span className="text-xs text-blue-600">
              {formatTimestamp(timestamp)}
            </span>
          )}
          {showCopyButton && (
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-blue-100 rounded transition-colors"
              title="Copy explanation"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-blue-600" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confidence indicator */}
      {confidence !== undefined && (
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-blue-700 font-medium">Confidence:</span>
            <div className="flex-1 bg-blue-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  confidence >= 0.8 ? 'bg-green-500' :
                  confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, confidence * 100))}%` }}
              />
            </div>
            <span className="text-xs text-blue-700 font-medium">
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="text-sm text-blue-800 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>

      {/* Decorative elements */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-blue-300 rounded-full opacity-50" />
      <div className="absolute bottom-2 left-2 w-2 h-2 bg-blue-300 rounded-full opacity-50" />
    </div>
  );
};

export default UserExplanationBox;