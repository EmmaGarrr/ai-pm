"use client";

import * as React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Plus, 
  Search, 
  MessageCircle, 
  Users, 
  Clock, 
  Archive,
  MoreVertical,
  Edit,
  Trash2,
  Filter
} from "lucide-react";
import { useChatStore, useProjectStore, useUserStore, useGlobalStore } from "@/lib/store";
import { useChat } from "@/lib/api/chatService";
import { ChatSession, CreateSessionRequest } from "@/lib/types";

interface ChatHistoryProps {
  projectId?: string;
  onSessionSelect?: (sessionId: string) => void;
  currentSessionId?: string;
}

export function ChatHistory({ projectId, onSessionSelect, currentSessionId }: ChatHistoryProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);
  const [newSessionTitle, setNewSessionTitle] = React.useState("");
  const [newSessionDescription, setNewSessionDescription] = React.useState("");
  
  const chatStore = useChatStore();
  const projectStore = useProjectStore();
  const userStore = useUserStore();
  const globalStore = useGlobalStore();
  const { createSession } = useChat();
  
  const sessions = chatStore.sessions;
  const currentProject = projectStore.currentProject;
  const isLoading = chatStore.isLoading;
  const error = chatStore.error;

  // Filter sessions based on search and archived status
  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (session.description && session.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesArchived = showArchived || !session.isArchived;
    const matchesProject = !projectId || session.projectId === projectId;
    
    return matchesSearch && matchesArchived && matchesProject;
  });

  const handleCreateSession = async () => {
    if (!newSessionTitle.trim() || !currentProject) return;

    try {
      const sessionData: CreateSessionRequest = {
        projectId: currentProject.id,
        title: newSessionTitle.trim(),
        description: newSessionDescription.trim() || undefined,
        settings: {
          autoSave: true,
          memoryContext: true,
          aiAssistance: true,
          allowInvites: false,
          isPublic: false,
        },
      };

      await createSession(sessionData);
      setIsCreateDialogOpen(false);
      setNewSessionTitle("");
      setNewSessionDescription("");
    } catch (error) {
      globalStore.setError(error instanceof Error ? error : new Error('Failed to create session'));
    }
  };

  const handleSessionSelect = (session: ChatSession) => {
    chatStore.setCurrentSession(session);
    onSessionSelect?.(session.id);
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(date).toLocaleDateString();
  };

  const getSessionStatus = (session: ChatSession) => {
    if (session.isArchived) return { variant: 'secondary' as const, label: 'Archived' };
    
    const lastActivity = new Date(session.lastActivityAt);
    const now = new Date();
    const diff = now.getTime() - lastActivity.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) return { variant: 'default' as const, label: 'Active' };
    if (hours < 24) return { variant: 'outline' as const, label: 'Recent' };
    return { variant: 'secondary' as const, label: 'Older' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading sessions...</p>
        </div>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Sessions</h3>
          <p className="text-gray-600 mb-4">{error.message || error.toString()}</p>
          <Button onClick={() => chatStore.fetchSessions(projectId)}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full border-r bg-background">
      {/* Header */}
      <div className="p-4 border-b space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Chat History</h2>
          <div className="flex items-center gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={!currentProject}>
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Session</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Session Title</label>
                    <Input
                      value={newSessionTitle}
                      onChange={(e) => setNewSessionTitle(e.target.value)}
                      placeholder="Enter session title..."
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (Optional)</label>
                    <Input
                      value={newSessionDescription}
                      onChange={(e) => setNewSessionDescription(e.target.value)}
                      placeholder="Enter session description..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateSession} disabled={!newSessionTitle.trim()}>
                      Create
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showArchived ? "default" : "outline"}
            size="sm"
            onClick={() => setShowArchived(!showArchived)}
          >
            <Archive className="h-4 w-4 mr-1" />
            Archived
          </Button>
        </div>
      </div>

      {/* Sessions List */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-2">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <MessageCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No sessions found' : 'No sessions yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchQuery 
                  ? 'Try adjusting your search terms'
                  : 'Create your first session to start chatting'
                }
              </p>
              {!searchQuery && currentProject && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Session
                </Button>
              )}
            </div>
          ) : (
            filteredSessions.map((session) => {
              const status = getSessionStatus(session);
              const isActive = session.id === currentSessionId;
              
              return (
                <Button
                  key={session.id}
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start text-left h-auto p-3"
                  onClick={() => handleSessionSelect(session)}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium truncate">{session.title}</h4>
                        <Badge variant={status.variant} className="text-xs">
                          {status.label}
                        </Badge>
                      </div>
                      {session.description && (
                        <p className="text-xs text-muted-foreground truncate mb-2">
                          {session.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{session.messageCount || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{session.participants?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatLastActivity(session.lastActivityAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement session menu
                        }}
                      >
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Button>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}