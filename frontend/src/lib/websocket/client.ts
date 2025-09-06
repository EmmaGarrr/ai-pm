// Using native WebSocket API instead of socket.io for FastAPI compatibility
import React from 'react';
import { useGlobalStore, useUserStore, useSystemStore } from '../store';

interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  timeout?: number;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  maxReconnectionAttempts?: number;
}

interface ConnectionEvent {
  type: 'connect' | 'disconnect' | 'connect_error' | 'reconnect' | 'reconnect_attempt' | 'reconnect_error' | 'reconnect_failed';
  data?: any;
}

interface Subscription {
  id: string;
  event: string;
  callback: (data: any) => void;
  filters?: Record<string, any>;
}

class WebSocketClient {
  private socket: WebSocket | null = null;
  private options: WebSocketOptions;
  private reconnectAttempts = 0;
  private isConnecting = false;
  private subscriptions: Map<string, Subscription> = new Map();
  private eventQueue: Array<{ event: string; data: any }> = [];
  private connectionPromise: Promise<void> | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPong = Date.now();
  private callbacks: {
    onConnectionStatusChange?: (connected: boolean) => void;
    onSystemStatusChange?: (status: string) => void;
    onError?: (error: Error) => void;
  } = {};

  constructor(options: WebSocketOptions = {}) {
    this.options = {
      url: process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/api/websocket/ws',
      autoConnect: false,
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      maxReconnectionAttempts: 5,
      ...options,
    };
  }

  async connect(options?: Partial<WebSocketOptions>): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    this.isConnecting = true;
    const mergedOptions = { ...this.options, ...options };

    try {
      this.connectionPromise = new Promise<void>((resolve, reject) => {
        // Create WebSocket instance
        this.socket = new WebSocket(mergedOptions.url!);

        this.setupEventHandlers(resolve, reject);
      });

      await this.connectionPromise;
      this.startHeartbeat();
      
      // Process queued events
      this.processEventQueue();
      
    } catch (error) {
      this.isConnecting = false;
      throw error;
    }
  }

  private setupEventHandlers(
    resolve: () => void,
    reject: (error: Error) => void
  ): void {
    if (!this.socket) return;

    // Connection events
    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.isConnecting = false;
      this.reconnectAttempts = 0;
      this.updateConnectionStatus(true);
      this.authenticate();
      resolve();
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event.code, event.reason);
      this.isConnecting = false;
      this.updateConnectionStatus(false);
      this.stopHeartbeat();
      this.handleReconnection();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      this.isConnecting = false;
      this.handleWebSocketError(new Error('WebSocket connection error'));
      reject(new Error('WebSocket connection error'));
    };

    // Message events
    this.socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.handleMessage(data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };
  }

  private handleMessage(data: any): void {
    const type = data.type;
    
    switch (type) {
      case 'connection_established':
        console.log('WebSocket connection established:', data.connection_id);
        this.updateSystemStatus('websocketService', 'healthy');
        break;
        
      case 'pong':
        this.lastPong = Date.now();
        break;
        
      case 'authentication_success':
        console.log('WebSocket authenticated:', data);
        this.updateSystemStatus('websocketService', 'healthy');
        break;
        
      case 'authentication_failed':
        console.error('WebSocket authentication failed:', data);
        this.updateSystemStatus('websocketService', 'degraded');
        break;
        
      case 'error':
        console.error('WebSocket error from server:', data.message);
        this.handleWebSocketError(new Error(data.message));
        break;
        
      default:
        // Handle custom events through subscriptions
        this.handleSubscriptionEvent(type, data);
        break;
    }
  }

  private handleSubscriptionEvent(eventType: string, data: any): void {
    // Find subscriptions that match this event type
    this.subscriptions.forEach((subscription) => {
      if (subscription.event === eventType) {
        // Check if filters match
        let shouldTrigger = true;
        if (subscription.filters) {
          for (const [key, value] of Object.entries(subscription.filters)) {
            if (data[key] !== value) {
              shouldTrigger = false;
              break;
            }
          }
        }
        
        if (shouldTrigger) {
          subscription.callback(data);
        }
      }
    });
  }

  private async authenticate(): Promise<void> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return;

    // Get token from localStorage or other secure storage
    const token = localStorage.getItem('auth_token') || 
                  sessionStorage.getItem('auth_token');

    if (token) {
      this.socket.send(JSON.stringify({
        type: 'authenticate',
        token,
        timestamp: Date.now(),
      }));
    }
  }

  private handleReconnection(): void {
    const maxAttempts = this.options.maxReconnectionAttempts || 5;
    
    if (this.reconnectAttempts >= maxAttempts) {
      console.error('Max reconnection attempts reached');
      this.updateSystemStatus('websocketService', 'down');
      return;
    }

    const delay = Math.min(
      (this.options.reconnectionDelay || 1000) * Math.pow(2, this.reconnectAttempts - 1),
      this.options.reconnectionDelayMax || 5000
    );

    console.log(`Attempting to reconnect in ${delay}ms... (${this.reconnectAttempts}/${maxAttempts})`);

    setTimeout(() => {
      if (!this.isConnected()) {
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private updateConnectionStatus(connected: boolean, reconnecting = false): void {
    if (this.callbacks.onConnectionStatusChange) {
      this.callbacks.onConnectionStatusChange(connected);
    }
  }

  private updateSystemStatus(service: string, status: 'healthy' | 'degraded' | 'down'): void {
    if (this.callbacks.onSystemStatusChange) {
      this.callbacks.onSystemStatusChange(status);
    }
  }

  private handleWebSocketError(error: any): void {
    if (this.callbacks.onError) {
      this.callbacks.onError(new Error(error.message || 'WebSocket error'));
    }
    if (this.callbacks.onSystemStatusChange) {
      this.callbacks.onSystemStatusChange('degraded');
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify({
          type: 'ping',
          timestamp: Date.now(),
        }));
        
        // Check for missed pongs
        const now = Date.now();
        if (now - this.lastPong > 30000) { // 30 seconds timeout
          console.warn('WebSocket heartbeat timeout');
          this.socket.close();
          this.handleReconnection();
        }
      }
    }, 10000); // Send ping every 10 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private processEventQueue(): void {
    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      if (event) {
        this.emit(event.event, event.data);
      }
    }
  }

  // Public methods
  emit(event: string, data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({
        type: event,
        ...data,
        timestamp: Date.now(),
      }));
    } else {
      // Queue event for when connection is restored
      this.eventQueue.push({ event, data });
    }
  }

  subscribe(event: string, callback: (data: any) => void, filters?: Record<string, any>): string {
    const subscriptionId = `${event}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.subscriptions.set(subscriptionId, {
      id: subscriptionId,
      event,
      callback,
      filters,
    });

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      // Send subscription request to server
      this.socket.send(JSON.stringify({
        type: 'subscribe',
        event,
        filters,
        subscriptionId,
      }));
    }

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (subscription) {
      this.subscriptions.delete(subscriptionId);
      
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        // Send unsubscription request to server
        this.socket.send(JSON.stringify({
          type: 'unsubscribe',
          event: subscription.event,
          subscriptionId,
        }));
      }
    }
  }

  unsubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      this.unsubscribe(subscription.id);
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    
    this.updateConnectionStatus(false);
    this.subscriptions.clear();
    this.eventQueue.length = 0;
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN || false;
  }

  isReconnecting(): boolean {
    return this.isConnecting || this.reconnectAttempts > 0;
  }

  getConnectionInfo(): {
    connected: boolean;
    reconnecting: boolean;
    reconnectAttempts: number;
    subscriptions: number;
    queuedEvents: number;
  } {
    return {
      connected: this.isConnected(),
      reconnecting: this.isReconnecting(),
      reconnectAttempts: this.reconnectAttempts,
      subscriptions: this.subscriptions.size,
      queuedEvents: this.eventQueue.length,
    };
  }

  // Project-specific methods
  joinProject(projectId: string): void {
    this.emit('join_project', { projectId });
  }

  leaveProject(projectId: string): void {
    this.emit('leave_project', { projectId });
  }

  subscribeToProject(projectId: string, events: string[]): void {
    this.emit('subscribe_project', { projectId, events });
  }

  unsubscribeFromProject(projectId: string, events: string[]): void {
    this.emit('unsubscribe_project', { projectId, events });
  }

  // Chat-specific methods
  joinSession(sessionId: string): void {
    this.emit('join_session', { sessionId });
  }

  leaveSession(sessionId: string): void {
    this.emit('leave_session', { sessionId });
  }

  sendTypingIndicator(sessionId: string, isTyping: boolean): void {
    this.emit('typing', { sessionId, isTyping });
  }

  // Utility methods
  getSubscriptions(): Subscription[] {
    return Array.from(this.subscriptions.values());
  }

  hasSubscription(event: string): boolean {
    return Array.from(this.subscriptions.values()).some(sub => sub.event === event);
  }

  // Set up callbacks for React Context integration
  setCallbacks(callbacks: {
    onConnectionStatusChange?: (connected: boolean) => void;
    onSystemStatusChange?: (status: string) => void;
    onError?: (error: Error) => void;
  }): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  }

// Hook for React components
export const useWebSocket = () => {
  const globalStore = useGlobalStore();
  const systemStore = useSystemStore();
  const userStore = useUserStore();
  const [client] = React.useState(() => new WebSocketClient());

  // Set up callbacks when hook is used
  React.useEffect(() => {
    client.setCallbacks({
      onConnectionStatusChange: globalStore.setConnectionStatus,
      onSystemStatusChange: systemStore.setStatus,
      onError: globalStore.setError,
    });
  }, [client, globalStore.setConnectionStatus, systemStore.setStatus, globalStore.setError]);

  return {
    connected: globalStore.isConnected,
    reconnecting: false, // Simplified for unified store
    reconnectAttempts: 0, // Simplified for unified store
    connectionInfo: client.getConnectionInfo(),
    connect: client.connect.bind(client),
    disconnect: client.disconnect.bind(client),
    subscribe: client.subscribe.bind(client),
    unsubscribe: client.unsubscribe.bind(client),
    emit: client.emit.bind(client),
    joinProject: client.joinProject.bind(client),
    leaveProject: client.leaveProject.bind(client),
    joinSession: client.joinSession.bind(client),
    leaveSession: client.leaveSession.bind(client),
    sendTypingIndicator: client.sendTypingIndicator.bind(client),
  };
};

// Export singleton instance
export const websocketClient = new WebSocketClient();

// Export types
export type { WebSocketOptions, ConnectionEvent, Subscription };