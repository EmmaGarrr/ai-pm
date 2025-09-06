"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatMessage } from "@/components/chat-message";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { CornerDownLeft, Loader2, Folder } from "lucide-react";
import { useChatStore, useProjectStore, useUserStore, useGlobalStore } from "@/lib/store";
import { useChat } from "@/lib/api/chatService";
import { useWebSocket } from "@/lib/websocket/client";
import { Message, MessageType, MessageStatus } from "@/lib/types";

interface ChatInterfaceProps {
  projectId?: string;
  sessionId?: string;
}

export function ChatInterface({ projectId, sessionId }: ChatInterfaceProps) {
  const [inputValue, setInputValue] = React.useState("");
  const [isTyping, setIsTyping] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const typingTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  const chatStore = useChatStore();
  const projectStore = useProjectStore();
  const userStore = useUserStore();
  const globalStore = useGlobalStore();
  const { sendMessage: chatServiceSendMessage } = useChat();
  const { emit, connected, connect } = useWebSocket();

  
  const currentProject = projectStore.currentProject;
  const currentSession = chatStore.currentSession;
  const messages = chatStore.messages;
  const isLoading = chatStore.chatLoading;
  const error = globalStore.error;
  const typingUsers = chatStore.typingUsers;

  // Auto-scroll to bottom
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  
  // Load messages when session changes
  React.useEffect(() => {
    if (sessionId) {
      const session = chatStore.sessions.find(s => s.id === sessionId);
      if (session) {
        chatStore.setCurrentSession(session);
        // Reset AI processing stage when switching sessions
        // This will be handled by the store initialization
      }
    }
  }, [sessionId, chatStore.sessions]);

  // Handle typing indicator
  const handleInputChange = (value: string) => {
    setInputValue(value);
    
    if (value.trim() && connected && currentSession) {
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
      await chatStore.sendMessage({
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
    const isAIProcessing = chatStore.aiProcessingStatus[message.id] || false;
    const isAIPlaceholder = message.id.startsWith('ai_temp_') && message.content === '';
    
    return {
      sender: message.type === MessageType.USER ? "user" : "ai" as "user" | "ai",
      text: message.content,
      timestamp: message.createdAt,
      status: message.status,
      isProcessing: isAIProcessing,
      isLoading: isAIProcessing || (isAIPlaceholder && chatStore.aiProcessingStage !== 'idle'),
      processingStage: chatStore.aiProcessingStage,
      error: message.status === 'failed' ? message.content : undefined,
      onRetry: message.status === 'failed' ? () => handleRetryMessage(message.id) : undefined,
    };
  };

  const handleRetryMessage = async (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (!message || message.type !== MessageType.USER) return;
      
      // Resend the message
      await chatStore.sendMessage({
        sessionId: message.sessionId,
        content: message.content,
        type: MessageType.USER,
      });
      
    } catch (error) {
      console.error('Failed to retry message:', error);
    }
  };

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

  // Show inline error message if there's an error
  const ErrorMessage = () => {
    if (!error) return null;
    return (
      <div className="flex items-center justify-center p-4 border-b bg-red-50 border-red-200">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="w-8 h-8 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-red-900 mb-1">Error Loading Messages</h3>
          <p className="text-xs text-red-700 mb-2">{error.message || error.toString()}</p>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => currentSession && chatStore.fetchMessages(currentSession.id)}
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  };

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
            {chatStore.aiProcessingStage !== 'idle' && (
              <div className="text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>
                    {chatStore.aiProcessingStage === 'thinking' && 'AI is thinking...'}
                    {chatStore.aiProcessingStage === 'analyzing' && 'AI is analyzing context...'}
                    {chatStore.aiProcessingStage === 'generating' && 'AI is generating response...'}
                    {chatStore.aiProcessingStage === 'error' && 'AI processing failed'}
                  </span>
                </div>
              </div>
            )}
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          {!connected && (
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => connect()}
            >
              Connect
            </Button>
          )}
          </div>
        </div>
      </div>
      
      {/* Error Message */}
      <ErrorMessage />

      {/* Messages Area */}
      <ScrollArea className="flex-1 p-4 md:p-6">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={message.id}
              className="transition-all duration-300 ease-in-out transform hover:scale-[1.01]"
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'both'
              }}
            >
              <ChatMessage
                {...formatMessageForDisplay(message as any)}
              />
            </div>
          ))}
          
          {/* AI Thinking Indicator */}
          {(chatStore.aiProcessingStage === 'thinking' || 
           chatStore.aiProcessingStage === 'analyzing' || 
           chatStore.aiProcessingStage === 'generating') &&
           messages.some(m => m.id.startsWith('ai_temp_') && m.content === '') && (
            <div className="flex items-start gap-3 transition-all duration-300 ease-in-out">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Folder className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="max-w-[70%] rounded-lg p-3 text-sm bg-muted border border-dashed animate-pulse">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>
                    {chatStore.aiProcessingStage === 'thinking' && 'AI is thinking...'}
                    {chatStore.aiProcessingStage === 'analyzing' && 'AI is analyzing context...'}
                    {chatStore.aiProcessingStage === 'generating' && 'AI is generating response...'}
                  </span>
                </div>
                <div className="mt-2 space-y-1">
                  <div className="h-2 bg-muted-foreground/20 rounded animate-pulse"></div>
                  <div className="h-2 bg-muted-foreground/20 rounded animate-pulse w-5/6"></div>
                  <div className="h-2 bg-muted-foreground/20 rounded animate-pulse w-4/6"></div>
                </div>
              </div>
            </div>
          )}
          
          {/* Typing indicators */}
          {typingUsers.length > 0 && (
            <div className="flex items-center space-x-2 text-muted-foreground transition-all duration-300 ease-in-out">
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
            disabled={!connected}
          />
          <Button
            type="submit"
            size="icon"
            className="absolute top-1/2 right-3 transform -translate-y-1/2"
            disabled={!inputValue.trim() || !connected}
          >
            <CornerDownLeft className="h-5 w-5" />
          </Button>
        </form>
        
        {!connected && (
          <div className="text-xs text-red-500 mt-1">
            Disconnected from server. Messages will be queued.
          </div>
        )}
        
        {/* Authentication warning hidden for development */}
        {/* {!userStore.isAuthenticated && (
          <div className="text-xs text-red-500 mt-1">
            Please log in to send messages.
          </div>
        )} */}
      </div>
    </div>
  );
}