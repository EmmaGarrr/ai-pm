import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Filter, 
  SortAsc, 
  Calendar, 
  MessageSquare, 
  Users, 
  Archive,
  Trash2,
  MoreHorizontal,
  Star,
  Clock
} from 'lucide-react';

interface ChatSession {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
  participants: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
  }>;
  tags: string[];
  isArchived: boolean;
  isStarred: boolean;
  settings: {
    autoSave: boolean;
    memoryContext: boolean;
    aiAssistance: boolean;
  };
  lastMessage?: {
    content: string;
    timestamp: Date;
    sender: string;
  };
}

interface SessionManagerProps {
  projectId: string;
  className?: string;
  compact?: boolean;
  onSessionSelect?: (session: ChatSession) => void;
  onSessionDelete?: (sessionId: string) => void;
  onSessionArchive?: (sessionId: string) => void;
  onSessionStar?: (sessionId: string) => void;
}

const SessionManager: React.FC<SessionManagerProps> = ({
  projectId,
  className,
  compact = false,
  onSessionSelect,
  onSessionDelete,
  onSessionArchive,
  onSessionStar,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'name' | 'messageCount' | 'updated'>('recent');
  const [filterArchived, setFilterArchived] = useState<'all' | 'active' | 'archived'>('active');
  const [filterStarred, setFilterStarred] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedSession, setSelectedSession] = useState<string | null>(null);

  // Mock session data - in real implementation, this would come from the store/API
  const mockSessions: ChatSession[] = [
    {
      id: '1',
      projectId,
      title: 'Initial Project Setup',
      description: 'Setting up the project structure and initial configuration',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      messageCount: 45,
      participants: [
        { id: 'user1', name: 'John Doe', role: 'owner', avatar: '' },
        { id: 'ai1', name: 'AI Assistant', role: 'assistant' },
      ],
      tags: ['setup', 'configuration', 'planning'],
      isArchived: false,
      isStarred: true,
      settings: {
        autoSave: true,
        memoryContext: true,
        aiAssistance: true,
      },
      lastMessage: {
        content: 'Project structure has been successfully created',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
        sender: 'AI Assistant',
      },
    },
    {
      id: '2',
      projectId,
      title: 'Database Design Discussion',
      description: 'Discussed database schema and relationship design',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      messageCount: 78,
      participants: [
        { id: 'user1', name: 'John Doe', role: 'owner', avatar: '' },
        { id: 'ai1', name: 'AI Assistant', role: 'assistant' },
      ],
      tags: ['database', 'schema', 'design'],
      isArchived: false,
      isStarred: false,
      settings: {
        autoSave: true,
        memoryContext: true,
        aiAssistance: true,
      },
      lastMessage: {
        content: 'Database schema looks good, let me create the migration files',
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4),
        sender: 'AI Assistant',
      },
    },
    {
      id: '3',
      projectId,
      title: 'API Implementation',
      description: 'Planning the REST API endpoints and implementation',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      messageCount: 92,
      participants: [
        { id: 'user1', name: 'John Doe', role: 'owner', avatar: '' },
        { id: 'ai1', name: 'AI Assistant', role: 'assistant' },
      ],
      tags: ['api', 'backend', 'endpoints'],
      isArchived: false,
      isStarred: true,
      settings: {
        autoSave: true,
        memoryContext: true,
        aiAssistance: true,
      },
      lastMessage: {
        content: 'API endpoints have been implemented and tested',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        sender: 'AI Assistant',
      },
    },
    {
      id: '4',
      projectId,
      title: 'Frontend Component Architecture',
      description: 'Discussion about React component structure and state management',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1), // 1 day ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
      messageCount: 156,
      participants: [
        { id: 'user1', name: 'John Doe', role: 'owner', avatar: '' },
        { id: 'ai1', name: 'AI Assistant', role: 'assistant' },
      ],
      tags: ['frontend', 'react', 'components', 'state-management'],
      isArchived: false,
      isStarred: false,
      settings: {
        autoSave: true,
        memoryContext: true,
        aiAssistance: true,
      },
      lastMessage: {
        content: 'Component architecture is solid and ready for implementation',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        sender: 'AI Assistant',
      },
    },
    {
      id: '5',
      projectId,
      title: 'Testing Strategy',
      description: 'Planning comprehensive testing approach for the project',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12), // 12 hours ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
      messageCount: 67,
      participants: [
        { id: 'user1', name: 'John Doe', role: 'owner', avatar: '' },
        { id: 'ai1', name: 'AI Assistant', role: 'assistant' },
      ],
      tags: ['testing', 'quality', 'ci-cd'],
      isArchived: false,
      isStarred: false,
      settings: {
        autoSave: true,
        memoryContext: true,
        aiAssistance: true,
      },
      lastMessage: {
        content: 'Testing strategy covers all critical components',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        sender: 'AI Assistant',
      },
    },
    {
      id: '6',
      projectId,
      title: 'Deployment Planning',
      description: 'Archived: Initial deployment planning session',
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 10), // 10 days ago
      updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8), // 8 days ago
      messageCount: 34,
      participants: [
        { id: 'user1', name: 'John Doe', role: 'owner', avatar: '' },
        { id: 'ai1', name: 'AI Assistant', role: 'assistant' },
      ],
      tags: ['deployment', 'infrastructure', 'archived'],
      isArchived: true,
      isStarred: false,
      settings: {
        autoSave: true,
        memoryContext: true,
        aiAssistance: true,
      },
    },
  ];

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    mockSessions.forEach(session => {
      session.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [mockSessions]);

  const filteredAndSortedSessions = useMemo(() => {
    let filtered = mockSessions.filter(session => {
      // Search filter
      if (searchTerm && !session.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !session.description?.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !session.lastMessage?.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Tags filter
      if (selectedTags.length > 0 && !selectedTags.some(tag => session.tags.includes(tag))) {
        return false;
      }
      
      // Archive filter
      if (filterArchived === 'active' && session.isArchived) return false;
      if (filterArchived === 'archived' && !session.isArchived) return false;
      
      // Starred filter
      if (filterStarred && !session.isStarred) return false;
      
      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'name':
          return a.title.localeCompare(b.title);
        case 'messageCount':
          return b.messageCount - a.messageCount;
        case 'updated':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  }, [mockSessions, searchTerm, selectedTags, filterArchived, filterStarred, sortBy]);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSessionClick = (session: ChatSession) => {
    setSelectedSession(session.id);
    if (onSessionSelect) {
      onSessionSelect(session);
    }
  };

  const handleSessionStar = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSessionStar) {
      onSessionStar(sessionId);
    }
  };

  const handleSessionArchive = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSessionArchive) {
      onSessionArchive(sessionId);
    }
  };

  const handleSessionDelete = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSessionDelete && confirm('Are you sure you want to delete this session?')) {
      onSessionDelete(sessionId);
    }
  };

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Recent Sessions</h3>
          <span className="text-xs text-gray-500">
            {filteredAndSortedSessions.length} sessions
          </span>
        </div>
        
        <div className="space-y-2">
          {filteredAndSortedSessions.slice(0, 5).map(session => (
            <div 
              key={session.id} 
              className="p-3 bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSessionClick(session)}
            >
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-medium text-gray-900 truncate">
                  {session.title}
                </h4>
                <div className="flex items-center space-x-1">
                  {session.isStarred && (
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  )}
                  <span className="text-xs text-gray-500">
                    {formatTimestamp(session.updatedAt)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-600 truncate">
                {session.lastMessage?.content || 'No messages yet'}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {session.messageCount} messages
                </span>
                <div className="flex space-x-1">
                  {session.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Chat Sessions</h2>
          <p className="text-sm text-gray-600">Project chat sessions and conversations</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* View Mode Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'px-2 py-1 rounded text-sm font-medium',
                viewMode === 'list' ? 'bg-white shadow' : 'text-gray-600'
              )}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'px-2 py-1 rounded text-sm font-medium',
                viewMode === 'grid' ? 'bg-white shadow' : 'text-gray-600'
              )}
            >
              Grid
            </button>
          </div>
          
          <span className="text-sm text-gray-500">
            {filteredAndSortedSessions.length} sessions
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="recent">Most Recent</option>
            <option value="name">By Name</option>
            <option value="messageCount">Most Messages</option>
            <option value="updated">Last Updated</option>
          </select>

          {/* Archive Filter */}
          <select
            value={filterArchived}
            onChange={(e) => setFilterArchived(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">Active Only</option>
            <option value="all">All Sessions</option>
            <option value="archived">Archived Only</option>
          </select>

          {/* Starred Filter */}
          <button
            onClick={() => setFilterStarred(!filterStarred)}
            className={cn(
              'px-3 py-2 border rounded-lg flex items-center space-x-2',
              filterStarred 
                ? 'bg-yellow-100 border-yellow-300 text-yellow-700' 
                : 'border-gray-300 text-gray-700 hover:bg-gray-100'
            )}
          >
            <Star className={cn('w-4 h-4', filterStarred ? 'fill-current' : '')} />
            <span>Starred Only</span>
          </button>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filter by tags:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-2 py-1 rounded-full text-xs font-medium transition-colors',
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredAndSortedSessions.map(session => (
            <div 
              key={session.id}
              className={cn(
                'p-4 bg-white rounded-lg border hover:shadow-md transition-all cursor-pointer',
                selectedSession === session.id ? 'border-blue-500 shadow-md' : 'border-gray-200',
                session.isArchived && 'opacity-60'
              )}
              onClick={() => handleSessionClick(session)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="font-semibold text-gray-900">{session.title}</h3>
                    {session.isStarred && (
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    )}
                    {session.isArchived && (
                      <Archive className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  
                  {session.description && (
                    <p className="text-sm text-gray-600 mb-3">{session.description}</p>
                  )}
                  
                  {session.lastMessage && (
                    <div className="bg-gray-50 p-2 rounded mb-3">
                      <p className="text-sm text-gray-700 truncate">
                        {session.lastMessage.content}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {session.lastMessage.sender} • {formatTimestamp(session.lastMessage.timestamp)}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{session.messageCount} messages</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-3 h-3" />
                        <span>{session.participants.length} participants</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(session.updatedAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1">
                      {session.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-100 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={(e) => handleSessionStar(session.id, e)}
                    className={cn(
                      'p-1 rounded transition-colors',
                      session.isStarred ? 'text-yellow-500 hover:bg-yellow-50' : 'text-gray-400 hover:bg-gray-100'
                    )}
                  >
                    <Star className={cn('w-4 h-4', session.isStarred ? 'fill-current' : '')} />
                  </button>
                  <button
                    onClick={(e) => handleSessionArchive(session.id, e)}
                    className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleSessionDelete(session.id, e)}
                    className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedSessions.map(session => (
            <div 
              key={session.id}
              className={cn(
                'p-4 bg-white rounded-lg border hover:shadow-md transition-all cursor-pointer',
                selectedSession === session.id ? 'border-blue-500 shadow-md' : 'border-gray-200',
                session.isArchived && 'opacity-60'
              )}
              onClick={() => handleSessionClick(session)}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 truncate">{session.title}</h3>
                <div className="flex items-center space-x-1">
                  {session.isStarred && (
                    <Star className="w-3 h-3 text-yellow-500 fill-current" />
                  )}
                  {session.isArchived && (
                    <Archive className="w-3 h-3 text-gray-500" />
                  )}
                </div>
              </div>
              
              {session.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{session.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{session.messageCount} messages</span>
                  <span>{formatTimestamp(session.updatedAt)}</span>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {session.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-1 py-0.5 bg-gray-100 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                  {session.tags.length > 3 && (
                    <span className="px-1 py-0.5 bg-gray-100 rounded text-xs">
                      +{session.tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedSessions.length === 0 && (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedTags.length > 0 || filterArchived !== 'all' || filterStarred
              ? 'Try adjusting your filters or search terms.'
              : 'Start a new conversation to create your first session.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default SessionManager;