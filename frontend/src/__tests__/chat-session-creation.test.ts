import { renderHook, act } from '@testing-library/react';
import { useChatStore } from '@/lib/store';
import { useChat } from '@/lib/api/chatService';

// Mock the chat service
jest.mock('@/lib/api/chatService');

describe('Chat Session Creation Integration', () => {
  const mockProject = {
    id: 'test-project-id',
    name: 'Test Project',
    description: 'Test Description',
    status: 'active' as const,
    priority: 'medium' as const,
    progress: 0,
    tags: [],
    collaborators: [],
    settings: {
      autoSave: true,
      notifications: true,
      aiAssistance: true,
      memoryRetention: 30,
      allowCollaboration: true,
      isPublic: false,
    },
    isArchived: false,
    memoryItems: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession = {
    id: 'session-123',
    projectId: 'test-project-id',
    title: 'Test Session',
    description: 'Test Description',
    messages: [],
    participants: [],
    settings: {
      autoSave: true,
      memoryContext: true,
      aiAssistance: true,
      allowInvites: false,
      isPublic: false,
    },
    isArchived: false,
    lastActivityAt: new Date(),
    messageCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Session Creation Flow', () => {
    it('should create a new chat session successfully', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { createSession } = useChat();
      
      // Mock the API response
      (createSession as jest.Mock).mockResolvedValue(mockSession);

      // Test session creation
      await act(async () => {
        await createSession({
          projectId: 'test-project-id',
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

      // Verify the API was called with correct parameters
      expect(createSession).toHaveBeenCalledWith({
        projectId: 'test-project-id',
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

      // Verify the session was added to the store
      expect(chatStoreResult.current.sessions).toContainEqual(mockSession);
    });

    it('should handle session creation errors gracefully', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { createSession } = useChat();
      
      // Mock API error
      const error = new Error('Session creation failed');
      (createSession as jest.Mock).mockRejectedValue(error);

      // Test error handling
      await act(async () => {
        try {
          await createSession({
            projectId: 'test-project-id',
            title: 'Test Session',
            description: 'Test Description',
          });
        } catch (err) {
          // Expected error
        }
      });

      // Verify error state is set
      expect(chatStoreResult.current.error).toBe(error);
      expect(chatStoreResult.current.isLoading).toBe(false);
    });

    it('should update loading states during session creation', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { createSession } = useChat();
      
      // Mock API response with delay
      (createSession as jest.Mock).mockImplementation(() => {
        return new Promise(resolve => {
          setTimeout(() => resolve(mockSession), 100);
        });
      });

      // Test loading states
      let loadingPromise;
      await act(async () => {
        loadingPromise = createSession({
          projectId: 'test-project-id',
          title: 'Test Session',
          description: 'Test Description',
        });
        
        // Loading should be true during the operation
        expect(chatStoreResult.current.isLoading).toBe(true);
      });

      await loadingPromise;
      
      // Loading should be false after completion
      expect(chatStoreResult.current.isLoading).toBe(false);
    });

    it('should fetch sessions after creating a new session', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { createSession } = useChat();
      
      // Mock the API responses
      (createSession as jest.Mock).mockResolvedValue(mockSession);
      
      // Spy on fetchSessions
      const fetchSessionsSpy = jest.spyOn(chatStoreResult.current, 'fetchSessions');
      fetchSessionsSpy.mockResolvedValue([mockSession]);

      // Test session creation with fetch
      await act(async () => {
        await createSession({
          projectId: 'test-project-id',
          title: 'Test Session',
          description: 'Test Description',
        });
      });

      // Verify fetchSessions was called
      expect(fetchSessionsSpy).toHaveBeenCalledWith('test-project-id');
    });

    it('should validate session creation parameters', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { createSession } = useChat();
      
      // Mock the API response
      (createSession as jest.Mock).mockResolvedValue(mockSession);

      // Test with minimal valid parameters
      await act(async () => {
        await createSession({
          projectId: 'test-project-id',
          title: 'Test Session',
        });
      });

      // Verify the API was called
      expect(createSession).toHaveBeenCalledWith({
        projectId: 'test-project-id',
        title: 'Test Session',
      });

      // Verify the session was added to the store
      expect(chatStoreResult.current.sessions).toContainEqual(mockSession);
    });

    it('should handle empty session list initially', () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      
      // Verify initial state
      expect(chatStoreResult.current.sessions).toEqual([]);
      expect(chatStoreResult.current.currentSession).toBeNull();
      expect(chatStoreResult.current.isLoading).toBe(false);
      expect(chatStoreResult.current.error).toBeNull();
    });

    it('should set current session after creation', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { createSession } = useChat();
      
      // Mock the API response
      (createSession as jest.Mock).mockResolvedValue(mockSession);

      // Test session creation
      await act(async () => {
        await createSession({
          projectId: 'test-project-id',
          title: 'Test Session',
          description: 'Test Description',
        });
      });

      // Verify the session was set as current
      expect(chatStoreResult.current.currentSession).toEqual(mockSession);
    });
  });

  describe('Session Data Structure', () => {
    it('should create session with correct structure', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { createSession } = useChat();
      
      // Mock the API response
      (createSession as jest.Mock).mockResolvedValue(mockSession);

      // Test session creation
      await act(async () => {
        await createSession({
          projectId: 'test-project-id',
          title: 'Test Session',
          description: 'Test Description',
        });
      });

      // Verify session structure
      const session = chatStoreResult.current.sessions[0];
      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('projectId');
      expect(session).toHaveProperty('title');
      expect(session).toHaveProperty('description');
      expect(session).toHaveProperty('createdAt');
      expect(session).toHaveProperty('updatedAt');
      expect(session).toHaveProperty('settings');
      expect(session).toHaveProperty('isArchived');
      expect(session).toHaveProperty('messageCount');
      expect(session).toHaveProperty('participants');
      expect(session).toHaveProperty('messages');
    });

    it('should handle session with default settings', async () => {
      const { result: chatStoreResult } = renderHook(() => useChatStore());
      const { createSession } = useChat();
      
      const sessionWithDefaults = {
        ...mockSession,
        settings: {
          autoSave: true,
          memoryContext: true,
          aiAssistance: true,
          allowInvites: false,
          isPublic: false,
        },
      };

      // Mock the API response
      (createSession as jest.Mock).mockResolvedValue(sessionWithDefaults);

      // Test session creation without explicit settings
      await act(async () => {
        await createSession({
          projectId: 'test-project-id',
          title: 'Test Session',
          description: 'Test Description',
        });
      });

      // Verify default settings are applied
      const session = chatStoreResult.current.sessions[0];
      expect(session.settings.autoSave).toBe(true);
      expect(session.settings.memoryContext).toBe(true);
      expect(session.settings.aiAssistance).toBe(true);
      expect(session.settings.allowInvites).toBe(false);
      expect(session.settings.isPublic).toBe(false);
    });
  });
});