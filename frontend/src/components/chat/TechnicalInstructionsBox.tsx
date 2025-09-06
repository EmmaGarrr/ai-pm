import React from 'react';
import { cn } from '@/lib/utils';
import { Copy, Check, Code, Terminal, FileText } from 'lucide-react';
import { useState } from 'react';

interface TechnicalInstructionsBoxProps {
  content: string;
  confidence?: number;
  timestamp?: Date;
  className?: string;
  showCopyButton?: boolean;
  language?: string;
  isCode?: boolean;
}

const TechnicalInstructionsBox: React.FC<TechnicalInstructionsBoxProps> = ({
  content,
  confidence,
  timestamp,
  className,
  showCopyButton = true,
  language = 'text',
  isCode = false,
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

  const getLanguageIcon = () => {
    if (isCode) return <Code className="h-4 w-4" />;
    if (language.toLowerCase().includes('terminal') || language.toLowerCase().includes('bash')) {
      return <Terminal className="h-4 w-4" />;
    }
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className={cn(
      'bg-green-50 border border-green-200 rounded-lg p-4 relative',
      'hover:shadow-md transition-shadow duration-200',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <h3 className="text-sm font-semibold text-green-900">Technical Instructions</h3>
          {language && (
            <div className="flex items-center space-x-1 text-xs text-green-700">
              {getLanguageIcon()}
              <span>{language}</span>
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {timestamp && (
            <span className="text-xs text-green-600">
              {formatTimestamp(timestamp)}
            </span>
          )}
          {showCopyButton && (
            <button
              onClick={handleCopy}
              className="p-1 hover:bg-green-100 rounded transition-colors"
              title="Copy instructions"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4 text-green-600" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confidence indicator */}
      {confidence !== undefined && (
        <div className="mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-green-700 font-medium">Confidence:</span>
            <div className="flex-1 bg-green-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  confidence >= 0.8 ? 'bg-green-500' :
                  confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.max(0, Math.min(100, confidence * 100))}%` }}
              />
            </div>
            <span className="text-xs text-green-700 font-medium">
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="text-sm text-green-800 leading-relaxed">
        {isCode ? (
          <pre className="bg-green-100 rounded p-3 overflow-x-auto">
            <code className="text-green-900 text-sm font-mono">
              {content}
            </code>
          </pre>
        ) : (
          <div className="whitespace-pre-wrap">
            {content}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isCode && (
            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
              Executable Code
            </span>
          )}
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-green-600">
            Ready to implement
          </span>
        </div>
      </div>

      {/* Decorative elements */}
      <div className="absolute top-2 right-2 w-2 h-2 bg-green-300 rounded-full opacity-50" />
      <div className="absolute bottom-2 left-2 w-2 h-2 bg-green-300 rounded-full opacity-50" />
    </div>
  );
};

export default TechnicalInstructionsBox;