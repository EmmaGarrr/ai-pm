import React from 'react';
import { cn } from '@/lib/utils';
import UserExplanationBox from './UserExplanationBox';
import TechnicalInstructionsBox from './TechnicalInstructionsBox';
import ConfidenceIndicator from './ConfidenceIndicator';
import MessageActions from './MessageActions';
import { User, Bot } from 'lucide-react';

interface DualOutputMessage {
  id: string;
  userExplanation: string;
  technicalInstructions: string;
  confidence: number;
  timestamp: Date;
  type: 'ai_response' | 'user_message';
  metadata?: {
    language?: string;
    isCode?: boolean;
    verificationStatus?: 'pending' | 'verified' | 'failed';
    dependencies?: string[];
  };
}

interface DualOutputContainerProps {
  message: DualOutputMessage;
  onEdit?: (messageId: string, newContent: { userExplanation?: string; technicalInstructions?: string }) => void;
  onDelete?: (messageId: string) => void;
  onCopy?: (content: string) => void;
  onExport?: (messageId: string) => void;
  className?: string;
  showActions?: boolean;
  compact?: boolean;
}

const DualOutputContainer: React.FC<DualOutputContainerProps> = ({
  message,
  onEdit,
  onDelete,
  onCopy,
  onExport,
  className,
  showActions = true,
  compact = false,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(!compact);

  const handleEdit = (messageId: string, field: 'userExplanation' | 'technicalInstructions', newContent: string) => {
    if (onEdit) {
      onEdit(messageId, { [field]: newContent });
    }
  };

  const getVerificationStatusColor = (status?: string) => {
    switch (status) {
      case 'verified':
        return 'text-green-600 bg-green-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-yellow-600 bg-yellow-100';
    }
  };

  const getVerificationStatusText = (status?: string) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  if (compact && !isExpanded) {
    return (
      <div className={cn('border rounded-lg p-3 hover:shadow-md transition-shadow', className)}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              message.type === 'ai_response' ? 'bg-green-500' : 'bg-blue-500'
            )}>
              {message.type === 'ai_response' ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">
                {message.type === 'ai_response' ? 'AI Response' : 'User Message'}
              </h3>
              <p className="text-xs text-gray-500">
                {new Intl.DateTimeFormat('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                }).format(message.timestamp)}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <ConfidenceIndicator confidence={message.confidence} size="sm" />
            <button
              onClick={() => setIsExpanded(true)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 line-clamp-2">
          {message.userExplanation}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            message.type === 'ai_response' ? 'bg-green-500' : 'bg-blue-500'
          )}>
            {message.type === 'ai_response' ? (
              <Bot className="w-5 h-5 text-white" />
            ) : (
              <User className="w-5 h-5 text-white" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {message.type === 'ai_response' ? 'AI Response' : 'User Message'}
            </h3>
            <p className="text-sm text-gray-500">
              {new Intl.DateTimeFormat('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              }).format(message.timestamp)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Verification status */}
          {message.metadata?.verificationStatus && (
            <span className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              getVerificationStatusColor(message.metadata.verificationStatus)
            )}>
              {getVerificationStatusText(message.metadata.verificationStatus)}
            </span>
          )}
          
          {/* Confidence indicator */}
          <ConfidenceIndicator confidence={message.confidence} />
          
          {/* Actions */}
          {showActions && (
            <MessageActions
              messageId={message.id}
              content={`${message.userExplanation}\n\n${message.technicalInstructions}`}
              onEdit={(id, content) => handleEdit(id, 'userExplanation', content)}
              onDelete={onDelete || (() => {})}
              onCopy={onCopy || (() => {})}
              onExport={onExport || (() => {})}
            />
          )}
          
          {/* Compact toggle */}
          {compact && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Dependencies */}
      {message.metadata?.dependencies && message.metadata.dependencies.length > 0 && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Dependencies:</span>
          <div className="flex flex-wrap gap-1">
            {message.metadata.dependencies.map((dep, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Dual Output Boxes */}
      <div className={cn(
        'grid gap-4',
        compact ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'
      )}>
        {/* User Explanation Box */}
        <UserExplanationBox
          content={message.userExplanation}
          confidence={message.confidence}
          timestamp={message.timestamp}
          showCopyButton={showActions}
        />

        {/* Technical Instructions Box */}
        <TechnicalInstructionsBox
          content={message.technicalInstructions}
          confidence={message.confidence}
          timestamp={message.timestamp}
          showCopyButton={showActions}
          language={message.metadata?.language}
          isCode={message.metadata?.isCode}
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <div className="flex items-center space-x-4 text-xs text-gray-500">
          <span>Message ID: {message.id}</span>
          {message.metadata?.language && (
            <span>Language: {message.metadata.language}</span>
          )}
          {message.metadata?.isCode && (
            <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
              Executable Code
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {message.type === 'ai_response' ? 'AI Generated' : 'User Created'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default DualOutputContainer;