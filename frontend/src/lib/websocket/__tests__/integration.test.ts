import { WebSocketClient } from '@/lib/websocket/client';
import { useWebSocket } from '@/lib/websocket/client';
import { renderHook, act } from '@testing-library/react';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    disconnected: true,
    id: 'test-socket-id',
  };
  
  return {
    io: jest.fn(() => mockSocket),
  };
});

// Mock store hooks
jest.mock('@/lib/store/globalStore', () => ({
  useGlobalStore: () => ({
    setConnectionStatus: jest.fn(),
    setError: jest.fn(),
  }),
}));

jest.mock('@/lib/store/systemStore', () => ({
  useSystemStore: () => ({
    updateConnectionStatus: jest.fn(),
    addSystemEvent: jest.fn(),
  }),
}));

describe('WebSocket Integration', () => {
  let webSocketClient: WebSocketClient;
  let mockSocket: any;

  beforeEach(() => {
    jest.clearAllMocks();
    webSocketClient = new WebSocketClient({
      url: 'ws://localhost:3000',
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
    });
    
    // Get the mock socket instance
    const { io } = require('socket.io-client');
    mockSocket = io();
  });

  describe('WebSocketClient', () => {
    describe('connection', () => {
      it('should connect to WebSocket server', async () => {
        await webSocketClient.connect();
        
        expect(mockSocket.connect).toHaveBeenCalled();
      });

      it('should handle connection events', async () => {
        const connectCallback = jest.fn();
        webSocketClient.on('connect', connectCallback);
        
        await webSocketClient.connect();
        
        // Simulate connection event
        const connectHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connect'
        )?.[1];
        
        if (connectHandler) {
          connectHandler();
        }
        
        expect(connectCallback).toHaveBeenCalled();
      });

      it('should handle disconnection events', async () => {
        const disconnectCallback = jest.fn();
        webSocketClient.on('disconnect', disconnectCallback);
        
        await webSocketClient.connect();
        
        // Simulate disconnection event
        const disconnectHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'disconnect'
        )?.[1];
        
        if (disconnectHandler) {
          disconnectHandler();
        }
        
        expect(disconnectCallback).toHaveBeenCalled();
      });

      it('should handle connection errors', async () => {
        const errorCallback = jest.fn();
        webSocketClient.on('connect_error', errorCallback);
        
        await webSocketClient.connect();
        
        // Simulate connection error
        const errorHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'connect_error'
        )?.[1];
        
        if (errorHandler) {
          errorHandler(new Error('Connection failed'));
        }
        
        expect(errorCallback).toHaveBeenCalled();
      });
    });

    describe('reconnection', () => {
      it('should attempt reconnection on disconnect', async () => {
        jest.useFakeTimers();
        
        await webSocketClient.connect();
        
        // Simulate disconnection
        const disconnectHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'disconnect'
        )?.[1];
        
        if (disconnectHandler) {
          disconnectHandler();
        }
        
        // Fast-forward timers
        act(() => {
          jest.advanceTimersByTime(1000);
        });
        
        expect(mockSocket.connect).toHaveBeenCalledTimes(2);
        
        jest.useRealTimers();
      });

      it('should stop reconnection after max attempts', async () => {
        jest.useFakeTimers();
        
        const client = new WebSocketClient({
          url: 'ws://localhost:3000',
          autoConnect: false,
          reconnection: true,
          reconnectionAttempts: 2,
          reconnectionDelay: 1000,
        });
        
        await client.connect();
        
        // Simulate multiple disconnections
        const disconnectHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'disconnect'
        )?.[1];
        
        if (disconnectHandler) {
          disconnectHandler();
          disconnectHandler();
          disconnectHandler();
        }
        
        // Fast-forward timers
        act(() => {
          jest.advanceTimersByTime(3000);
        });
        
        expect(mockSocket.connect).toHaveBeenCalledTimes(3); // Initial + 2 reconnections
        
        jest.useRealTimers();
      });
    });

    describe('event handling', () => {
      it('should emit events', async () => {
        await webSocketClient.connect();
        
        webSocketClient.emit('test-event', { data: 'test' });
        
        expect(mockSocket.emit).toHaveBeenCalledWith('test-event', { data: 'test' });
      });

      it('should listen for custom events', async () => {
        const callback = jest.fn();
        webSocketClient.on('custom-event', callback);
        
        await webSocketClient.connect();
        
        // Simulate custom event
        const customEventHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'custom-event'
        )?.[1];
        
        if (customEventHandler) {
          customEventHandler({ data: 'test' });
        }
        
        expect(callback).toHaveBeenCalledWith({ data: 'test' });
      });

      it('should remove event listeners', async () => {
        const callback = jest.fn();
        webSocketClient.on('custom-event', callback);
        
        await webSocketClient.connect();
        
        webSocketClient.off('custom-event', callback);
        
        expect(mockSocket.off).toHaveBeenCalledWith('custom-event', callback);
      });
    });

    describe('subscription management', () => {
      it('should manage subscriptions', async () => {
        await webSocketClient.connect();
        
        const subscription = webSocketClient.subscribe('project-updates', (data) => {
          console.log('Project update:', data);
        });
        
        expect(typeof subscription).toBe('object');
        expect(typeof subscription.unsubscribe).toBe('function');
        
        // Unsubscribe
        subscription.unsubscribe();
        
        expect(mockSocket.off).toHaveBeenCalled();
      });

      it('should handle subscription errors', async () => {
        await webSocketClient.connect();
        
        const errorCallback = jest.fn();
        webSocketClient.on('subscription-error', errorCallback);
        
        // Simulate subscription error
        const errorHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'subscription-error'
        )?.[1];
        
        if (errorHandler) {
          errorHandler({ subscription: 'project-updates', error: 'Invalid subscription' });
        }
        
        expect(errorCallback).toHaveBeenCalled();
      });
    });

    describe('heartbeat', () => {
      it('should send heartbeat pings', async () => {
        jest.useFakeTimers();
        
        await webSocketClient.connect();
        
        // Fast-forward timers
        act(() => {
          jest.advanceTimersByTime(30000); // 30 seconds
        });
        
        expect(mockSocket.emit).toHaveBeenCalledWith('heartbeat');
        
        jest.useRealTimers();
      });

      it('should handle heartbeat responses', async () => {
        const heartbeatCallback = jest.fn();
        webSocketClient.on('heartbeat-response', heartbeatCallback);
        
        await webSocketClient.connect();
        
        // Simulate heartbeat response
        const heartbeatHandler = mockSocket.on.mock.calls.find(
          ([event]) => event === 'heartbeat-response'
        )?.[1];
        
        if (heartbeatHandler) {
          heartbeatHandler({ timestamp: Date.now() });
        }
        
        expect(heartbeatCallback).toHaveBeenCalled();
      });
    });
  });

  describe('useWebSocket Hook', () => {
    it('should provide WebSocket client methods', () => {
      const { result } = renderHook(() => useWebSocket());
      
      expect(typeof result.current.connect).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.emit).toBe('function');
      expect(typeof result.current.on).toBe('function');
      expect(typeof result.current.off).toBe('function');
      expect(typeof result.current.subscribe).toBe('function');
      expect(typeof result.current.isConnected).toBe('boolean');
    });

    it('should manage connection state', () => {
      const { result } = renderHook(() => useWebSocket());
      
      expect(result.current.isConnected).toBe(false);
      
      // Connection state would be updated by actual WebSocket events
      // This is tested more thoroughly with React Testing Library
    });
  });

  describe('real-time features', () => {
    it('should handle real-time project updates', async () => {
      const projectUpdateCallback = jest.fn();
      webSocketClient.on('project-updated', projectUpdateCallback);
      
      await webSocketClient.connect();
      
      // Simulate project update
      const projectUpdateHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'project-updated'
      )?.[1];
      
      if (projectUpdateHandler) {
        projectUpdateHandler({
          projectId: '1',
          update: { name: 'Updated Project' },
          timestamp: Date.now(),
        });
      }
      
      expect(projectUpdateCallback).toHaveBeenCalledWith({
        projectId: '1',
        update: { name: 'Updated Project' },
        timestamp: Date.now(),
      });
    });

    it('should handle real-time chat messages', async () => {
      const messageCallback = jest.fn();
      webSocketClient.on('new-message', messageCallback);
      
      await webSocketClient.connect();
      
      // Simulate new message
      const messageHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'new-message'
      )?.[1];
      
      if (messageHandler) {
        messageHandler({
          id: '1',
          sessionId: 'session-1',
          content: 'Hello World',
          senderId: 'user-1',
          timestamp: Date.now(),
        });
      }
      
      expect(messageCallback).toHaveBeenCalledWith({
        id: '1',
        sessionId: 'session-1',
        content: 'Hello World',
        senderId: 'user-1',
        timestamp: Date.now(),
      });
    });

    it('should handle typing indicators', async () => {
      const typingCallback = jest.fn();
      webSocketClient.on('user-typing', typingCallback);
      
      await webSocketClient.connect();
      
      // Simulate typing indicator
      const typingHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'user-typing'
      )?.[1];
      
      if (typingHandler) {
        typingHandler({
          sessionId: 'session-1',
          userId: 'user-1',
          isTyping: true,
        });
      }
      
      expect(typingCallback).toHaveBeenCalledWith({
        sessionId: 'session-1',
        userId: 'user-1',
        isTyping: true,
      });
    });

    it('should handle user presence updates', async () => {
      const presenceCallback = jest.fn();
      webSocketClient.on('user-presence', presenceCallback);
      
      await webSocketClient.connect();
      
      // Simulate presence update
      const presenceHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'user-presence'
      )?.[1];
      
      if (presenceHandler) {
        presenceHandler({
          userId: 'user-1',
          status: 'online',
          lastSeen: Date.now(),
        });
      }
      
      expect(presenceCallback).toHaveBeenCalledWith({
        userId: 'user-1',
        status: 'online',
        lastSeen: Date.now(),
      });
    });
  });

  describe('error handling', () => {
    it('should handle connection timeouts', async () => {
      jest.useFakeTimers();
      
      const timeoutCallback = jest.fn();
      webSocketClient.on('connection-timeout', timeoutCallback);
      
      await webSocketClient.connect();
      
      // Simulate connection timeout
      act(() => {
        jest.advanceTimersByTime(10000); // 10 seconds
      });
      
      expect(timeoutCallback).toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should handle message send failures', async () => {
      const errorCallback = jest.fn();
      webSocketClient.on('message-send-failed', errorCallback);
      
      await webSocketClient.connect();
      
      // Simulate message send failure
      const errorHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'message-send-failed'
      )?.[1];
      
      if (errorHandler) {
        errorHandler({
          messageId: '1',
          error: 'Send failed',
        });
      }
      
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should handle subscription failures', async () => {
      const errorCallback = jest.fn();
      webSocketClient.on('subscription-failed', errorCallback);
      
      await webSocketClient.connect();
      
      // Simulate subscription failure
      const errorHandler = mockSocket.on.mock.calls.find(
        ([event]) => event === 'subscription-failed'
      )?.[1];
      
      if (errorHandler) {
        errorHandler({
          subscription: 'project-updates',
          error: 'Subscription failed',
        });
      }
      
      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('should cleanup resources on disconnect', async () => {
      await webSocketClient.connect();
      
      webSocketClient.disconnect();
      
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should cleanup all event listeners', async () => {
      await webSocketClient.connect();
      
      // Add some listeners
      webSocketClient.on('event1', jest.fn());
      webSocketClient.on('event2', jest.fn());
      
      webSocketClient.disconnect();
      
      expect(mockSocket.off).toHaveBeenCalledTimes(2);
    });

    it('should clear all subscriptions on disconnect', async () => {
      await webSocketClient.connect();
      
      // Add some subscriptions
      const subscription1 = webSocketClient.subscribe('topic1', jest.fn());
      const subscription2 = webSocketClient.subscribe('topic2', jest.fn());
      
      webSocketClient.disconnect();
      
      expect(mockSocket.off).toHaveBeenCalledTimes(2);
    });
  });
});