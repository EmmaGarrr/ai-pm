"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Wifi, 
  WifiOff, 
  Users, 
  FileText, 
  Activity, 
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  Brain,
  Database,
  Zap
} from "lucide-react";
import { useProjectStore, useChatStore, useUserStore, useSystemStore } from "@/lib/store";
import { useWebSocket } from "@/lib/websocket/client";
import { useWebSocketEvents } from "@/lib/websocket/eventHandlers";
import { Project, MemoryItem, SessionParticipant } from "@/lib/types";

interface ContextSidebarProps {
  projectId?: string;
  sessionId?: string;
}

export function ContextSidebar({ projectId, sessionId }: ContextSidebarProps) {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'team' | 'files' | 'memory'>('overview');
  
  const projectStore = useProjectStore();
  const chatStore = useChatStore();
  const userStore = useUserStore();
  const systemStore = useSystemStore();
  const { isConnected, connectionInfo } = useWebSocket();
  
  const currentProject = projectStore.currentProject;
  const currentSession = chatStore.currentSession;
  const systemStatus = systemStore.status;

  // Real-time status indicators
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'degraded': return 'bg-yellow-500';
      case 'down': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4" />;
      case 'degraded': return <AlertCircle className="h-4 w-4" />;
      case 'down': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const formatUptime = (uptime: number) => {
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const renderOverviewTab = () => (
    <div className="space-y-4">
      {/* Connection Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {isConnected ? <Wifi className="h-4 w-4 text-green-500" /> : <WifiOff className="h-4 w-4 text-red-500" />}
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">WebSocket</span>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm">{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
          {connectionInfo.reconnecting && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Reconnecting</span>
              <span className="text-sm text-yellow-600">
                Attempt {connectionInfo.reconnectAttempts}/5
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Queued Events</span>
            <span className="text-sm">{connectionInfo.queuedEvents}</span>
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(systemStatus).map(([service, status]) => (
            <div key={service} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground capitalize">
                {service.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <div className="flex items-center gap-2">
                {getStatusIcon(status)}
                <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`} />
                <span className="text-sm capitalize">{status}</span>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Project Stats */}
      {currentProject && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Project Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Progress</span>
              <span className="text-sm">{currentProject.progress}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <Badge variant={currentProject.status === 'active' ? 'default' : 'secondary'}>
                {currentProject.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Collaborators</span>
              <span className="text-sm">{currentProject.collaborators?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Memory Items</span>
              <span className="text-sm">{currentProject.memoryItems?.length || 0}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Stats */}
      {currentSession && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Session Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Messages</span>
              <span className="text-sm">{currentSession.messageCount || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Participants</span>
              <span className="text-sm">{currentSession.participants?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Activity</span>
              <span className="text-sm">
                {currentSession.lastActivityAt ? 
                  new Date(currentSession.lastActivityAt).toLocaleTimeString() : 
                  'Never'
                }
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderTeamTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4" />
          Team Members
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentProject?.collaborators && currentProject.collaborators.length > 0 ? (
          <div className="space-y-3">
            {currentProject.collaborators.map((collaborator) => (
              <div key={collaborator.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={collaborator.user.avatar} />
                  <AvatarFallback>
                    {collaborator.user.name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {collaborator.user.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {collaborator.role}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    collaborator.user.isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  <Badge variant="outline" className="text-xs">
                    {collaborator.role}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No team members assigned to this project.
          </p>
        )}
      </CardContent>
    </Card>
  );

  const renderMemoryTab = () => (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4" />
          Memory Context
        </CardTitle>
      </CardHeader>
      <CardContent>
        {currentProject?.memoryItems && currentProject.memoryItems.length > 0 ? (
          <div className="space-y-3">
            {currentProject.memoryItems.map((memory) => (
              <div key={memory.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">{memory.title}</h4>
                  <Badge variant="outline" className="text-xs">
                    {memory.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {memory.content}
                </p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Score: {(memory.relevanceScore * 100).toFixed(0)}%</span>
                  <span>{new Date(memory.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No memory items stored for this project.
          </p>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col h-full border-l bg-background">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold tracking-tight">
          Project Context
        </h2>
        <div className="flex gap-2 mt-3">
          {[
            { key: 'overview', label: 'Overview', icon: Activity },
            { key: 'team', label: 'Team', icon: Users },
            { key: 'memory', label: 'Memory', icon: Brain },
          ].map(({ key, label, icon: Icon }) => (
            <Button
              key={key}
              variant={activeTab === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab(key as any)}
              className="text-xs"
            >
              <Icon className="h-3 w-3 mr-1" />
              {label}
            </Button>
          ))}
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'team' && renderTeamTab()}
        {activeTab === 'memory' && renderMemoryTab()}
      </ScrollArea>
    </div>
  );
}