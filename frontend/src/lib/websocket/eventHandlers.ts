import { websocketClient } from './client';
import { useChatStore, useProjectStore, useUserStore, useSystemStore, useGlobalStore } from '../store';
import { 
  Message, 
  ChatSession, 
  Project, 
  User, 
  WebSocketEvent,
  SystemAlert,
  MemoryItem 
} from '../types';

export interface WebSocketEventHandler {
  eventType: string;
  handler: (data: any) => void;
  filters?: Record<string, any>;
}

class WebSocketEventManager {
  private eventHandlers: Map<string, WebSocketEventHandler[]> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeEventHandlers();
  }

  private initializeEventHandlers(): void {
    if (this.isInitialized) return;
    
    // Connection events
    this.registerEventHandler('connect', this.handleConnect.bind(this));
    this.registerEventHandler('disconnect', this.handleDisconnect.bind(this));
    this.registerEventHandler('connect_error', this.handleConnectError.bind(this));
    this.registerEventHandler('reconnect', this.handleReconnect.bind(this));
    this.registerEventHandler('reconnect_attempt', this.handleReconnectAttempt.bind(this));
    this.registerEventHandler('reconnect_failed', this.handleReconnectFailed.bind(this));

    // Authentication events
    this.registerEventHandler('authentication_success', this.handleAuthenticationSuccess.bind(this));
    this.registerEventHandler('authentication_failed', this.handleAuthenticationFailed.bind(this));
    this.registerEventHandler('token_expired', this.handleTokenExpired.bind(this));

    // Chat events
    this.registerEventHandler('message_received', this.handleMessageReceived.bind(this));
    this.registerEventHandler('message_sent', this.handleMessageSent.bind(this));
    this.registerEventHandler('message_updated', this.handleMessageUpdated.bind(this));
    this.registerEventHandler('message_deleted', this.handleMessageDeleted.bind(this));
    this.registerEventHandler('message_reaction_added', this.handleMessageReactionAdded.bind(this));
    this.registerEventHandler('message_reaction_removed', this.handleMessageReactionRemoved.bind(this));
    this.registerEventHandler('typing_start', this.handleTypingStart.bind(this));
    this.registerEventHandler('typing_stop', this.handleTypingStop.bind(this));

    // Session events
    this.registerEventHandler('session_created', this.handleSessionCreated.bind(this));
    this.registerEventHandler('session_updated', this.handleSessionUpdated.bind(this));
    this.registerEventHandler('session_deleted', this.handleSessionDeleted.bind(this));
    this.registerEventHandler('session_joined', this.handleSessionJoined.bind(this));
    this.registerEventHandler('session_left', this.handleSessionLeft.bind(this));
    this.registerEventHandler('session_archived', this.handleSessionArchived.bind(this));

    // Project events
    this.registerEventHandler('project_created', this.handleProjectCreated.bind(this));
    this.registerEventHandler('project_updated', this.handleProjectUpdated.bind(this));
    this.registerEventHandler('project_deleted', this.handleProjectDeleted.bind(this));
    this.registerEventHandler('project_archived', this.handleProjectArchived.bind(this));
    this.registerEventHandler('project_collaborator_added', this.handleProjectCollaboratorAdded.bind(this));
    this.registerEventHandler('project_collaborator_removed', this.handleProjectCollaboratorRemoved.bind(this));
    this.registerEventHandler('project_collaborator_updated', this.handleProjectCollaboratorUpdated.bind(this));

    // User events
    this.registerEventHandler('user_online', this.handleUserOnline.bind(this));
    this.registerEventHandler('user_offline', this.handleUserOffline.bind(this));
    this.registerEventHandler('user_updated', this.handleUserUpdated.bind(this));
    this.registerEventHandler('user_joined_project', this.handleUserJoinedProject.bind(this));
    this.registerEventHandler('user_left_project', this.handleUserLeftProject.bind(this));

    // Memory events
    this.registerEventHandler('memory_created', this.handleMemoryCreated.bind(this));
    this.registerEventHandler('memory_updated', this.handleMemoryUpdated.bind(this));
    this.registerEventHandler('memory_deleted', this.handleMemoryDeleted.bind(this));
    this.registerEventHandler('memory_context_updated', this.handleMemoryContextUpdated.bind(this));

    // System events
    this.registerEventHandler('system_status', this.handleSystemStatus.bind(this));
    this.registerEventHandler('system_alert', this.handleSystemAlert.bind(this));
    this.registerEventHandler('system_metrics', this.handleSystemMetrics.bind(this));
    this.registerEventHandler('error_occurred', this.handleErrorOccurred.bind(this));

    // AI events
    this.registerEventHandler('ai_processing_start', this.handleAIProcessingStart.bind(this));
    this.registerEventHandler('ai_processing_end', this.handleAIProcessingEnd.bind(this));
    this.registerEventHandler('ai_response_received', this.handleAIResponseReceived.bind(this));
    this.registerEventHandler('ai_error', this.handleAIError.bind(this));

    this.isInitialized = true;
  }

  // Event handler registration
  registerEventHandler(eventType: string, handler: (data: any) => void, filters?: Record<string, any>): string {
    const handlerId = `${eventType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }

    this.eventHandlers.get(eventType)!.push({
      eventType,
      handler,
      filters,
    });

    // Subscribe to WebSocket event
    if (websocketClient.isConnected()) {
      websocketClient.subscribe(eventType, handler, filters);
    }

    return handlerId;
  }

  unregisterEventHandler(handlerId: string): void {
    for (const [eventType, handlers] of this.eventHandlers.entries()) {
      const handlerIndex = handlers.findIndex(h => h.handlerId === handlerId);
      if (handlerIndex !== -1) {
        const handler = handlers[handlerIndex];
        handlers.splice(handlerIndex, 1);
        
        // Unsubscribe from WebSocket event
        if (websocketClient.isConnected()) {
          websocketClient.unsubscribe(handlerId);
        }
        
        break;
      }
    }
  }

  // Connection event handlers
  private handleConnect(data: any): void {
    const systemStore = useSystemStore.getState();
    const globalStore = useGlobalStore.getState();

    systemStore.setStatus('healthy');
    globalStore.setConnectionStatus(true);
    globalStore.clearError();

    console.log('WebSocket connected:', data);
  }

  private handleDisconnect(reason: string): void {
    const systemStore = useSystemStore.getState();
    const globalStore = useGlobalStore.getState();

    systemStore.setStatus('degraded');
    globalStore.setConnectionStatus(false);

    console.log('WebSocket disconnected:', reason);
  }

  private handleConnectError(error: any): void {
    const systemStore = useSystemStore.getState();
    const globalStore = useGlobalStore.getState();

    systemStore.setStatus('degraded');
    globalStore.setError(new Error('WebSocket connection failed'));

    console.error('WebSocket connection error:', error);
  }

  private handleReconnect(attempt: number): void {
    const systemStore = useSystemStore.getState();
    
    systemStore.setStatus('degraded');

    console.log('WebSocket reconnection attempt:', attempt);
  }

  private handleReconnectAttempt(attempt: number): void {
    console.log('WebSocket reconnection attempt:', attempt);
  }

  private handleReconnectFailed(): void {
    const systemStore = useSystemStore.getState();
    const globalStore = useGlobalStore.getState();

    systemStore.setStatus('down');
    globalStore.setError(new Error('WebSocket reconnection failed'));

    console.error('WebSocket reconnection failed');
  }

  // Authentication event handlers
  private handleAuthenticationSuccess(data: any): void {
    const systemStore = useSystemStore.getState();
    const userStore = useUserStore.getState();

    systemStore.setStatus('healthy');
    
    // Update user session if needed
    if (data.user && data.token) {
      userStore.updateSession({
        user: data.user,
        token: data.token,
        refreshToken: data.refreshToken,
        expiresAt: new Date(data.expiresAt),
      });
    }

    console.log('WebSocket authentication successful:', data);
  }

  private handleAuthenticationFailed(error: any): void {
    const systemStore = useSystemStore.getState();
    const globalStore = useGlobalStore.getState();

    systemStore.setStatus('degraded');
    globalStore.setError(new Error('WebSocket authentication failed'));

    console.error('WebSocket authentication failed:', error);
  }

  private handleTokenExpired(): void {
    const userStore = useUserStore.getState();
    const globalStore = useGlobalStore.getState();

    // Try to refresh token
    userStore.refreshSession().catch((error) => {
      globalStore.setError(new Error('Token refresh failed'));
      userStore.clearSession();
    });

    console.warn('WebSocket token expired');
  }

  // Chat event handlers
  private handleMessageReceived(message: Message): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === message.sessionId) {
      chatStore.addMessage(message);
    }

    console.log('Message received:', message);
  }

  private handleMessageSent(message: Message): void {
    const chatStore = useChatStore.getState();
    
    // Update message status to sent
    chatStore.updateMessage(message.id, { status: 'sent' as any });

    console.log('Message sent:', message);
  }

  private handleMessageUpdated(data: { messageId: string; updates: Partial<Message> }): void {
    const chatStore = useChatStore.getState();
    
    chatStore.updateMessage(data.messageId, data.updates);

    console.log('Message updated:', data);
  }

  private handleMessageDeleted(data: { messageId: string; sessionId: string }): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === data.sessionId) {
      chatStore.deleteMessage(data.messageId);
    }

    console.log('Message deleted:', data);
  }

  private handleMessageReactionAdded(data: { messageId: string; reaction: any }): void {
    const chatStore = useChatStore.getState();
    
    chatStore.addReaction(data.messageId, data.reaction.emoji);

    console.log('Message reaction added:', data);
  }

  private handleMessageReactionRemoved(data: { messageId: string; emoji: string }): void {
    const chatStore = useChatStore.getState();
    
    chatStore.removeReaction(data.messageId, data.emoji);

    console.log('Message reaction removed:', data);
  }

  private handleTypingStart(data: { sessionId: string; userId: string; user: User }): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === data.sessionId) {
      chatStore.setTyping(data.userId, data.user.name);
    }

    console.log('Typing started:', data);
  }

  private handleTypingStop(data: { sessionId: string; userId: string }): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === data.sessionId) {
      chatStore.clearTyping(data.userId);
    }

    console.log('Typing stopped:', data);
  }

  // Session event handlers
  private handleSessionCreated(session: ChatSession): void {
    const chatStore = useChatStore.getState();
    
    chatStore.addSession(session);

    console.log('Session created:', session);
  }

  private handleSessionUpdated(session: ChatSession): void {
    const chatStore = useChatStore.getState();
    
    chatStore.updateSession(session.id, session);

    console.log('Session updated:', session);
  }

  private handleSessionDeleted(data: { sessionId: string }): void {
    const chatStore = useChatStore.getState();
    
    chatStore.deleteSession(data.sessionId);

    console.log('Session deleted:', data);
  }

  private handleSessionJoined(data: { sessionId: string; participant: any }): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === data.sessionId) {
      chatStore.addParticipant(data.participant);
    }

    console.log('Session joined:', data);
  }

  private handleSessionLeft(data: { sessionId: string; userId: string }): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === data.sessionId) {
      chatStore.removeParticipant(data.userId);
    }

    console.log('Session left:', data);
  }

  private handleSessionArchived(data: { sessionId: string; isArchived: boolean }): void {
    const chatStore = useChatStore.getState();
    
    chatStore.updateSession(data.sessionId, { isArchived: data.isArchived });

    console.log('Session archived:', data);
  }

  // Project event handlers
  private handleProjectCreated(project: Project): void {
    const projectStore = useProjectStore.getState();
    
    projectStore.addProject(project);

    console.log('Project created:', project);
  }

  private handleProjectUpdated(project: Project): void {
    const projectStore = useProjectStore.getState();
    
    projectStore.updateProjectInList(project);

    console.log('Project updated:', project);
  }

  private handleProjectDeleted(data: { projectId: string }): void {
    const projectStore = useProjectStore.getState();
    
    projectStore.removeProjectFromList(data.projectId);

    console.log('Project deleted:', data);
  }

  private handleProjectArchived(data: { projectId: string; isArchived: boolean }): void {
    const projectStore = useProjectStore.getState();
    
    projectStore.updateProjectInList({ id: data.projectId, isArchived: data.isArchived } as any);

    console.log('Project archived:', data);
  }

  private handleProjectCollaboratorAdded(data: { projectId: string; collaborator: any }): void {
    const projectStore = useProjectStore.getState();
    
    projectStore.updateProjectCollaborators(data.projectId, [data.collaborator]);

    console.log('Project collaborator added:', data);
  }

  private handleProjectCollaboratorRemoved(data: { projectId: string; userId: string }): void {
    const projectStore = useProjectStore.getState();
    
    // This would need to be implemented in the project store
    console.log('Project collaborator removed:', data);
  }

  private handleProjectCollaboratorUpdated(data: { projectId: string; userId: string; role: string }): void {
    const projectStore = useProjectStore.getState();
    
    // This would need to be implemented in the project store
    console.log('Project collaborator updated:', data);
  }

  // User event handlers
  private handleUserOnline(data: { userId: string; user: User }): void {
    const chatStore = useChatStore.getState();
    
    // Update user online status in current session
    if (chatStore.currentSession) {
      chatStore.updateParticipantOnlineStatus(data.userId, true);
    }

    console.log('User online:', data);
  }

  private handleUserOffline(data: { userId: string }): void {
    const chatStore = useChatStore.getState();
    
    // Update user online status in current session
    if (chatStore.currentSession) {
      chatStore.updateParticipantOnlineStatus(data.userId, false);
    }

    console.log('User offline:', data);
  }

  private handleUserUpdated(user: User): void {
    const userStore = useUserStore.getState();
    
    userStore.updateUser(user);

    console.log('User updated:', user);
  }

  private handleUserJoinedProject(data: { projectId: string; userId: string; user: User }): void {
    const projectStore = useProjectStore.getState();
    
    // Update project collaborators
    console.log('User joined project:', data);
  }

  private handleUserLeftProject(data: { projectId: string; userId: string }): void {
    const projectStore = useProjectStore.getState();
    
    // Update project collaborators
    console.log('User left project:', data);
  }

  // Memory event handlers
  private handleMemoryCreated(memory: MemoryItem): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === memory.projectId) {
      chatStore.addMemoryItem(memory);
    }

    console.log('Memory created:', memory);
  }

  private handleMemoryUpdated(memory: MemoryItem): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === memory.projectId) {
      chatStore.updateMemoryItem(memory.id, memory);
    }

    console.log('Memory updated:', memory);
  }

  private handleMemoryDeleted(data: { memoryId: string; projectId: string }): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === data.projectId) {
      chatStore.removeMemoryItem(data.memoryId);
    }

    console.log('Memory deleted:', data);
  }

  private handleMemoryContextUpdated(data: { projectId: string; context: any }): void {
    const chatStore = useChatStore.getState();
    
    if (chatStore.currentSession?.id === data.projectId) {
      chatStore.updateMemoryContext(data.context);
    }

    console.log('Memory context updated:', data);
  }

  // System event handlers
  private handleSystemStatus(data: { service: string; status: string; details?: any }): void {
    const systemStore = useSystemStore.getState();
    
    systemStore.setStatus(data.status as any);

    console.log('System status:', data);
  }

  private handleSystemAlert(alert: SystemAlert): void {
    // Simplified - just log the alert
    console.log('System alert:', alert);
  }

  private handleSystemMetrics(data: any): void {
    // Simplified - just log the metrics
    console.log('System metrics:', data);
  }

  private handleErrorOccurred(error: any): void {
    const globalStore = useGlobalStore.getState();
    const systemStore = useSystemStore.getState();

    globalStore.setError(new Error(error.message || 'Unknown error'));
    systemStore.setStatus('degraded');

    console.error('Error occurred:', error);
  }

  // AI event handlers
  private handleAIProcessingStart(data: { sessionId: string; messageId: string }): void {
    const chatStore = useChatStore.getState();
    
    chatStore.setAIProcessing(data.messageId, true);

    console.log('AI processing started:', data);
  }

  private handleAIProcessingEnd(data: { sessionId: string; messageId: string; result: any }): void {
    const chatStore = useChatStore.getState();
    
    chatStore.setAIProcessing(data.messageId, false);

    console.log('AI processing ended:', data);
  }

  private handleAIResponseReceived(data: { messageId: string; response: any }): void {
    const chatStore = useChatStore.getState();
    
    // Update message with AI response
    chatStore.updateMessage(data.messageId, {
      content: data.response.content,
      metadata: data.response.metadata,
      status: 'processed' as any,
    });

    console.log('AI response received:', data);
  }

  private handleAIError(error: any): void {
    const chatStore = useChatStore.getState();
    const globalStore = useGlobalStore.getState();

    chatStore.setAIProcessing(error.messageId, false);
    globalStore.setError(new Error(error.message || 'AI processing error'));

    console.error('AI error:', error);
  }

  // Public methods
  subscribeToEvent(eventType: string, handler: (data: any) => void, filters?: Record<string, any>): string {
    return this.registerEventHandler(eventType, handler, filters);
  }

  unsubscribeFromEvent(handlerId: string): void {
    this.unregisterEventHandler(handlerId);
  }

  getEventHandlers(): WebSocketEventHandler[] {
    const handlers: WebSocketEventHandler[] = [];
    for (const eventHandlers of this.eventHandlers.values()) {
      handlers.push(...eventHandlers);
    }
    return handlers;
  }

  clearAllHandlers(): void {
    this.eventHandlers.clear();
    this.isInitialized = false;
    this.initializeEventHandlers();
  }
}

// Export singleton instance
export const webSocketEventManager = new WebSocketEventManager();

// Export convenience methods
export const {
  subscribeToEvent,
  unsubscribeFromEvent,
  getEventHandlers,
  clearAllHandlers,
} = webSocketEventManager;

// React hook for WebSocket event management
export function useWebSocketEvents() {
  return {
    subscribeToEvent,
    unsubscribeFromEvent,
    getEventHandlers,
    clearAllHandlers,
  };
}