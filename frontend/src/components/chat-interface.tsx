"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";
import { CornerDownLeft, Loader2 } from "lucide-react";
import { useChatStore, useProjectStore, useUserStore, useGlobalStore } from "@/lib/store";
import { useChat } from "@/lib/api/chatService";
import { useWebSocket } from "@/lib/websocket/client";
import { Message, MessageType } from "@/lib/types";

interface ChatInterfaceProps {
  projectId?: string;
  sessionId?: string;
}

export function ChatInterface({ projectId, sessionId }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout>();

  const chatStore = useChatStore();
  const projectStore = useProjectStore();
  const userStore = useUserStore();
  const globalStore = useGlobalStore();
  const { sendMessage } = useChat();
  const { emit, isConnected } = useWebSocket();

  const currentProject = projectStore.currentProject;
  const currentSession = chatStore.currentSession;
  const messages = chatStore.messages;
  const isLoading = chatStore.isLoading;
  const error = chatStore.error;
  const typingUsers = chatStore.typingUsers;

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load messages when session changes
  React.useEffect(() => {
    if (sessionId) {
      chatStore.setCurrentSession(chatStore.sessions.find(s => s.id === sessionId) || null);
    }
  }, [sessionId, chatStore.sessions]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    if (value.trim() && isConnected && currentSession) {
      setIsTyping(true);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Send typing indicator
      emit('typing', { sessionId: currentSession.id, isTyping: true });
      
      // Set timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        emit('typing', { sessionId: currentSession.id, isTyping: false });
      }, 1000);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !currentSession || !userStore.user) return;

    const messageContent = inputValue.trim();
    setInputValue("");
    setIsTyping(false);

    // Clear typing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      // Send message via API
      await sendMessage({
        sessionId: currentSession.id,
        content: messageContent,
        type: MessageType.USER,
      });

      // Send typing stop indicator
      emit('typing', { sessionId: currentSession.id, isTyping: false });

    } catch (error) {
      globalStore.setError(error instanceof Error ? error : new Error('Failed to send message'));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatMessageForDisplay = (message: Message) => {
    return {
      sender: message.type === MessageType.USER ? "user" : "ai",
      text: message.content,
      timestamp: message.createdAt,
      status: message.status,
      isProcessing: chatStore.aiProcessingStatus[message.id],
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading messages...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Messages</h3>
          <p className="text-gray-600 mb-4">{error.message || error.toString()}</p>
          <Button onClick={() => currentSession && chatStore.fetchMessages(currentSession.id)}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!currentSession) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Session</h3>
          <p className="text-gray-600">Select a session to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-muted/20">
      {/* Session Header */}
      <div className="p-4 border-b bg-background">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{currentSession.title}</h3>
            <p className="text-sm text-muted-foreground">
              {currentProject?.name || 'Project'} • {messages.length} messages
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {typingUsers.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </div>
            )}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="space-y-6">
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              {...formatMessageForDisplay(message)}
            />
          ))}
          
          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-sm">
                {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
              </span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t bg-background">
        <form onSubmit={handleSendMessage} className="relative">
          <Textarea
            placeholder="Ask me anything about this project..."
            className="pr-16 min-h-[48px] resize-none"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected || !userStore.isAuthenticated}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute top-1/2 right-3 transform -translate-y-1/2"
            disabled={!inputValue.trim() || !isConnected || !userStore.isAuthenticated}
          >
            <CornerDownLeft className="h-5 w-5" />
          </Button>
        </form>
        
        {!isConnected && (
          <div className="text-xs text-red-500 mt-1">
            Disconnected from server. Messages will be queued.
          </div>
        )}
        
        {!userStore.isAuthenticated && (
          <div className="text-xs text-red-500 mt-1">
            Please log in to send messages.
          </div>
        )}
      </div>
    </div>
  );
}