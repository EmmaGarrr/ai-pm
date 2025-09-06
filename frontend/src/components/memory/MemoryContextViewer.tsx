import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, Filter, Tag, Calendar, Clock, FileText, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useChatStore } from '@/lib/store';

interface MemoryItem {
  id: string;
  type: 'error' | 'solution' | 'context' | 'dependency';
  title: string;
  content: string;
  tags: string[];
  timestamp: Date;
  relevance: number;
  projectId: string;
  confidence?: number;
  verificationStatus?: 'pending' | 'verified' | 'failed';
}

interface MemoryContextViewerProps {
  projectId: string;
  className?: string;
  compact?: boolean;
  showControls?: boolean;
}

const MemoryContextViewer: React.FC<MemoryContextViewerProps> = ({
  projectId,
  className,
  compact = false,
  showControls = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<MemoryItem['type'] | 'all'>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'relevance' | 'title'>('recent');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Mock memory data - in real implementation, this would come from the store/API
  const mockMemoryItems: MemoryItem[] = [
    {
      id: '1',
      type: 'error',
      title: 'Database Connection Timeout',
      content: 'Connection to PostgreSQL database timed out after 30 seconds. Check database server status and network connectivity.',
      tags: ['database', 'timeout', 'connection'],
      timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
      relevance: 0.95,
      projectId,
      confidence: 0.85,
      verificationStatus: 'verified',
    },
    {
      id: '2',
      type: 'solution',
      title: 'Implement Connection Pooling',
      content: 'Add connection pooling to reduce database connection overhead. Use pg-pool with max 20 connections.',
      tags: ['database', 'performance', 'pooling'],
      timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      relevance: 0.88,
      projectId,
      confidence: 0.92,
      verificationStatus: 'verified',
    },
    {
      id: '3',
      type: 'context',
      title: 'Project Configuration',
      content: 'Project uses Next.js 14, PostgreSQL, Redis, and Socket.io for real-time features.',
      tags: ['config', 'nextjs', 'database'],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
      relevance: 0.75,
      projectId,
    },
    {
      id: '4',
      type: 'dependency',
      title: 'React Flow Dependency',
      content: 'Added react-flow-renderer for dependency visualization. Version 10.3.17.',
      tags: ['dependency', 'react', 'visualization'],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3), // 3 hours ago
      relevance: 0.82,
      projectId,
    },
    {
      id: '5',
      type: 'error',
      title: 'Memory Leak Detected',
      content: 'Memory leak identified in WebSocket connection manager. Fixed by proper cleanup in useEffect.',
      tags: ['memory', 'websocket', 'leak'],
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), // 4 hours ago
      relevance: 0.90,
      projectId,
      confidence: 0.78,
      verificationStatus: 'pending',
    },
  ];

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    mockMemoryItems.forEach(item => {
      item.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [mockMemoryItems]);

  const filteredAndSortedItems = useMemo(() => {
    let filtered = mockMemoryItems.filter(item => {
      // Search filter
      if (searchTerm && !item.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          !item.content.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Type filter
      if (selectedType !== 'all' && item.type !== selectedType) {
        return false;
      }
      
      // Tags filter
      if (selectedTags.length > 0 && !selectedTags.some(tag => item.tags.includes(tag))) {
        return false;
      }
      
      return true;
    });

    // Sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'relevance':
          return b.relevance - a.relevance;
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    return filtered;
  }, [mockMemoryItems, searchTerm, selectedType, selectedTags, sortBy]);

  const getTypeIcon = (type: MemoryItem['type']) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'solution':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'context':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'dependency':
        return <Tag className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeColor = (type: MemoryItem['type']) => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'solution':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'context':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'dependency':
        return 'text-purple-600 bg-purple-50 border-purple-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getVerificationStatusIcon = (status?: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-500" />;
      default:
        return <Clock className="w-3 h-3 text-yellow-500" />;
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  if (compact) {
    return (
      <div className={cn('space-y-3', className)}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">Memory Context</h3>
          <span className="text-xs text-gray-500">
            {filteredAndSortedItems.length} items
          </span>
        </div>
        
        <div className="space-y-2">
          {filteredAndSortedItems.slice(0, 3).map(item => (
            <div key={item.id} className="p-2 bg-gray-50 rounded border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {getTypeIcon(item.type)}
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {item.title}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {formatTimestamp(item.timestamp)}
                </span>
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
          <h2 className="text-xl font-bold text-gray-900">Memory Context</h2>
          <p className="text-sm text-gray-600">Project memory and context items</p>
        </div>
        
        <div className="flex items-center space-x-2">
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
            {filteredAndSortedItems.length} items
          </span>
        </div>
      </div>

      {/* Controls */}
      {showControls && (
        <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search memory items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as MemoryItem['type'] | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="error">Errors</option>
              <option value="solution">Solutions</option>
              <option value="context">Context</option>
              <option value="dependency">Dependencies</option>
            </select>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'relevance' | 'title')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Most Recent</option>
              <option value="relevance">Most Relevant</option>
              <option value="title">By Title</option>
            </select>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-gray-500" />
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
      )}

      {/* Memory Items */}
      {viewMode === 'list' ? (
        <div className="space-y-3">
          {filteredAndSortedItems.map(item => (
            <div key={item.id} className={cn(
              'p-4 rounded-lg border',
              getTypeColor(item.type)
            )}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    {getTypeIcon(item.type)}
                    <h3 className="font-semibold text-gray-900">{item.title}</h3>
                    {item.verificationStatus && (
                      <div className="flex items-center space-x-1">
                        {getVerificationStatusIcon(item.verificationStatus)}
                        <span className="text-xs text-gray-600 capitalize">
                          {item.verificationStatus}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-700 mb-3 line-clamp-2">
                    {item.content}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap gap-1">
                      {item.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="flex items-center space-x-3 text-xs text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(item.timestamp)}</span>
                      </div>
                      {item.confidence && (
                        <div className="flex items-center space-x-1">
                          <span>Confidence:</span>
                          <span className="font-medium">
                            {Math.round(item.confidence * 100)}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {item.relevance && (
                  <div className="ml-4 text-right">
                    <div className="text-xs text-gray-600 mb-1">Relevance</div>
                    <div className="w-12 bg-gray-200 rounded-full h-1.5">
                      <div
                        className="h-1.5 rounded-full bg-blue-500"
                        style={{ width: `${item.relevance * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {Math.round(item.relevance * 100)}%
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedItems.map(item => (
            <div key={item.id} className={cn(
              'p-4 rounded-lg border',
              getTypeColor(item.type)
            )}>
              <div className="flex items-center space-x-2 mb-2">
                {getTypeIcon(item.type)}
                <h3 className="font-semibold text-gray-900 truncate">{item.title}</h3>
              </div>
              
              <p className="text-sm text-gray-700 mb-3 line-clamp-3">
                {item.content}
              </p>
              
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {item.tags.slice(0, 3).map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                  {item.tags.length > 3 && (
                    <span className="px-2 py-1 bg-white bg-opacity-50 rounded text-xs font-medium">
                      +{item.tags.length - 3}
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <span>{formatTimestamp(item.timestamp)}</span>
                  {item.relevance && (
                    <span>{Math.round(item.relevance * 100)}%</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedItems.length === 0 && (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No memory items found</h3>
          <p className="text-gray-600">
            {searchTerm || selectedType !== 'all' || selectedTags.length > 0
              ? 'Try adjusting your filters or search terms.'
              : 'Start interacting with the project to build memory context.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default MemoryContextViewer;