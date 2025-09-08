"use client";

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { 
  User, 
  Project, 
  ChatSession, 
  Message, 
  MessageType, 
  MessageStatus,
  UserPreferences,
  NotificationSettings
} from '../types';

interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
}

interface Session {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  expiresAt: Date | null;
  isAuthenticated: boolean;
}



// Combined store state
interface AppState {
  // Global state
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  notifications: {
    enabled: boolean;
    sound: boolean;
    desktop: boolean;
  };
  debugMode: boolean;
  appVersion: string;
  
  // User state
  user: User | null;
  session: Session;
  authLoading: boolean;
  
  // Project state
  projects: Project[];
  currentProject: Project | null;
  projectsLoading: boolean;
  
  // Chat state
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  messages: Message[];
  chatLoading: boolean;
  typingUsers: string[];
  aiProcessingStatus: Record<string, boolean>;
  aiProcessingStage: 'idle' | 'thinking' | 'analyzing' | 'generating' | 'error' | 'completed';
  
  // System state
  status: string;
}

type AppAction =
  // Global actions
  | { type: 'SET_CONNECTION_STATUS'; payload: boolean }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_NOTIFICATIONS'; payload: Partial<AppState['notifications']> }
  | { type: 'TOGGLE_DEBUG_MODE' }
  | { type: 'SET_APP_VERSION'; payload: string }
  | { type: 'SET_SYSTEM_STATUS'; payload: string }
  
  // User actions
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_SESSION'; payload: Session }
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'CLEAR_SESSION' }
  
  // Project actions
  | { type: 'SET_PROJECTS'; payload: Project[] }
  | { type: 'SET_CURRENT_PROJECT'; payload: Project | null }
  | { type: 'SET_PROJECTS_LOADING'; payload: boolean }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; payload: Project }
  | { type: 'DELETE_PROJECT'; payload: string }
  
  // Chat actions
  | { type: 'SET_SESSIONS'; payload: ChatSession[] }
  | { type: 'SET_CURRENT_SESSION'; payload: ChatSession | null }
  | { type: 'SET_MESSAGES'; payload: Message[] }
  | { type: 'SET_CHAT_LOADING'; payload: boolean }
  | { type: 'SET_TYPING_USERS'; payload: string[] }
  | { type: 'SET_AI_PROCESSING_STATUS'; payload: Record<string, boolean> }
  | { type: 'SET_AI_PROCESSING_STAGE'; payload: 'idle' | 'thinking' | 'analyzing' | 'generating' | 'error' | 'completed' }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE'; payload: Message }
  | { type: 'UPDATE_MESSAGE_STATUS'; payload: { messageId: string; status: MessageStatus } }
  | { type: 'DELETE_MESSAGE'; payload: string }
  | { type: 'ADD_SESSION'; payload: ChatSession }
  | { type: 'UPDATE_SESSION'; payload: ChatSession }
  | { type: 'DELETE_SESSION'; payload: string };

const initialState: AppState = {
  // Global state
  isConnected: false,
  isLoading: false,
  error: null,
  sidebarOpen: true,
  theme: 'system',
  notifications: {
    enabled: true,
    sound: true,
    desktop: false,
  },
  debugMode: false,
  appVersion: '1.0.0',
  
  // User state
  user: {
    id: 'dev-user-1',
    email: 'dev@example.com',
    name: 'Developer User',
    avatar: undefined,
    preferences: {
      theme: 'system',
      notifications: {
        email: true,
        push: true,
        desktop: true,
        sound: true,
      },
      language: 'en',
      timezone: 'UTC',
      dateFormat: 'MM/DD/YYYY',
    },
    isActive: true,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  session: {
    user: {
      id: 'dev-user-1',
      email: 'dev@example.com',
      name: 'Developer User',
      avatar: undefined,
      preferences: {
        theme: 'system',
        notifications: {
          email: true,
          push: true,
          desktop: true,
          sound: true,
        },
        language: 'en',
        timezone: 'UTC',
        dateFormat: 'MM/DD/YYYY',
      },
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    token: 'dev-token-123',
    refreshToken: 'dev-refresh-token-123',
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
    isAuthenticated: true,
  },
  authLoading: false,
  
  // Project state
  projects: [],
  currentProject: null,
  projectsLoading: false,
  
  // Chat state
  sessions: [],
  currentSession: null,
  messages: [],
  chatLoading: false,
  typingUsers: [],
  aiProcessingStatus: {},
  aiProcessingStage: 'idle',
  
  // System state
  status: 'healthy',
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // Global actions
    case 'SET_CONNECTION_STATUS':
      return { ...state, isConnected: action.payload };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    
    case 'SET_SIDEBAR':
      return { ...state, sidebarOpen: action.payload };
    
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    
    case 'SET_NOTIFICATIONS':
      return {
        ...state,
        notifications: { ...state.notifications, ...action.payload },
      };
    
    case 'TOGGLE_DEBUG_MODE':
      return { ...state, debugMode: !state.debugMode };
    
    case 'SET_APP_VERSION':
      return { ...state, appVersion: action.payload };
    
    case 'SET_SYSTEM_STATUS':
      return { ...state, status: action.payload };
    
    // User actions
    case 'SET_USER':
      return { ...state, user: action.payload };
    
    case 'SET_SESSION':
      return { ...state, session: action.payload };
    
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload };
    
    case 'CLEAR_SESSION':
      return {
        ...state,
        user: {
          id: 'dev-user-1',
          email: 'dev@example.com',
          name: 'Developer User',
          avatar: undefined,
          preferences: {
            theme: 'system',
            notifications: {
              email: true,
              push: true,
              desktop: true,
              sound: true,
                          },
            language: 'en',
            timezone: 'UTC',
            dateFormat: 'MM/DD/YYYY',
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true,
          lastLoginAt: new Date(),
        },
        session: {
          user: {
            id: 'dev-user-1',
            email: 'dev@example.com',
            name: 'Developer User',
            avatar: undefined,
            preferences: {
              theme: 'system',
              notifications: {
                email: true,
                push: true,
                desktop: true,
                sound: true,
                              },
              language: 'en',
              timezone: 'UTC',
              dateFormat: 'MM/DD/YYYY',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            isActive: true,
            lastLoginAt: new Date(),
          },
          token: 'dev-token-123',
          refreshToken: 'dev-refresh-token-123',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          isAuthenticated: true,
        },
      };
    
    // Project actions
    case 'SET_PROJECTS':
      return { ...state, projects: action.payload };
    
    case 'SET_CURRENT_PROJECT':
      return { ...state, currentProject: action.payload };
    
    case 'SET_PROJECTS_LOADING':
      return { ...state, projectsLoading: action.payload };
    
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, action.payload] };
    
    case 'UPDATE_PROJECT':
      return {
        ...state,
        projects: state.projects.map(p =>
          p.id === action.payload.id ? action.payload : p
        ),
      };
    
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.payload),
        currentProject: state.currentProject?.id === action.payload ? null : state.currentProject,
      };
    
    // Chat actions
    case 'SET_SESSIONS':
      return { ...state, sessions: action.payload };
    
    case 'SET_CURRENT_SESSION':
      return { ...state, currentSession: action.payload };
    
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    
    case 'SET_CHAT_LOADING':
      return { ...state, chatLoading: action.payload };
    
    case 'SET_TYPING_USERS':
      return { ...state, typingUsers: action.payload };
    
    case 'SET_AI_PROCESSING_STATUS':
      return { ...state, aiProcessingStatus: action.payload };
    
    case 'SET_AI_PROCESSING_STAGE':
      return { ...state, aiProcessingStage: action.payload };
    
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    
    case 'UPDATE_MESSAGE':
      const updatedMessages = state.messages.map(m =>
        m.id === action.payload.id ? action.payload : m
      );
      return {
        ...state,
        messages: updatedMessages,
      };
    
    case 'UPDATE_MESSAGE_STATUS':
      return {
        ...state,
        messages: state.messages.map(m =>
          m.id === action.payload.messageId ? { ...m, status: action.payload.status } : m
        ),
      };
    
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(m => m.id !== action.payload),
      };
    
    case 'ADD_SESSION':
      return {
        ...state,
        sessions: [...state.sessions, action.payload],
      };
    
    case 'UPDATE_SESSION':
      return {
        ...state,
        sessions: state.sessions.map(s =>
          s.id === action.payload.id ? action.payload : s
        ),
        currentSession: state.currentSession?.id === action.payload.id ? action.payload : state.currentSession,
      };
    
    case 'DELETE_SESSION':
      return {
        ...state,
        sessions: state.sessions.filter(s => s.id !== action.payload),
        currentSession: state.currentSession?.id === action.payload ? null : state.currentSession,
      };
    
    case 'SET_SYSTEM_STATUS':
      return {
        ...state,
        status: action.payload,
      };
    
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

// Helper function to get session ID from URL
const getSessionIdFromURL = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('session') || urlParams.get('sessionId');
};

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load theme from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as AppState['theme'];
      if (savedTheme) {
        dispatch({ type: 'SET_THEME', payload: savedTheme });
      }
      
      const savedSidebar = localStorage.getItem('sidebarOpen');
      if (savedSidebar) {
        dispatch({ type: 'SET_SIDEBAR', payload: savedSidebar === 'true' });
      }
      
      // Load user session from localStorage
      const savedSession = localStorage.getItem('userSession');
      if (savedSession) {
        try {
          const sessionData = JSON.parse(savedSession);
          dispatch({ type: 'SET_SESSION', payload: sessionData });
        } catch (error) {
          console.error('Failed to parse saved session:', error);
        }
      }
      
      // Load current chat session and messages from backend
      const initializeChatFromBackend = async () => {
        try {
          const sessionId = getSessionIdFromURL();
          const projectId = state.currentProject?.id;
          
          if (sessionId && projectId) {
            console.log('Initializing chat from backend for session:', sessionId);
            
            // Call backend API directly
            const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/history/${projectId}?session_id=${sessionId}&limit=50`;
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            });
            
            if (response.ok) {
              const messages = await response.json();
              
              // Transform backend messages to frontend format
              const transformedMessages: Message[] = messages.map((msg: any) => ({
                id: msg.id,
                sessionId: sessionId,
                userId: state.user?.id || 'system',
                content: msg.content,
                type: msg.role === 'ai_pm' ? MessageType.AI : MessageType.USER,
                status: MessageStatus.DELIVERED,
                metadata: {
                  confidence: msg.ai_response?.confidence,
                  processingTime: msg.ai_response?.metadata?.processing_time,
                  instructions: msg.ai_response?.technical_instruction,
                  summary: msg.ai_response?.user_explanation,
                  model: msg.ai_response?.metadata?.model_info?.model_name,
                  verificationRequired: (msg.ai_response?.confidence || 1) < 0.7,
                },
                aiResponse: msg.ai_response ? {
                  userExplanation: msg.ai_response.user_explanation,
                  technicalInstructions: msg.ai_response.technical_instruction,
                  confidence: msg.ai_response.confidence,
                  metadata: msg.ai_response.metadata
                } : undefined,
                createdAt: new Date(msg.timestamp),
                updatedAt: new Date(msg.timestamp),
                isEdited: false,
                reactions: [],
              }));
              
              dispatch({ type: 'SET_MESSAGES', payload: transformedMessages });
              console.log('Loaded messages from backend:', transformedMessages.length);
            }
          }
        } catch (error) {
          console.error('Failed to initialize chat from backend:', error);
        }
      };

      // Initialize chat state from backend
      initializeChatFromBackend();
    }
  }, []);

  // Save theme to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', state.theme);
    }
  }, [state.theme]);

  // Save sidebar state to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpen', state.sidebarOpen.toString());
    }
  }, [state.sidebarOpen]);

  // Save session to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && state.session.isAuthenticated) {
      localStorage.setItem('userSession', JSON.stringify(state.session));
    } else if (typeof window !== 'undefined') {
      localStorage.removeItem('userSession');
    }
  }, [state.session]);

  // Current chat session is managed by backend, no localStorage needed
  useEffect(() => {
    if (state.currentSession) {
      console.log('Session updated:', state.currentSession.id);
    }
  }, [state.currentSession]);

  // Messages are managed by backend, no localStorage needed
  useEffect(() => {
    if (state.messages.length > 0) {
      console.log('Messages updated, count:', state.messages.length);
    }
  }, [state.messages]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

// Custom hooks for different parts of the state
export function useGlobalStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useGlobalStore must be used within an AppProvider');
  }
  
  const { state, dispatch } = context;
  
  return {
    // Global state
    isConnected: state.isConnected,
    isLoading: state.isLoading,
    error: state.error,
    sidebarOpen: state.sidebarOpen,
    theme: state.theme,
    notifications: state.notifications,
    debugMode: state.debugMode,
    appVersion: state.appVersion,
    
    // Global actions
    setError: (error: Error | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setConnectionStatus: (connected: boolean) => dispatch({ type: 'SET_CONNECTION_STATUS', payload: connected }),
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    setSidebar: (open: boolean) => dispatch({ type: 'SET_SIDEBAR', payload: open }),
    setTheme: (theme: 'light' | 'dark' | 'system') => dispatch({ type: 'SET_THEME', payload: theme }),
    setNotifications: (notifications: Partial<AppState['notifications']>) => 
      dispatch({ type: 'SET_NOTIFICATIONS', payload: notifications }),
    toggleDebugMode: () => dispatch({ type: 'TOGGLE_DEBUG_MODE' }),
    setAppVersion: (version: string) => dispatch({ type: 'SET_APP_VERSION', payload: version }),
  };
}

export function useUserStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useUserStore must be used within an AppProvider');
  }
  
  const { state, dispatch } = context;
  
  return {
    // User state
    user: state.user,
    session: state.session,
    authLoading: state.authLoading,
    isAuthenticated: state.session.isAuthenticated,
    
    // User actions
    setUser: (user: User | null) => dispatch({ type: 'SET_USER', payload: user }),
    setSession: (session: Session) => dispatch({ type: 'SET_SESSION', payload: session }),
    setAuthLoading: (loading: boolean) => dispatch({ type: 'SET_AUTH_LOADING', payload: loading }),
    clearSession: () => dispatch({ type: 'CLEAR_SESSION' }),
    
    // Helper methods
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
      // TODO: Implement actual login
      throw new Error('Login not implemented');
    },
    
    logout: () => {
      dispatch({ type: 'CLEAR_SESSION' });
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
    
    refreshSession: async (): Promise<string> => {
      // TODO: Implement actual token refresh
      throw new Error('Token refresh not implemented');
    },
  };
}

export function useProjectStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useProjectStore must be used within an AppProvider');
  }
  
  const { state, dispatch } = context;
  
  // API functions
  const fetchProjects = async () => {
    try {
      dispatch({ type: 'SET_PROJECTS_LOADING', payload: true });
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/projects/`);
      if (!response.ok) {
        throw new Error('Failed to fetch projects');
      }
      const projects = await response.json();
      dispatch({ type: 'SET_PROJECTS', payload: projects });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to fetch projects' });
      throw error;
    } finally {
      dispatch({ type: 'SET_PROJECTS_LOADING', payload: false });
    }
  };
  
  const createProject = async (projectData: { name: string; description: string; priority?: string }) => {
    try {
      dispatch({ type: 'SET_PROJECTS_LOADING', payload: true });
      
      // Prevent duplicate project creation by checking if a project with the same name already exists
      const existingProject = state.projects.find(p => 
        p.name.toLowerCase() === projectData.name.toLowerCase()
      );
      
      if (existingProject) {
        throw new Error('A project with this name already exists');
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/projects/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: projectData.name,
          description: projectData.description,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create project');
      }
      
      const newProject = await response.json();
      dispatch({ type: 'ADD_PROJECT', payload: newProject });
      return newProject;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to create project' });
      throw error;
    } finally {
      dispatch({ type: 'SET_PROJECTS_LOADING', payload: false });
    }
  };

  const getProject = async (projectId: string) => {
    try {
      dispatch({ type: 'SET_PROJECTS_LOADING', payload: true });
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/projects/${projectId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      const project = await response.json();
      dispatch({ type: 'SET_CURRENT_PROJECT', payload: project });
      return project;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error.message : 'Failed to fetch project' });
      throw error;
    } finally {
      dispatch({ type: 'SET_PROJECTS_LOADING', payload: false });
    }
  };
  
  return {
    // Project state
    projects: state.projects,
    currentProject: state.currentProject,
    projectsLoading: state.projectsLoading,
    isLoading: state.projectsLoading,
    error: state.error,
    
    // Project actions
    setProjects: (projects: Project[]) => dispatch({ type: 'SET_PROJECTS', payload: projects }),
    setCurrentProject: (project: Project | null) => dispatch({ type: 'SET_CURRENT_PROJECT', payload: project }),
    setProjectsLoading: (loading: boolean) => dispatch({ type: 'SET_PROJECTS_LOADING', payload: loading }),
    addProject: (project: Project) => dispatch({ type: 'ADD_PROJECT', payload: project }),
    updateProject: (project: Project) => dispatch({ type: 'UPDATE_PROJECT', payload: project }),
    deleteProject: (projectId: string) => dispatch({ type: 'DELETE_PROJECT', payload: projectId }),
    updateProjectInList: (project: Project) => dispatch({ type: 'UPDATE_PROJECT', payload: project }),
    removeProjectFromList: (projectId: string) => dispatch({ type: 'DELETE_PROJECT', payload: projectId }),
    clearCurrentProject: () => dispatch({ type: 'SET_CURRENT_PROJECT', payload: null }),
    
    // API functions
    fetchProjects,
    createProject,
    getProject,
  };
}

export function useChatStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useChatStore must be used within an AppProvider');
  }
  
  const { state, dispatch } = context;
  
  return {
    // Chat state
    sessions: state.sessions,
    currentSession: state.currentSession,
    messages: state.messages,
    chatLoading: state.chatLoading,
    typingUsers: state.typingUsers,
    aiProcessingStatus: state.aiProcessingStatus,
    
    // Chat actions
    setSessions: (sessions: ChatSession[]) => dispatch({ type: 'SET_SESSIONS', payload: sessions }),
    setCurrentSession: (session: ChatSession | null) => dispatch({ type: 'SET_CURRENT_SESSION', payload: session }),
    setMessages: (messages: Message[]) => dispatch({ type: 'SET_MESSAGES', payload: messages }),
    setChatLoading: (loading: boolean) => dispatch({ type: 'SET_CHAT_LOADING', payload: loading }),
    setTypingUsers: (users: string[]) => dispatch({ type: 'SET_TYPING_USERS', payload: users }),
    setAiProcessingStatus: (status: Record<string, boolean>) => dispatch({ type: 'SET_AI_PROCESSING_STATUS', payload: status }),
    setAiProcessingStage: (stage: 'idle' | 'thinking' | 'analyzing' | 'generating' | 'error' | 'completed') => dispatch({ type: 'SET_AI_PROCESSING_STAGE', payload: stage }),
    clearAiProcessingStatus: () => dispatch({ type: 'SET_AI_PROCESSING_STATUS', payload: {} }),
    addMessage: (message: Message) => dispatch({ type: 'ADD_MESSAGE', payload: message }),
    updateMessage: (message: Message) => dispatch({ type: 'UPDATE_MESSAGE', payload: message }),
    deleteMessage: (messageId: string) => dispatch({ type: 'DELETE_MESSAGE', payload: messageId }),
    clearCurrentSession: () => dispatch({ type: 'SET_CURRENT_SESSION', payload: null }),
    addSession: (session: ChatSession) => dispatch({ type: 'ADD_SESSION', payload: session }),
    updateSession: (session: ChatSession) => dispatch({ type: 'UPDATE_SESSION', payload: session }),
    deleteSession: (sessionId: string) => dispatch({ type: 'DELETE_SESSION', payload: sessionId }),
    
    // Helper methods
    fetchMessages: async (sessionId: string) => {
      try {
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });
        
        const currentProjectId = state.currentProject?.id;
        if (!currentProjectId) {
          throw new Error('No project selected');
        }
        
        const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/history/${currentProjectId}?session_id=${sessionId}&limit=50`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch messages');
        }
        
        const messages = await response.json();
        
        // Transform backend messages to frontend format
        let transformedMessages: Message[] = messages.map((msg: any) => ({
          id: msg.id,
          sessionId: sessionId,
          userId: state.user?.id || 'system',
          content: msg.content,
          type: msg.role === 'ai_pm' ? MessageType.AI : MessageType.USER,
          status: MessageStatus.DELIVERED,
          metadata: {
            confidence: msg.ai_response?.confidence,
            processingTime: msg.ai_response?.metadata?.processing_time,
            instructions: msg.ai_response?.technical_instruction,
            summary: msg.ai_response?.user_explanation,
            model: msg.ai_response?.metadata?.model_info?.model_name,
            verificationRequired: (msg.ai_response?.confidence || 1) < 0.7,
          },
          aiResponse: msg.ai_response ? {    // PRESERVE DUAL OUTPUT STRUCTURE
            userExplanation: msg.ai_response.user_explanation,
            technicalInstructions: msg.ai_response.technical_instruction,
            confidence: msg.ai_response.confidence,
            metadata: msg.ai_response.metadata
          } : undefined,
          createdAt: new Date(msg.timestamp),
          updatedAt: new Date(msg.timestamp),
          isEdited: false,
          reactions: [],
        }));
        
        // If backend returns empty messages, that's the authoritative state
        if (transformedMessages.length === 0) {
          console.log('No messages found for session:', sessionId);
          // No fallback to localStorage - backend is authoritative
        }
        
        dispatch({ type: 'SET_MESSAGES', payload: transformedMessages });
        return transformedMessages;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error : new Error('Failed to fetch messages') });
        throw error;
      } finally {
        dispatch({ type: 'SET_CHAT_LOADING', payload: false });
      }
    },
    
    sendMessage: async (message: Partial<Message>) => {
      try {
        const currentProjectId = state.currentProject?.id;
        const currentSessionId = state.currentSession?.id;
        
        if (!currentProjectId) {
          throw new Error('No project selected');
        }
        
        if (!currentSessionId) {
          throw new Error('No session selected');
        }
        
        if (!message.content) {
          throw new Error('Message content is required');
        }
        
        // Set AI processing stage to thinking immediately
        dispatch({ type: 'SET_AI_PROCESSING_STAGE', payload: 'thinking' });
        
        // Add user message to local state immediately
        const userMessage: Message = {
          id: `temp_${Date.now()}`,
          sessionId: currentSessionId,
          userId: state.user?.id || 'user',
          content: message.content,
          type: MessageType.USER,
          status: MessageStatus.SENDING,
          metadata: {},
          isEdited: false,
          reactions: [],
          attachments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        dispatch({ type: 'ADD_MESSAGE', payload: userMessage });
        
        // Add placeholder AI message with loading state
        const aiPlaceholderMessage: Message = {
          id: `ai_temp_${Date.now()}`,
          sessionId: currentSessionId,
          userId: 'ai_pm',
          content: '',
          type: MessageType.AI,
          status: MessageStatus.SENDING,
          metadata: {},
          isEdited: false,
          reactions: [],
          attachments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        dispatch({ type: 'ADD_MESSAGE', payload: aiPlaceholderMessage });
        
        // Set AI processing status for the placeholder message
        dispatch({ 
          type: 'SET_AI_PROCESSING_STATUS', 
          payload: { ...state.aiProcessingStatus, [aiPlaceholderMessage.id]: true }
        });
        
        // Update to analyzing stage
        dispatch({ type: 'SET_AI_PROCESSING_STAGE', payload: 'analyzing' });
        
        // Small delay to show the thinking stage
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Call the AI processing endpoint
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            project_id: currentProjectId,
            session_id: currentSessionId,
            user_message: message.content,
            context: {},
            require_verification: true,
          }),
        });
        
        // Update to generating stage
        dispatch({ type: 'SET_AI_PROCESSING_STAGE', payload: 'generating' });
        
        if (!response.ok) {
          // Update user message status to failed
          dispatch({ 
            type: 'UPDATE_MESSAGE_STATUS', 
            payload: { messageId: userMessage.id, status: MessageStatus.FAILED }
          });
          
          // Update AI placeholder to show error
          dispatch({ 
            type: 'UPDATE_MESSAGE', 
            payload: { 
              ...aiPlaceholderMessage,
              status: MessageStatus.FAILED,
              content: 'Failed to generate response. Please try again.',
            }
          });
          
          // Set AI processing stage to error
          dispatch({ type: 'SET_AI_PROCESSING_STAGE', payload: 'error' });
          
          // Clear AI processing status for the placeholder message
          const updatedStatus = { ...state.aiProcessingStatus };
          delete updatedStatus[aiPlaceholderMessage.id];
          dispatch({ 
            type: 'SET_AI_PROCESSING_STATUS', 
            payload: updatedStatus
          });
          
          // Reset AI processing stage after a delay
          setTimeout(() => {
            dispatch({ type: 'SET_AI_PROCESSING_STAGE', payload: 'idle' });
          }, 3000);
          
          throw new Error('Failed to send message');
        }
        
        const data = await response.json();
        
        // Update user message status to sent
        dispatch({ 
          type: 'UPDATE_MESSAGE_STATUS', 
          payload: { messageId: userMessage.id, status: MessageStatus.SENT }
        });
        
        // Add AI response if successful
        if (data.success && data.ai_response) {
          const aiMessage: Message = {
            id: data.ai_response.id,
            sessionId: currentSessionId,
            userId: 'ai_pm',
            content: `**User Explanation:**\n${data.ai_response.user_explanation}\n\n**Technical Instruction:**\n${data.ai_response.technical_instruction}`,
            type: MessageType.AI,
            status: MessageStatus.SENT,
            metadata: {
              confidence: data.ai_response.confidence,
              processingTime: data.ai_response.metadata?.processing_time,
              instructions: data.ai_response.technical_instruction,
              summary: data.ai_response.user_explanation,
              model: data.ai_response.metadata?.model_info?.model_name,
              verificationRequired: data.ai_response.confidence < 0.7,
              relatedIssues: data.ai_response.metadata?.memory_keys,
              dependencies: data.ai_response.metadata?.dependencies,
            },
            isEdited: false,
            reactions: [],
            attachments: [],
            createdAt: new Date(data.ai_response.timestamp),
            updatedAt: new Date(data.ai_response.timestamp),
          };
          
          // Update placeholder AI message with actual response content (keep the same ID)
          const updatedMessage = {
            ...aiPlaceholderMessage,
            content: `**User Explanation:**\n${data.ai_response.user_explanation}\n\n**Technical Instruction:**\n${data.ai_response.technical_instruction}`,
            status: MessageStatus.SENT,
            metadata: {
              confidence: data.ai_response.confidence,
              processingTime: data.ai_response.metadata?.processing_time,
              instructions: data.ai_response.technical_instruction,
              summary: data.ai_response.user_explanation,
              model: data.ai_response.metadata?.model_info?.model_name,
              verificationRequired: data.ai_response.confidence < 0.7,
              relatedIssues: data.ai_response.metadata?.memory_keys,
              dependencies: data.ai_response.metadata?.dependencies,
            },
            aiResponse: {    // ADD DUAL OUTPUT STRUCTURE
              userExplanation: data.ai_response.user_explanation,
              technicalInstructions: data.ai_response.technical_instruction,
              confidence: data.ai_response.confidence,
              metadata: data.ai_response.metadata
            },
            createdAt: new Date(data.ai_response.timestamp),
            updatedAt: new Date(data.ai_response.timestamp),
          };
          
                    
          dispatch({ 
            type: 'UPDATE_MESSAGE', 
            payload: updatedMessage
          });
          
          // Set AI processing stage to completed
          dispatch({ type: 'SET_AI_PROCESSING_STAGE', payload: 'completed' });
          
          // Clear AI processing status for the placeholder message
          const updatedStatus = { ...state.aiProcessingStatus };
          delete updatedStatus[aiPlaceholderMessage.id];
          dispatch({ 
            type: 'SET_AI_PROCESSING_STATUS', 
            payload: updatedStatus
          });
          
                    
          // Show notification for low confidence responses
          if (data.ai_response.confidence < 0.7) {
            dispatch({ 
              type: 'SET_NOTIFICATION', 
              payload: {
                type: 'warning',
                message: 'Low confidence response - please verify before proceeding',
                duration: 5000,
              }
            });
          }
          
          // Show notification if verification is required
          if (data.verification_required && data.verification_prompt) {
            dispatch({ 
              type: 'SET_NOTIFICATION', 
              payload: {
                type: 'info',
                message: 'Verification required for this response',
                duration: 5000,
              }
            });
          }
          
          // Reset AI processing stage after a short delay
          setTimeout(() => {
            dispatch({ type: 'SET_AI_PROCESSING_STAGE', payload: 'idle' });
          }, 1500);
          
          // Refresh messages from backend to get the authoritative state
          console.log('Refreshing messages from backend after sending...');
          
          // Call backend API directly to refresh messages
          const refreshUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/history/${currentProjectId}?session_id=${currentSessionId}&limit=50`;
          const refreshResponse = await fetch(refreshUrl, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (refreshResponse.ok) {
            const refreshedMessages = await refreshResponse.json();
            
            // Transform backend messages to frontend format
            const transformedRefreshedMessages: Message[] = refreshedMessages.map((msg: any) => ({
              id: msg.id,
              sessionId: currentSessionId,
              userId: state.user?.id || 'system',
              content: msg.content,
              type: msg.role === 'ai_pm' ? MessageType.AI : MessageType.USER,
              status: MessageStatus.DELIVERED,
              metadata: {
                confidence: msg.ai_response?.confidence,
                processingTime: msg.ai_response?.metadata?.processing_time,
                instructions: msg.ai_response?.technical_instruction,
                summary: msg.ai_response?.user_explanation,
                model: msg.ai_response?.metadata?.model_info?.model_name,
                verificationRequired: (msg.ai_response?.confidence || 1) < 0.7,
              },
              aiResponse: msg.ai_response ? {
                userExplanation: msg.ai_response.user_explanation,
                technicalInstructions: msg.ai_response.technical_instruction,
                confidence: msg.ai_response.confidence,
                metadata: msg.ai_response.metadata
              } : undefined,
              createdAt: new Date(msg.timestamp),
              updatedAt: new Date(msg.timestamp),
              isEdited: false,
              reactions: [],
            }));
            
            dispatch({ type: 'SET_MESSAGES', payload: transformedRefreshedMessages });
            console.log('Refreshed messages from backend:', transformedRefreshedMessages.length);
          }
        }
        
        return data;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error : new Error('Failed to send message') });
        throw error;
      }
    },

    createSession: async (projectId: string, sessionData: { title: string; description?: string }) => {
      try {
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/sessions/${projectId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: sessionData.title,
            description: sessionData.description,
          }),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create chat session');
        }
        
        const newSession = await response.json();
        
        // Transform the response to match ChatSession interface
        const chatSession: ChatSession = {
          id: newSession.session_id,
          projectId: projectId,
          title: newSession.title,
          description: newSession.description,
          createdAt: new Date(newSession.created_at),
          updatedAt: new Date(newSession.created_at),
          messageCount: 0,
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
          lastActivityAt: new Date(newSession.created_at),
        };
        
        dispatch({ type: 'ADD_SESSION', payload: chatSession });
        dispatch({ type: 'SET_CURRENT_SESSION', payload: chatSession });
        
        return chatSession;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error : new Error('Failed to create session') });
        throw error;
      } finally {
        dispatch({ type: 'SET_CHAT_LOADING', payload: false });
      }
    },

    fetchSessions: async (projectId: string) => {
      try {
        dispatch({ type: 'SET_CHAT_LOADING', payload: true });
        
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/chat/sessions/${projectId}`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch chat sessions');
        }
        
        const sessions = await response.json();
        
        // Transform the response to match ChatSession interface
        const chatSessions: ChatSession[] = sessions.map((session: any) => ({
          id: session.id,
          projectId: projectId,
          title: session.title,
          description: session.metadata?.description || session.description,
          createdAt: new Date(session.created_at),
          updatedAt: new Date(session.updated_at),
          messageCount: session.messages?.length || 0,
          messages: session.messages || [],
          participants: [],
          settings: session.metadata?.settings || {
            autoSave: true,
            memoryContext: true,
            aiAssistance: true,
            allowInvites: false,
            isPublic: false,
          },
          isArchived: session.isArchived || false,
          lastActivityAt: new Date(session.updated_at),
          lastMessage: session.messages?.[0] ? {
            content: session.messages[0].content,
            timestamp: new Date(session.messages[0].timestamp),
            sender: session.messages[0].sender,
          } : undefined,
        }));
        
        dispatch({ type: 'SET_SESSIONS', payload: chatSessions });
        
        return chatSessions;
      } catch (error) {
        dispatch({ type: 'SET_ERROR', payload: error instanceof Error ? error : new Error('Failed to fetch sessions') });
        throw error;
      } finally {
        dispatch({ type: 'SET_CHAT_LOADING', payload: false });
      }
    },

    getSessionMessages: async (sessionId: string) => {
      dispatch({ type: 'SET_CHAT_LOADING', payload: true });
      
      // For testing purposes, return empty messages array without API call
      const fallbackMessages = [];
      dispatch({ type: 'SET_MESSAGES', payload: fallbackMessages });
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
      return fallbackMessages;
    },
  };
}

export function useSystemStore() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useSystemStore must be used within an AppProvider');
  }
  
  const { state, dispatch } = context;
  
  return {
    // System state
    status: state.status,
    
    // System actions
    setStatus: (status: string) => dispatch({ type: 'SET_SYSTEM_STATUS', payload: status }),
  };
}

