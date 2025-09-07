"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Header } from "@/components/header";
import { ChatHistory } from "@/components/chat-history";
import { ChatInterface } from "@/components/chat-interface";
import { ContextSidebar } from "@/components/context-sidebar";
import { ErrorBoundary } from "@/components/error-boundary";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useProjectStore, useChatStore } from "@/lib/store";
import { useGlobalStore } from "@/lib/store";
import { useWebSocket } from "@/lib/websocket/client";
import { useProjects } from "@/lib/api/projectService";
import { useChat } from "@/lib/api/chatService";

export default function ProjectChatPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;
  const projectName = projectId ? decodeURIComponent(projectId) : "Project";
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Store hooks
  const projectStore = useProjectStore();
  const chatStore = useChatStore();
  const globalStore = useGlobalStore();
  
  // API hooks
  const { getProject } = useProjects();
  const { getSessions, getSessionMessages } = useChat();
  
  // WebSocket
  const { connect, disconnect, isConnected } = useWebSocket();

  useEffect(() => {
    const initializeProject = async () => {
      if (!projectId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Set loading state
        globalStore.setLoading(true);
        
        // Fetch project data
        const project = await getProject(projectId);
        projectStore.setCurrentProject(project);
        
        // Fetch chat sessions for this project
        await getSessions(projectId);
        
        // Restore saved session if it belongs to this project
        if (chatStore.currentSession && chatStore.currentSession.project_id === projectId) {
          // Verify the session still exists in the fetched sessions
          const sessionExists = chatStore.sessions.some(s => s.id === chatStore.currentSession?.id);
          if (sessionExists) {
            // The saved session is valid and belongs to this project
            console.log('Restoring saved chat session:', chatStore.currentSession.id);
          } else {
            // Session no longer exists, clear it
            chatStore.setCurrentSession(null);
          }
        } else if (chatStore.currentSession) {
          // Saved session belongs to a different project, clear it
          chatStore.setCurrentSession(null);
        }
        
        // Connect to WebSocket for real-time updates
        await connect({
          projectId,
          userId: projectStore.currentProject?.createdBy || '',
          sessionId: chatStore.currentSession?.id,
        });
        
        // Set current project in global store
        globalStore.setConnectionStatus(true);
        
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load project';
        setError(errorMessage);
        globalStore.setError(err instanceof Error ? err : new Error(errorMessage));
      } finally {
        setIsLoading(false);
        globalStore.setLoading(false);
      }
    };

    initializeProject();

    // Cleanup on unmount
    return () => {
      disconnect();
      projectStore.clearCurrentProject();
      chatStore.clearCurrentSession();
    };
  }, [projectId]);

  // Handle session changes
  useEffect(() => {
    if (chatStore.currentSession?.id) {
      // Load messages for current session
      getSessionMessages(chatStore.currentSession.id);
      
      // Update WebSocket session
      if (isConnected) {
        // Emit session change event
        // This would be implemented in the WebSocket client
      }
    }
  }, [chatStore.currentSession?.id]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen">
        <Header title={projectName} backHref="/" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading project...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen">
        <Header title={projectName} backHref="/" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="text-red-500 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Project</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary context={{ component: 'ProjectChatPage', action: 'render' }}>
      <div className="flex flex-col h-screen">
        <Header 
          title={projectStore.currentProject?.name || projectName} 
          backHref="/" 
        />
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={25}>
            <ChatHistory 
              projectId={projectId}
              currentSessionId={chatStore.currentSession?.id}
              onSessionSelect={(sessionId) => {
                const session = chatStore.sessions.find(s => s.id === sessionId);
                if (session) {
                  chatStore.setCurrentSession(session);
                }
              }}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={55} minSize={30}>
            <ChatInterface 
              projectId={projectId}
              sessionId={chatStore.currentSession?.id}
            />
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={25} minSize={15} maxSize={35}>
            <ContextSidebar 
              projectId={projectId}
              sessionId={chatStore.currentSession?.id}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </ErrorBoundary>
  );
}