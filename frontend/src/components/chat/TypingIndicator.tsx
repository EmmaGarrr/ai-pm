import React from 'react';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface TypingUser {
  id: string;
  name: string;
  avatar?: string;
  isTyping: boolean;
  type: 'user' | 'ai';
}

interface TypingIndicatorProps {
  users: TypingUser[];
  maxUsers?: number;
  className?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  users,
  maxUsers = 3,
  className,
}) => {
  const typingUsers = users.filter(user => user.isTyping);
  
  if (typingUsers.length === 0) return null;

  const getTypingText = () => {
    const visibleUsers = typingUsers.slice(0, maxUsers);
    const remainingCount = typingUsers.length - visibleUsers.length;

    if (typingUsers.length === 1) {
      const user = typingUsers[0];
      return `${user.name} is typing...`;
    }

    if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing...`;
    }

    if (remainingCount > 0) {
      return `${visibleUsers.map(u => u.name).join(', ')} and ${remainingCount} other${remainingCount > 1 ? 's' : ''} are typing...`;
    }

    return `${typingUsers.length} people are typing...`;
  };

  const getTypingAnimation = () => {
    return (
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'w-2 h-2 bg-blue-500 rounded-full animate-bounce',
              typingUsers.length > 2 && 'w-1.5 h-1.5'
            )}
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
    );
  };

  const getUserAvatars = () => {
    const visibleUsers = typingUsers.slice(0, Math.min(maxUsers, 4));
    
    return (
      <div className="flex -space-x-2">
        {visibleUsers.map((user, index) => (
          <div
            key={user.id}
            className={cn(
              'w-6 h-6 rounded-full border-2 border-white flex items-center justify-center',
              user.type === 'ai' ? 'bg-green-500' : 'bg-blue-500',
              typingUsers.length > 3 && 'w-5 h-5'
            )}
            style={{ zIndex: visibleUsers.length - index }}
          >
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <div className="text-white text-xs">
                {user.type === 'ai' ? (
                  <Bot className="w-3 h-3" />
                ) : (
                  <User className="w-3 h-3" />
                )}
              </div>
            )}
          </div>
        ))}
        {typingUsers.length > maxUsers && (
          <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-400 flex items-center justify-center text-white text-xs">
            +{typingUsers.length - maxUsers}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn(
      'flex items-center space-x-3 py-2 px-4 bg-gray-50 rounded-lg border border-gray-200',
      'animate-pulse',
      className
    )}>
      {getUserAvatars()}
      {getTypingAnimation()}
      <span className="text-sm text-gray-600 font-medium">
        {getTypingText()}
      </span>
    </div>
  );
};

// Single user typing indicator
interface SingleTypingIndicatorProps {
  user: TypingUser;
  className?: string;
}

export const SingleTypingIndicator: React.FC<SingleTypingIndicatorProps> = ({
  user,
  className,
}) => {
  if (!user.isTyping) return null;

  return (
    <div className={cn(
      'flex items-center space-x-2 py-2 px-3 bg-gray-50 rounded-lg border border-gray-200',
      'animate-pulse',
      className
    )}>
      <div className={cn(
        'w-5 h-5 rounded-full border-2 border-white flex items-center justify-center',
        user.type === 'ai' ? 'bg-green-500' : 'bg-blue-500'
      )}>
        {user.avatar ? (
          <img
            src={user.avatar}
            alt={user.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <div className="text-white text-xs">
            {user.type === 'ai' ? (
              <Bot className="w-2.5 h-2.5" />
            ) : (
              <User className="w-2.5 h-2.5" />
            )}
          </div>
        )}
      </div>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <span className="text-sm text-gray-600">
        {user.name} is typing...
      </span>
    </div>
  );
};

// Compact typing indicator
interface CompactTypingIndicatorProps {
  count: number;
  className?: string;
}

export const CompactTypingIndicator: React.FC<CompactTypingIndicatorProps> = ({
  count,
  className,
}) => {
  if (count === 0) return null;

  return (
    <div className={cn(
      'flex items-center space-x-1 py-1 px-2 bg-gray-100 rounded-full text-xs',
      className
    )}>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.1}s` }}
          />
        ))}
      </div>
      <span className="text-gray-600">
        {count} typing
      </span>
    </div>
  );
};

export default TypingIndicator;