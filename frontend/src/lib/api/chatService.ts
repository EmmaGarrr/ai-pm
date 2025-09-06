import { apiClient } from './client';
import { useChatStore, useGlobalStore, useUserStore } from '../store';
import { 
  Message, 
  ChatSession, 
  SendMessageRequest, 
  MessageStatus, 
  MessageType,
  SessionParticipant,
  MemoryItem,
  MemoryType
} from '../types';

export interface ChatMessageRequest {
  sessionId: string;
  content: string;
  type?: MessageType;
  parentId?: string;
  attachments?: File[];
  metadata?: Record<string, any>;
}

export interface ChatSessionRequest {
  projectId: string;
  title: string;
  description?: string;
  settings?: {
    autoSave?: boolean;
    memoryContext?: boolean;
    aiAssistance?: boolean;
    allowInvites?: boolean;
    isPublic?: boolean;
    maxParticipants?: number;
  };
}

export interface UpdateSessionRequest {
  title?: string;
  description?: string;
  settings?: Partial<ChatSession['settings']>;
  isArchived?: boolean;
}

export interface MessageReactionRequest {
  emoji: string;
}

export interface ChatFilters {
  sessionId?: string;
  projectId?: string;
  userId?: string;
  type?: MessageType;
  status?: MessageStatus;
  dateRange?: {
    start: Date;
    end: Date;
  };
  search?: string;
}

export interface ChatStats {
  totalSessions: number;
  totalMessages: number;
  activeUsers: number;
  avgResponseTime: number;
  aiMessagesProcessed: number;
  memoryItemsCreated: number;
}

export interface TypingIndicator {
  sessionId: string;
  userId: string;
  isTyping: boolean;
  timestamp: Date;
}

class ChatService {
  // Session management
  async getSessions(projectId?: string, filters?: ChatFilters): Promise<ChatSession[]> {
    const params = new URLSearchParams({
      ...(projectId && { projectId }),
      ...(filters?.search && { search: filters.search }),
      ...(filters?.dateRange && {
        startDate: filters.dateRange.start.toISOString(),
        endDate: filters.dateRange.end.toISOString(),
      }),
    });

    return apiClient.get<ChatSession[]>(`/api/chat/sessions?${params}`);
  }

  async getSession(sessionId: string): Promise<ChatSession> {
    return apiClient.get<ChatSession>(`/api/chat/sessions/${sessionId}`);
  }

  async createSession(sessionData: ChatSessionRequest): Promise<ChatSession> {
    return apiClient.post<ChatSession>('/api/chat/sessions', sessionData);
  }

  async updateSession(sessionId: string, updates: UpdateSessionRequest): Promise<ChatSession> {
    return apiClient.put<ChatSession>(`/api/chat/sessions/${sessionId}`, updates);
  }

  async deleteSession(sessionId: string): Promise<void> {
    return apiClient.delete<void>(`/api/chat/sessions/${sessionId}`);
  }

  async archiveSession(sessionId: string): Promise<ChatSession> {
    return apiClient.put<ChatSession>(`/api/chat/sessions/${sessionId}/archive`);
  }

  async unarchiveSession(sessionId: string): Promise<ChatSession> {
    return apiClient.put<ChatSession>(`/api/chat/sessions/${sessionId}/unarchive`);
  }

  // Message management
  async getMessages(sessionId: string, filters?: ChatFilters): Promise<Message[]> {
    const params = new URLSearchParams({
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
      ...(filters?.dateRange && {
        startDate: filters.dateRange.start.toISOString(),
        endDate: filters.dateRange.end.toISOString(),
      }),
      ...(filters?.search && { search: filters.search }),
    });

    return apiClient.get<Message[]>(`/api/chat/sessions/${sessionId}/messages?${params}`);
  }

  async sendMessage(messageData: ChatMessageRequest): Promise<Message> {
    const formData = new FormData();
    formData.append('sessionId', messageData.sessionId);
    formData.append('content', messageData.content);
    formData.append('type', messageData.type || MessageType.USER);
    
    if (messageData.parentId) {
      formData.append('parentId', messageData.parentId);
    }

    if (messageData.attachments && messageData.attachments.length > 0) {
      messageData.attachments.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
    }

    if (messageData.metadata) {
      formData.append('metadata', JSON.stringify(messageData.metadata));
    }

    return apiClient.post<Message>('/api/chat/messages', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  async updateMessage(messageId: string, updates: {
    content?: string;
    status?: MessageStatus;
    metadata?: Record<string, any>;
  }): Promise<Message> {
    return apiClient.patch<Message>(`/api/chat/messages/${messageId}`, updates);
  }

  async deleteMessage(messageId: string): Promise<void> {
    return apiClient.delete<void>(`/api/chat/messages/${messageId}`);
  }

  async addReaction(messageId: string, reaction: MessageReactionRequest): Promise<void> {
    return apiClient.post<void>(`/api/chat/messages/${messageId}/reactions`, reaction);
  }

  async removeReaction(messageId: string, emoji: string): Promise<void> {
    return apiClient.delete<void>(`/api/chat/messages/${messageId}/reactions/${emoji}`);
  }

  // Participant management
  async getParticipants(sessionId: string): Promise<SessionParticipant[]> {
    return apiClient.get<SessionParticipant[]>(`/api/chat/sessions/${sessionId}/participants`);
  }

  async joinSession(sessionId: string): Promise<SessionParticipant> {
    return apiClient.post<SessionParticipant>(`/api/chat/sessions/${sessionId}/join`);
  }

  async leaveSession(sessionId: string): Promise<void> {
    return apiClient.post<void>(`/api/chat/sessions/${sessionId}/leave`);
  }

  async inviteParticipant(sessionId: string, email: string, role: string = 'participant'): Promise<SessionParticipant> {
    return apiClient.post<SessionParticipant>(`/api/chat/sessions/${sessionId}/invite`, { email, role });
  }

  async removeParticipant(sessionId: string, userId: string): Promise<void> {
    return apiClient.delete<void>(`/api/chat/sessions/${sessionId}/participants/${userId}`);
  }

  async updateParticipantRole(sessionId: string, userId: string, role: string): Promise<SessionParticipant> {
    return apiClient.put<SessionParticipant>(`/api/chat/sessions/${sessionId}/participants/${userId}`, { role });
  }

  // Typing indicators
  async sendTypingIndicator(sessionId: string, isTyping: boolean): Promise<void> {
    return apiClient.post<void>('/api/chat/typing', { sessionId, isTyping });
  }

  // Memory integration
  async getContextMemory(sessionId: string): Promise<MemoryItem[]> {
    return apiClient.get<MemoryItem[]>(`/api/chat/sessions/${sessionId}/memory`);
  }

  async addToMemory(sessionId: string, memoryData: {
    type: MemoryType;
    title: string;
    content: string;
    tags?: string[];
    context?: Record<string, any>;
  }): Promise<MemoryItem> {
    return apiClient.post<MemoryItem>(`/api/chat/sessions/${sessionId}/memory`, memoryData);
  }

  async searchMemory(sessionId: string, query: string): Promise<MemoryItem[]> {
    return apiClient.get<MemoryItem[]>(`/api/chat/sessions/${sessionId}/memory/search?q=${encodeURIComponent(query)}`);
  }

  // Analytics and stats
  async getChatStats(projectId?: string): Promise<ChatStats> {
    const params = projectId ? `?projectId=${projectId}` : '';
    return apiClient.get<ChatStats>(`/api/chat/stats${params}`);
  }

  async getSessionActivity(sessionId: string, limit = 50): Promise<Array<{
    id: string;
    type: string;
    message: string;
    timestamp: Date;
    user?: {
      id: string;
      name: string;
    };
  }>> {
    return apiClient.get<Array<{
      id: string;
      type: string;
      message: string;
      timestamp: Date;
      user?: {
        id: string;
        name: string;
      };
    }>>(`/api/chat/sessions/${sessionId}/activity?limit=${limit}`);
  }

  // Search and export
  async searchMessages(query: string, filters?: ChatFilters): Promise<Message[]> {
    const params = new URLSearchParams({
      q: query,
      ...(filters?.sessionId && { sessionId: filters.sessionId }),
      ...(filters?.projectId && { projectId: filters.projectId }),
      ...(filters?.userId && { userId: filters.userId }),
      ...(filters?.type && { type: filters.type }),
      ...(filters?.status && { status: filters.status }),
    });

    return apiClient.get<Message[]>(`/api/chat/messages/search?${params}`);
  }

  async exportSession(sessionId: string, format: 'json' | 'csv' | 'pdf' = 'json'): Promise<Blob> {
    return apiClient.get<Blob>(`/api/chat/sessions/${sessionId}/export?format=${format}`, {
      responseType: 'blob',
    });
  }

  // React hook for chat operations
  static useChat() {
    const chatStore = useChatStore();
    const globalStore = useGlobalStore();
    const userStore = useUserStore();

    const loadSessions = async (projectId?: string, filters?: ChatFilters) => {
      globalStore.setLoading(true);
      try {
        await chatStore.fetchSessions(projectId, filters);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to load sessions'));
      } finally {
        globalStore.setLoading(false);
      }
    };

    const loadMessages = async (sessionId: string, filters?: ChatFilters) => {
      globalStore.setLoading(true);
      try {
        await chatStore.fetchMessages(sessionId, filters);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to load messages'));
      } finally {
        globalStore.setLoading(false);
      }
    };

    const sendMessage = async (messageData: ChatMessageRequest) => {
      try {
        await chatStore.sendMessage(messageData);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to send message'));
        throw error;
      }
    };

    const createSession = async (sessionData: ChatSessionRequest) => {
      globalStore.setLoading(true);
      try {
        await chatStore.createSession(sessionData);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to create session'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    const updateSession = async (sessionId: string, updates: UpdateSessionRequest) => {
      globalStore.setLoading(true);
      try {
        await chatStore.updateSession(sessionId, updates);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to update session'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    const deleteSession = async (sessionId: string) => {
      globalStore.setLoading(true);
      try {
        await chatStore.deleteSession(sessionId);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to delete session'));
        throw error;
      } finally {
        globalStore.setLoading(false);
      }
    };

    const setCurrentSession = (session: ChatSession | null) => {
      chatStore.setCurrentSession(session);
    };

    const addReaction = async (messageId: string, emoji: string) => {
      try {
        await chatStore.addReaction(messageId, emoji);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to add reaction'));
        throw error;
      }
    };

    const removeReaction = async (messageId: string, emoji: string) => {
      try {
        await chatStore.removeReaction(messageId, emoji);
      } catch (error) {
        globalStore.setError(error instanceof Error ? error : new Error('Failed to remove reaction'));
        throw error;
      }
    };

    return {
      // State
      sessions: chatStore.sessions,
      currentSession: chatStore.currentSession,
      messages: chatStore.messages,
      isLoading: chatStore.isLoading,
      error: chatStore.error,
      isTyping: chatStore.isTyping,
      typingUsers: chatStore.typingUsers,
      
      // Actions
      loadSessions,
      loadMessages,
      sendMessage,
      createSession,
      updateSession,
      deleteSession,
      setCurrentSession,
      addReaction,
      removeReaction,
      updateMessage: chatStore.updateMessage,
      deleteMessage: chatStore.deleteMessage,
      setTyping: chatStore.setTyping,
      clearTyping: chatStore.clearTyping,
      joinSession: chatStore.joinSession,
      leaveSession: chatStore.leaveSession,
      getSessions: chatStore.getSessions,
      getSessionMessages: chatStore.getSessionMessages,
    };
  }
}

// Export singleton instance
export const chatService = new ChatService();

// Export convenience methods
export const {
  getSessions,
  getSession,
  createSession: createSessionAPI,
  updateSession: updateSessionAPI,
  deleteSession: deleteSessionAPI,
  archiveSession,
  unarchiveSession,
  getMessages,
  sendMessage: sendMessageAPI,
  updateMessage: updateMessageAPI,
  deleteMessage: deleteMessageAPI,
  addReaction: addReactionAPI,
  removeReaction: removeReactionAPI,
  getParticipants,
  joinSession: joinSessionAPI,
  leaveSession: leaveSessionAPI,
  inviteParticipant,
  removeParticipant,
  updateParticipantRole,
  sendTypingIndicator,
  getContextMemory,
  addToMemory,
  searchMemory,
  getChatStats,
  getSessionActivity,
  searchMessages,
  exportSession,
} = chatService;

// Export hook
export const useChat = ChatService.useChat;