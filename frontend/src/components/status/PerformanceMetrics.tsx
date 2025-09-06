import React from 'react';
import { cn } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Clock, 
  Zap, 
  Users,
  MessageSquare,
  Database
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceMetrics {
  responseTime: number;
  throughput: number;
  errorRate: number;
  activeUsers: number;
  messagesProcessed: number;
  timestamp: Date;
  historicalData?: Array<{
    timestamp: Date;
    responseTime: number;
    throughput: number;
    errorRate: number;
  }>;
}

interface PerformanceMetricsProps {
  metrics: PerformanceMetrics;
  className?: string;
  showChart?: boolean;
  timeRange?: '1h' | '24h' | '7d';
}

const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  metrics,
  className,
  showChart = true,
  timeRange = '1h',
}) => {
  const formatValue = (value: number, type: string) => {
    switch (type) {
      case 'time':
        return `${value.toFixed(0)}ms`;
      case 'rate':
        return `${(value * 100).toFixed(2)}%`;
      case 'count':
        return value.toLocaleString();
      default:
        return value.toFixed(1);
    }
  };

  const getTrendIcon = (current: number, previous?: number) => {
    if (!previous) return <Minus className="w-4 h-4 text-gray-500" />;
    
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return <Minus className="w-4 h-4 text-gray-500" />;
    
    return change > 0 ? 
      <TrendingUp className="w-4 h-4 text-red-500" /> : 
      <TrendingDown className="w-4 h-4 text-green-500" />;
  };

  const getTrendColor = (current: number, previous?: number) => {
    if (!previous) return 'text-gray-500';
    
    const change = ((current - previous) / previous) * 100;
    if (Math.abs(change) < 1) return 'text-gray-500';
    
    return change > 0 ? 'text-red-500' : 'text-green-500';
  };

  const MetricCard: React.FC<{
    title: string;
    value: number;
    unit: string;
    icon: React.ReactNode;
    type?: 'time' | 'rate' | 'count';
    previousValue?: number;
    trend?: 'up' | 'down' | 'stable';
  }> = ({ title, value, unit, icon, type = 'count', previousValue, trend }) => (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {icon}
          <span className="text-sm font-medium text-gray-600">{title}</span>
        </div>
        {previousValue && (
          <div className="flex items-center space-x-1">
            {getTrendIcon(value, previousValue)}
            <span className={cn('text-xs font-medium', getTrendColor(value, previousValue))}>
              {previousValue ? Math.abs(((value - previousValue) / previousValue) * 100).toFixed(1) : 0}%
            </span>
          </div>
        )}
      </div>
      <div className="flex items-baseline space-x-1">
        <span className="text-2xl font-bold text-gray-900">
          {formatValue(value, type)}
        </span>
        <span className="text-sm text-gray-500">{unit}</span>
      </div>
    </div>
  );

  const chartData = metrics.historicalData?.map(data => ({
    time: new Date(data.timestamp).toLocaleTimeString(),
    responseTime: data.responseTime,
    throughput: data.throughput,
    errorRate: data.errorRate * 100,
  })) || [];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Performance Metrics</h3>
        <div className="flex items-center space-x-2">
          <select className="text-sm border border-gray-300 rounded px-2 py-1">
            <option value="1h" selected={timeRange === '1h'}>Last Hour</option>
            <option value="24h" selected={timeRange === '24h'}>Last 24 Hours</option>
            <option value="7d" selected={timeRange === '7d'}>Last 7 Days</option>
          </select>
          <span className="text-xs text-gray-500">
            Updated: {new Date(metrics.timestamp).toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Response Time"
          value={metrics.responseTime}
          unit="ms"
          icon={<Clock className="w-5 h-5 text-blue-500" />}
          type="time"
          previousValue={metrics.historicalData?.[metrics.historicalData.length - 2]?.responseTime}
        />
        <MetricCard
          title="Throughput"
          value={metrics.throughput}
          unit="req/s"
          icon={<Zap className="w-5 h-5 text-green-500" />}
          type="count"
          previousValue={metrics.historicalData?.[metrics.historicalData.length - 2]?.throughput}
        />
        <MetricCard
          title="Error Rate"
          value={metrics.errorRate}
          unit=""
          icon={<TrendingUp className="w-5 h-5 text-red-500" />}
          type="rate"
          previousValue={metrics.historicalData?.[metrics.historicalData.length - 2]?.errorRate}
        />
        <MetricCard
          title="Active Users"
          value={metrics.activeUsers}
          unit=""
          icon={<Users className="w-5 h-5 text-purple-500" />}
          type="count"
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <MetricCard
          title="Messages Processed"
          value={metrics.messagesProcessed}
          unit=""
          icon={<MessageSquare className="w-5 h-5 text-orange-500" />}
          type="count"
        />
        <MetricCard
          title="Database Operations"
          value={metrics.throughput * 0.8}
          unit="ops/s"
          icon={<Database className="w-5 h-5 text-indigo-500" />}
          type="count"
        />
      </div>

      {/* Performance Chart */}
      {showChart && chartData.length > 0 && (
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-4">Response Time Trend</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`${value.toFixed(0)}ms`, 'Response Time']}
                  labelFormatter={(label) => `Time: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Performance Summary</span>
        </div>
        <p className="text-sm text-blue-700">
          System performance is {metrics.responseTime < 200 ? 'excellent' : metrics.responseTime < 500 ? 'good' : 'needs attention'} 
          with {metrics.errorRate < 0.01 ? 'low' : metrics.errorRate < 0.05 ? 'moderate' : 'high'} error rates.
        </p>
      </div>
    </div>
  );
};

export default PerformanceMetrics;