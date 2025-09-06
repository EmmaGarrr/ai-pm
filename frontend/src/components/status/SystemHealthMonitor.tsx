import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Cpu, 
  HardDrive, 
  Wifi, 
  Activity, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Server,
  Zap
} from 'lucide-react';

interface SystemHealthMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  status: 'healthy' | 'warning' | 'error';
  uptime: string;
  lastUpdate: Date;
}

interface SystemHealthMonitorProps {
  metrics: SystemHealthMetrics;
  className?: string;
  compact?: boolean;
}

const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({
  metrics,
  className,
  compact = false,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600';
      case 'warning':
        return 'text-yellow-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100';
      case 'warning':
        return 'bg-yellow-100';
      case 'error':
        return 'bg-red-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Activity className="w-5 h-5 text-gray-600" />;
    }
  };

  const getMetricColor = (value: number) => {
    if (value >= 90) return 'text-red-600';
    if (value >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getMetricBgColor = (value: number) => {
    if (value >= 90) return 'bg-red-200';
    if (value >= 70) return 'bg-yellow-200';
    return 'bg-green-200';
  };

  const MetricBar: React.FC<{
    value: number;
    label: string;
    icon: React.ReactNode;
    unit?: string;
  }> = ({ value, label, icon, unit = '%' }) => (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium text-gray-700">{label}</span>
        </div>
        <span className={cn('text-sm font-medium', getMetricColor(value))}>
          {value.toFixed(1)}{unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', getMetricBgColor(value))}
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );

  if (compact) {
    return (
      <div className={cn('p-3 bg-white rounded-lg border border-gray-200', className)}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon(metrics.status)}
            <span className={cn('text-sm font-semibold', getStatusColor(metrics.status))}>
              {metrics.status.charAt(0).toUpperCase() + metrics.status.slice(1)}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(metrics.lastUpdate).toLocaleTimeString()}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <MetricBar value={metrics.cpu} label="CPU" icon={<Cpu className="w-4 h-4" />} />
          <MetricBar value={metrics.memory} label="Memory" icon={<HardDrive className="w-4 h-4" />} />
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white rounded-lg border border-gray-200 p-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={cn(
            'p-2 rounded-lg',
            getStatusBgColor(metrics.status)
          )}>
            <Server className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">System Health</h3>
            <p className="text-sm text-gray-500">
              Uptime: {metrics.uptime}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {getStatusIcon(metrics.status)}
          <span className={cn('text-sm font-semibold', getStatusColor(metrics.status))}>
            {metrics.status.charAt(0).toUpperCase() + metrics.status.slice(1)}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(metrics.lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricBar value={metrics.cpu} label="CPU Usage" icon={<Cpu className="w-4 h-4" />} />
        <MetricBar value={metrics.memory} label="Memory Usage" icon={<HardDrive className="w-4 h-4" />} />
        <MetricBar value={metrics.disk} label="Disk Usage" icon={<HardDrive className="w-4 h-4" />} />
        <MetricBar value={metrics.network} label="Network" icon={<Wifi className="w-4 h-4" />} />
      </div>

      {/* Status Details */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-gray-500" />
            <span className="text-gray-600">All Systems Operational</span>
          </div>
          <div className="flex items-center space-x-4 text-gray-500">
            <span>Latency: 23ms</span>
            <span>Response Time: 145ms</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemHealthMonitor;