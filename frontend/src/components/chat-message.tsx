"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { Folder, User, Loader2, Check, CheckCheck } from "lucide-react";

interface ChatMessageProps {
  sender: "user" | "ai";
  text: string;
  timestamp?: Date;
  status?: string;
  isProcessing?: boolean;
}

export function ChatMessage({ sender, text, timestamp, status, isProcessing }: ChatMessageProps) {
  const isUser = sender === "user";
  const formatTime = (date?: Date) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusIcon = () => {
    if (isProcessing) {
      return <Loader2 className="h-3 w-3 animate-spin" />;
    }
    switch (status) {
      case 'sent':
        return <Check className="h-3 w-3" />;
      case 'delivered':
      case 'read':
        return <CheckCheck className="h-3 w-3" />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3",
        isUser ? "justify-end" : "justify-start"
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
            : "bg-background border"
        )}
      >
        <p className="whitespace-pre-wrap">{text}</p>
        {(timestamp || status || isProcessing) && (
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