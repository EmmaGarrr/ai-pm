"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Folder, User, Loader2, Check, RefreshCw, AlertCircle } from "lucide-react";

interface ChatMessageProps {
  sender: "user" | "ai";
  text: string;
  timestamp?: Date;
  status?: "sending" | "sent" | "error";
  isProcessing?: boolean;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  processingStage?: "thinking" | "analyzing" | "generating" | "completed";
}

export function ChatMessage({ 
  sender, 
  text, 
  timestamp, 
  status, 
  isProcessing, 
  isLoading, 
  error, 
  onRetry, 
  processingStage 
}: ChatMessageProps) {
  const isUser = sender === "user";
  const formatTime = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    if (isLoading || isProcessing) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    if (status === 'error') {
      return <AlertCircle className="h-3 w-3 text-red-500" />;
    }
    if (status === 'sent') {
      return <Check className="h-3 w-3" />;
    }
    return null;
  };

  const getProcessingText = () => {
    switch (processingStage) {
      case 'thinking':
        return 'AI is thinking...';
      case 'analyzing':
        return 'AI is analyzing context...';
      case 'generating':
        return 'AI is generating response...';
      default:
        return 'AI is processing...';
    }
  };

  const renderContent = () => {
    if (isLoading && sender === 'ai') {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{getProcessingText()}</span>
          </div>
          <div className="space-y-1">
            <div className="h-2 bg-muted rounded animate-pulse"></div>
            <div className="h-2 bg-muted rounded animate-pulse w-5/6"></div>
            <div className="h-2 bg-muted rounded animate-pulse w-4/6"></div>
          </div>
        </div>
      );
    }

    if (error && sender === 'ai') {
      return (
        <div className="space-y-2">
          <p className="text-sm text-red-600 dark:text-red-400">{text}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 text-sm text-primary"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          )}
        </div>
      );
    }

    return <p className="whitespace-pre-wrap">{text}</p>;
  };

  
  return (
    <div
      className={cn(
        "flex items-start gap-3 group",
        isUser ? "justify-end" : "justify-start",
        isLoading && "animate-pulse"
      )}
    >
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Folder className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[70%] rounded-lg p-3 text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-background border",
          (isLoading || isProcessing) && "opacity-90",
          error && "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
        )}
      >
        <div>
          {renderContent()}
        </div>
        {(timestamp || status || isProcessing || isLoading) && (
          <div className={cn(
            "flex items-center gap-1 mt-1 text-xs",
            isUser ? "text-primary-foreground/70" : "text-muted-foreground"
          )}>
            {formatTime(timestamp)}
            {getStatusIcon()}
          </div>
        )}
      </div>
      {isUser && (
        <Avatar className="h-8 w-8">
           <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>
            <User className="h-5 w-5" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}