import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import SystemHealthMonitor from './SystemHealthMonitor';
import PerformanceMetrics from './PerformanceMetrics';
import { useWebSocket } from '@/lib/websocket/client';
import { useGlobalStore } from '@/lib/store';

interface LiveStatusData {
  systemHealth: {
    status: 'healthy' | 'warning' | 'error';
    cpu: number;
    memory: number;
    disk: number;
    network: number;
    uptime: string;
  };
  performance: {
    responseTime: number;
    throughput: number;
    errorRate: number;
    activeUsers: number;
    messagesProcessed: number;
  };
  aiProcessing: boolean;
  activeConnections: number;
  lastUpdate: Date;
}

interface LiveStatusDashboardProps {
  className?: string;
  compact?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

const LiveStatusDashboard: React.FC<LiveStatusDashboardProps> = ({
  className,
  compact = false,
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [statusData, setStatusData] = useState<LiveStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('disconnected');
  
  const { isConnected } = useGlobalStore();
  const { emit, on, off } = useWebSocket();

  // Default/fallback data
  const defaultStatusData: LiveStatusData = {
    systemHealth: {
      status: 'healthy',
      cpu: 23.5,
      memory: 67.2,
      disk: 45.8,
      network: 12.3,
      uptime: '15d 4h 23m',
    },
    performance: {
      responseTime: 145,
      throughput: 1250,
      errorRate: 0.003,
      activeUsers: 24,
      messagesProcessed: 15420,
    },
    aiProcessing: false,
    activeConnections: 24,
    lastUpdate: new Date(),
  };

  // Simulate real-time updates
  useEffect(() => {
    const generateMockData = (): LiveStatusData => ({
      systemHealth: {
        status: Math.random() > 0.9 ? 'warning' : 'healthy',
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 100,
        uptime: '15d 4h 23m',
      },
      performance: {
        responseTime: 100 + Math.random() * 200,
        throughput: 1000 + Math.random() * 500,
        errorRate: Math.random() * 0.01,
        activeUsers: 20 + Math.floor(Math.random() * 20),
        messagesProcessed: 15000 + Math.floor(Math.random() * 1000),
      },
      aiProcessing: Math.random() > 0.7,
      activeConnections: 20 + Math.floor(Math.random() * 10),
      lastUpdate: new Date(),
    });

    // Initial data
    setStatusData(generateMockData());
    setIsLoading(false);

    // Set up WebSocket listeners
    const handleSystemStatus = (data: LiveStatusData) => {
      setStatusData(data);
      setIsLoading(false);
      setConnectionStatus('connected');
    };

    on('system-status', handleSystemStatus);

    // Simulate updates if no WebSocket connection
    let intervalId: NodeJS.Timeout;
    if (!isConnected && autoRefresh) {
      intervalId = setInterval(() => {
        setStatusData(generateMockData());
      }, refreshInterval);
    }

    return () => {
      off('system-status', handleSystemStatus);
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isConnected, autoRefresh, refreshInterval, on, off]);

  // Request initial status update
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connecting');
      emit('request-system-status', {});
    }
  }, [isConnected, emit]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-100';
      case 'connecting':
        return 'text-yellow-600 bg-yellow-100';
      case 'disconnected':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  if (isLoading) {
    return (
      <div className={cn('animate-pulse space-y-4', className)}>
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="h-48 bg-gray-200 rounded-lg"></div>
      </div>
    );
  }

  if (!statusData) {
    return (
      <div className={cn('text-center py-8', className)}>
        <div className="text-gray-500">No status data available</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={cn('space-y-4', className)}>
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-2 h-2 rounded-full',
              connectionStatus === 'connected' ? 'bg-green-500' :
              connectionStatus === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
            )} />
            <span className="text-sm font-medium capitalize">{connectionStatus}</span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(statusData.lastUpdate).toLocaleTimeString()}
          </span>
        </div>

        {/* Compact System Health */}
        <SystemHealthMonitor
          metrics={{
            ...statusData.systemHealth,
            lastUpdate: statusData.lastUpdate,
          }}
          compact={true}
        />

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Users</div>
            <div className="font-semibold">{statusData.performance.activeUsers}</div>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <div className="text-gray-600">Response</div>
            <div className="font-semibold">{statusData.performance.responseTime}ms</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Live Status Dashboard</h2>
          <p className="text-sm text-gray-600">Real-time system monitoring and performance metrics</p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* AI Processing Status */}
          <div className="flex items-center space-x-2">
            <div className={cn(
              'w-2 h-2 rounded-full animate-pulse',
              statusData.aiProcessing ? 'bg-blue-500' : 'bg-gray-400'
            )} />
            <span className="text-sm text-gray-600">
              {statusData.aiProcessing ? 'AI Processing' : 'AI Idle'}
            </span>
          </div>
          
          {/* Connection Status */}
          <div className={cn(
            'px-3 py-1 rounded-full text-sm font-medium',
            getStatusColor(connectionStatus)
          )}>
            {connectionStatus}
          </div>
          
          {/* Last Update */}
          <span className="text-sm text-gray-500">
            Updated: {new Date(statusData.lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusData.performance.activeUsers}
              </p>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Response Time</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusData.performance.responseTime}ms
              </p>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Messages</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusData.performance.messagesProcessed.toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connections</p>
              <p className="text-2xl font-bold text-gray-900">
                {statusData.activeConnections}
              </p>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Main Components */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SystemHealthMonitor
          metrics={{
            ...statusData.systemHealth,
            lastUpdate: statusData.lastUpdate,
          }}
        />
        
        <PerformanceMetrics
          metrics={{
            ...statusData.performance,
            timestamp: statusData.lastUpdate,
          }}
          showChart={!compact}
        />
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">System health check completed</span>
            <span className="text-gray-400">2 minutes ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">AI model processing completed</span>
            <span className="text-gray-400">5 minutes ago</span>
          </div>
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span className="text-gray-600">Database backup completed</span>
            <span className="text-gray-400">15 minutes ago</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveStatusDashboard;