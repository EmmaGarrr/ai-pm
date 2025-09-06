import React, { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { 
  Bell, 
  X, 
  Check, 
  AlertCircle, 
  Info, 
  AlertTriangle, 
  CheckCircle, 
  Settings,
  Filter,
  Trash2,
  Archive,
  Clock
} from 'lucide-react';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'system';
  title: string;
  message: string;
  timestamp: Date;
  isRead: boolean;
  isArchived: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'system' | 'chat' | 'file' | 'memory' | 'security' | 'performance';
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: Record<string, any>;
}

interface NotificationCenterProps {
  className?: string;
  maxNotifications?: number;
  autoDismiss?: boolean;
  autoDismissTime?: number;
  soundEnabled?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onNotificationClick?: (notification: Notification) => void;
  onNotificationDismiss?: (notificationId: string) => void;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({
  className,
  maxNotifications = 50,
  autoDismiss = true,
  autoDismissTime = 5000,
  soundEnabled = false,
  position = 'top-right',
  onNotificationClick,
  onNotificationDismiss,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread' | 'archived' | Notification['type']>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | Notification['category']>('all');
  const [soundEnabledState, setSoundEnabled] = useState(soundEnabled);

  // Initialize with some mock notifications
  useEffect(() => {
    const mockNotifications: Notification[] = [
      {
        id: '1',
        type: 'success',
        title: 'File Exported Successfully',
        message: 'Your session data has been exported to JSON format.',
        timestamp: new Date(Date.now() - 1000 * 60 * 5),
        isRead: false,
        isArchived: false,
        priority: 'medium',
        category: 'file',
        action: {
          label: 'View File',
          onClick: () => console.log('View file'),
        },
      },
      {
        id: '2',
        type: 'warning',
        title: 'High Memory Usage',
        message: 'System memory usage is above 80%. Consider closing unused applications.',
        timestamp: new Date(Date.now() - 1000 * 60 * 15),
        isRead: false,
        isArchived: false,
        priority: 'high',
        category: 'system',
        action: {
          label: 'View Details',
          onClick: () => console.log('View system details'),
        },
      },
      {
        id: '3',
        type: 'info',
        title: 'New Feature Available',
        message: 'Dependency visualization is now available in the analytics dashboard.',
        timestamp: new Date(Date.now() - 1000 * 60 * 30),
        isRead: true,
        isArchived: false,
        priority: 'low',
        category: 'system',
      },
      {
        id: '4',
        type: 'error',
        title: 'Connection Failed',
        message: 'Failed to connect to the WebSocket server. Retrying...',
        timestamp: new Date(Date.now() - 1000 * 60 * 45),
        isRead: false,
        isArchived: false,
        priority: 'critical',
        category: 'system',
      },
    ];

    setNotifications(mockNotifications);
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'isRead' | 'isArchived'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      timestamp: new Date(),
      isRead: false,
      isArchived: false,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev].slice(0, maxNotifications);
      return updated;
    });

    // Show toast notification
    toast.custom((t) => (
      <NotificationToast
        notification={newNotification}
        onDismiss={() => toast.dismiss(t.id)}
        onClick={() => {
          onNotificationClick?.(newNotification);
          toast.dismiss(t.id);
        }}
      />
    ), {
      duration: autoDismiss ? autoDismissTime : Infinity,
      position,
    });

    // Play sound if enabled
    if (soundEnabledState) {
      playNotificationSound(newNotification.type);
    }
  }, [maxNotifications, autoDismiss, autoDismissTime, position, soundEnabledState, onNotificationClick]);

  const dismissNotification = useCallback((notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    onNotificationDismiss?.(notificationId);
  }, [onNotificationDismiss]);

  const markAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
  }, []);

  const archiveNotification = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, isArchived: true } : n)
    );
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'unread' && notification.isRead) return false;
    if (filter === 'archived' && !notification.isArchived) return false;
    if (filter !== 'all' && filter !== 'unread' && filter !== 'archived' && notification.type !== filter) return false;
    if (categoryFilter !== 'all' && notification.category !== categoryFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter(n => !n.isRead && !n.isArchived).length;

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 hover:bg-green-100';
      case 'error':
        return 'border-red-200 bg-red-50 hover:bg-red-100';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 hover:bg-yellow-100';
      case 'info':
        return 'border-blue-200 bg-blue-50 hover:bg-blue-100';
      default:
        return 'border-gray-200 bg-gray-50 hover:bg-gray-100';
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'critical':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const playNotificationSound = (type: Notification['type']) => {
    // Create audio context for notification sounds
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Different tones for different notification types
      switch (type) {
        case 'success':
          oscillator.frequency.value = 800;
          break;
        case 'error':
          oscillator.frequency.value = 300;
          break;
        case 'warning':
          oscillator.frequency.value = 500;
          break;
        default:
          oscillator.frequency.value = 600;
      }

      oscillator.type = 'sine';
      gainNode.gain.value = 0.1;
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Unable to play notification sound:', error);
    }
  };

  return (
    <>
      <Toaster position={position} />
      
      <div className={cn('relative', className)}>
        {/* Notification Bell */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          <Bell className="w-6 h-6" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Notification Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setSoundEnabled(!soundEnabledState)}
                  className={`p-1 rounded ${soundEnabledState ? 'text-blue-600' : 'text-gray-400'}`}
                  title={soundEnabledState ? 'Sound on' : 'Sound off'}
                >
                  <Bell className="w-4 h-4" />
                </button>
                <button
                  onClick={markAllAsRead}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Mark all as read"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={clearAllNotifications}
                  className="p-1 text-gray-400 hover:text-gray-600"
                  title="Clear all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 border-b border-gray-200 space-y-2">
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All</option>
                  <option value="unread">Unread</option>
                  <option value="archived">Archived</option>
                  <option value="success">Success</option>
                  <option value="error">Error</option>
                  <option value="warning">Warning</option>
                  <option value="info">Info</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as any)}
                  className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="system">System</option>
                  <option value="chat">Chat</option>
                  <option value="file">File</option>
                  <option value="memory">Memory</option>
                  <option value="security">Security</option>
                  <option value="performance">Performance</option>
                </select>
              </div>
            </div>

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No notifications found</p>
                </div>
              ) : (
                filteredNotifications.map(notification => (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 border-b border-gray-100 cursor-pointer transition-colors',
                      getNotificationColor(notification.type),
                      !notification.isRead && 'font-semibold'
                    )}
                    onClick={() => {
                      onNotificationClick?.(notification);
                      markAsRead(notification.id);
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium text-gray-900 truncate">
                            {notification.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <div
                              className={cn(
                                'w-2 h-2 rounded-full',
                                getPriorityColor(notification.priority)
                              )}
                            />
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(notification.timestamp)}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 capitalize">
                              {notification.category}
                            </span>
                            {notification.action && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  notification.action?.onClick();
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                {notification.action.label}
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-1">
                            {!notification.isRead && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                archiveNotification(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Archive className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissNotification(notification.id);
                              }}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

// Notification Toast Component
interface NotificationToastProps {
  notification: Notification;
  onDismiss: () => void;
  onClick: () => void;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onClick,
}) => {
  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error':
        return <X className="w-5 h-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div
      className={cn(
        'max-w-sm p-4 rounded-lg border shadow-lg cursor-pointer transition-all duration-300 transform hover:scale-105',
        getNotificationColor(notification.type)
      )}
      onClick={onClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {getNotificationIcon(notification.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-900">
              {notification.title}
            </h4>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDismiss();
              }}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-500 capitalize">
              {notification.category}
            </span>
            <span className="text-xs text-gray-500">
              {new Date(notification.timestamp).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationCenter;