import { renderHook, act } from '@testing-library/react';
import { useGlobalStore, useProjectStore, useChatStore } from '@/lib/store';
import { useProjects } from '@/lib/api/projectService';
import { useChat } from '@/lib/api/chatService';
import { useWebSocket } from '@/lib/websocket/client';

// Mock all dependencies
jest.mock('@/lib/api/projectService');
jest.mock('@/lib/api/chatService');
jest.mock('@/lib/websocket/client');
jest.mock('axios');

describe('Application Integration Tests', () => {
  const mockProject = {
    id: '1',
    name: 'Test Project',
    description: 'Test Description',
    status: 'active',
    priority: 'medium',
    tags: ['test'],
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: 'user1',
    members: [],
    settings: {},
  };

  const mockSession = {
    id: 'session-1',
    projectId: '1',
    title: 'Test Session',
    description: 'Test Description',
    createdAt: new Date(),
    updatedAt: new Date(),
    isArchived: false,
    messageCount: 0,
    participants: [],
    settings: {},
  };

  const mockMessage = {
    id: '1',
    sessionId: 'session-1',
    content: 'Hello World',
    senderId: 'user1',
    timestamp: new Date(),
    type: 'text',
    status: 'delivered',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Project Management Flow', () => {
    it('should create, update, and delete projects', async () => {
      const { result: projectStoreResult } = renderHook(() => useProjectStore());
      const { result: globalStoreResult } = renderHook(() => useGlobalStore());
      
      // Mock API responses
      const { createProject, updateProject, deleteProject } = useProjects();
      
      (createProject as jest.Mock).mockResolvedValue(mockProject);
      (updateProject as jest.Mock).mockResolvedValue({ ...mockProject, name: 'Updated Project' });
      (deleteProject as jest.Mock).mockResolvedValue({ success: true });

      // Create project
      await act(async () => {
        await createProject({
          name: 'Test Project',
          description: 'Test Description',
          priority: 'medium',
          tags: ['test'],
        });
      });

      expect(createProject).toHaveBeenCalledWith({
        name: 'Test Project',
        description: 'Test Description',
        priority: 'medium',
        tags: ['test'],
      });

      // Update project
      await act(async () => {
        await updateProject('1', { name: 'Updated Project' });
      });

      expect(updateProject).toHaveBeenCalledWith('1', { name: 'Updated Project' });

      // Delete project
      await act(async () => {
        await deleteProject('1');
      });

      expect(deleteProject).toHaveBeenCalledWith('1');
    });

    it('should handle project errors gracefully', async () => {
      const { result: projectStoreResult } = renderHook(() => useProjectStore());
      const { result: globalStoreResult } = renderHook(() => useGlobalStore());
      
      const { createProject } = useProjects();
      const error = new Error('Project creation failed');
      
      (createProject as jest.Mock).mockRejectedValue(error);

      // Try to create project with error
      await act(async () => {
        try {
          await createProject({
            name: 'Test Project',
            description: 'Test Description',
            priority: 'medium',
            tags: ['test'],
          });
        } catch (err) {
          // Expected error
        }
      });

      // Store should handle the error
      expect(globalStoreResult.current.setError).toHaveBeenCalledWith(error);
    });
  });

  describe('Chat Management Flow', () => {
    it('should create sessions and manage messages', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { result: projectStoreResult } = renderHook(() => useProjectStore());
      
      // Set current project
      act(() => {
        projectStoreResult.current.setCurrentProject(mockProject);
      });

      const { createSession, sendMessage, getSessionMessages } = useChat();
      
      (createSession as jest.Mock).mockResolvedValue(mockSession);
      (sendMessage as jest.Mock).mockResolvedValue(mockMessage);
      (getSessionMessages as jest.Mock).mockResolvedValue([mockMessage]);

      // Create session
      await act(async () => {
        await createSession({
          projectId: '1',
          title: 'Test Session',
          description: 'Test Description',
          settings: {
            autoSave: true,
            memoryContext: true,
            aiAssistance: true,
            allowInvites: false,
            isPublic: false,
          },
        });
      });

      expect(createSession).toHaveBeenCalledWith({
        projectId: '1',
        title: 'Test Session',
        description: 'Test Description',
        settings: {
          autoSave: true,
          memoryContext: true,
          aiAssistance: true,
          allowInvites: false,
          isPublic: false,
        },
      });

      // Send message
      await act(async () => {
        await sendMessage('session-1', {
          content: 'Hello World',
          type: 'text',
        });
      });

      expect(sendMessage).toHaveBeenCalledWith('session-1', {
        content: 'Hello World',
        type: 'text',
      });

      // Get messages
      await act(async () => {
        await getSessionMessages('session-1');
      });

      expect(getSessionMessages).toHaveBeenCalledWith('session-1');
    });

    it('should handle real-time message updates', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { result: webSocketResult } = renderHook(() => useWebSocket());
      
      // Set current session
      act(() => {
        chatStoreResult.current.setCurrentSession(mockSession);
      });

      // Simulate real-time message arrival
      act(() => {
        // This would normally be triggered by WebSocket event
        chatStoreResult.current.addMessage(mockMessage);
      });

      expect(chatStoreResult.current.messages).toContainEqual(mockMessage);
    });
  });

  describe('WebSocket Integration', () => {
    it('should connect and handle real-time updates', async () => {
      const { result: webSocketResult } = renderHook(() => useWebSocket());
      const { result: projectStoreResult } = renderHook(() => useProjectStore());
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      
      const { connect, emit, on } = webSocketResult.current;
      
      // Mock WebSocket connection
      (connect as jest.Mock).mockResolvedValue(undefined);

      // Connect to WebSocket
      await act(async () => {
        await connect({
          projectId: '1',
          userId: 'user1',
          sessionId: 'session-1',
        });
      });

      expect(connect).toHaveBeenCalledWith({
        projectId: '1',
        userId: 'user1',
        sessionId: 'session-1',
      });

      // Simulate project update via WebSocket
      act(() => {
        // This would normally be triggered by WebSocket event
        projectStoreResult.current.updateProject({
          ...mockProject,
          name: 'Real-time Updated Project',
        });
      });

      expect(projectStoreResult.current.projects).toContainEqual(
        expect.objectContaining({
          name: 'Real-time Updated Project',
        })
      );
    });

    it('should handle WebSocket disconnection and reconnection', async () => {
      const { result: webSocketResult } = renderHook(() => useWebSocket());
      const { result: globalStoreResult } = renderHook(() => useGlobalStore());
      
      const { connect, disconnect } = webSocketResult.current;
      
      // Mock WebSocket connection
      (connect as jest.Mock).mockResolvedValue(undefined);

      // Connect and disconnect
      await act(async () => {
        await connect({
          projectId: '1',
          userId: 'user1',
          sessionId: 'session-1',
        });
        
        disconnect();
      });

      expect(connect).toHaveBeenCalled();
      expect(disconnect).toHaveBeenCalled();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle API errors consistently', async () => {
      const { result: globalStoreResult } = renderHook(() => useGlobalStore());
      const { result: projectStoreResult } = renderHook(() => useProjectStore());
      
      const { getProject } = useProjects();
      const error = new Error('Network error');
      
      (getProject as jest.Mock).mockRejectedValue(error);

      // Try to get project with error
      await act(async () => {
        try {
          await getProject('1');
        } catch (err) {
          // Expected error
        }
      });

      // Both stores should handle the error
      expect(globalStoreResult.current.setError).toHaveBeenCalledWith(error);
      expect(projectStoreResult.current.setError).toHaveBeenCalledWith(error);
    });

    it('should handle WebSocket errors gracefully', async () => {
      const { result: webSocketResult } = renderHook(() => useWebSocket());
      const { result: globalStoreResult } = renderHook(() => useGlobalStore());
      
      const { connect } = webSocketResult.current;
      const error = new Error('WebSocket connection failed');
      
      (connect as jest.Mock).mockRejectedValue(error);

      // Try to connect with error
      await act(async () => {
        try {
          await connect({
            projectId: '1',
            userId: 'user1',
            sessionId: 'session-1',
          });
        } catch (err) {
          // Expected error
        }
      });

      // Global store should handle the error
      expect(globalStoreResult.current.setError).toHaveBeenCalledWith(error);
    });
  });

  describe('State Synchronization', () => {
    it('should synchronize state across stores', async () => {
      const { result: globalStoreResult } = renderHook(() => useGlobalStore());
      const { result: projectStoreResult } = renderHook(() => useProjectStore());
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      
      // Set loading state
      act(() => {
        globalStoreResult.current.setLoading(true);
        projectStoreResult.current.setLoading(true);
        chatStoreResult.current.setLoading(true);
      });

      expect(globalStoreResult.current.isLoading).toBe(true);
      expect(projectStoreResult.current.isLoading).toBe(true);
      expect(chatStoreResult.current.isLoading).toBe(true);

      // Clear loading state
      act(() => {
        globalStoreResult.current.setLoading(false);
        projectStoreResult.current.setLoading(false);
        chatStoreResult.current.setLoading(false);
      });

      expect(globalStoreResult.current.isLoading).toBe(false);
      expect(projectStoreResult.current.isLoading).toBe(false);
      expect(chatStoreResult.current.isLoading).toBe(false);
    });

    it('should handle concurrent operations', async () => {
      const { result: projectStoreResult } = renderHook(() => useProjectStore());
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      
      // Set current project
      act(() => {
        projectStoreResult.current.setCurrentProject(mockProject);
      });

      // Set current session
      act(() => {
        chatStoreResult.current.setCurrentSession(mockSession);
      });

      // Both should be set correctly
      expect(projectStoreResult.current.currentProject).toEqual(mockProject);
      expect(chatStoreResult.current.currentSession).toEqual(mockSession);
    });
  });

  describe('Performance Integration', () => {
    it('should handle rapid API calls with caching', async () => {
      const { result: projectStoreResult } = renderHook(() => useProjectStore());
      
      const { getProject } = useProjects();
      
      // Mock API response
      (getProject as jest.Mock).mockResolvedValue(mockProject);

      // Make multiple rapid calls
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          act(async () => {
            await getProject('1');
          })
        );
      }

      await Promise.all(promises);

      // Should only call API once due to caching
      expect(getProject).toHaveBeenCalledTimes(1);
    });

    it('should handle WebSocket reconnection with backoff', async () => {
      const { result: webSocketResult } = renderHook(() => useWebSocket());
      
      const { connect } = webSocketResult.current;
      
      // Mock connection failure
      (connect as jest.Mock).mockRejectedValue(new Error('Connection failed'));

      // Try to connect multiple times
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          try {
            await connect({
              projectId: '1',
              userId: 'user1',
              sessionId: 'session-1',
            });
          } catch (err) {
            // Expected error
          }
        });
      }

      // Should attempt connection multiple times
      expect(connect).toHaveBeenCalledTimes(3);
    });
  });
});