// Core types
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User types
export interface User extends BaseEntity {
  email: string;
  name: string;
  avatar?: string;
  preferences: UserPreferences;
  isActive: boolean;
  lastLoginAt?: Date;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: NotificationSettings;
  language: string;
  timezone: string;
  dateFormat: string;
}

export interface NotificationSettings {
  email: boolean;
  push: boolean;
  desktop: boolean;
  sound: boolean;
}

// Project types
export interface Project extends BaseEntity {
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  progress: number;
  tags: string[];
  collaborators: ProjectCollaborator[];
  settings: ProjectSettings;
  isArchived: boolean;
  memoryItems: MemoryItem[];
}

export enum ProjectStatus {
  PLANNING = 'planning',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum ProjectPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface ProjectSettings {
  autoSave: boolean;
  notifications: boolean;
  aiAssistance: boolean;
  memoryRetention: number;
  allowCollaboration: boolean;
  isPublic: boolean;
}

export interface ProjectCollaborator {
  id: string;
  userId: string;
  role: CollaboratorRole;
  permissions: Permission[];
  joinedAt: Date;
  user: User;
}

export enum CollaboratorRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  VIEWER = 'viewer'
}

export enum Permission {
  READ = 'read',
  WRITE = 'write',
  DELETE = 'delete',
  MANAGE = 'manage',
  INVITE = 'invite'
}

// Chat types
export interface Message extends BaseEntity {
  sessionId: string;
  userId: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  metadata: MessageMetadata;
  parentId?: string; // For threaded replies
  isEdited: boolean;
  editedAt?: Date;
  reactions: MessageReaction[];
  attachments: Attachment[];
}

export enum MessageType {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
  ACTION = 'action',
  AI = 'ai'
}

export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface MessageMetadata {
  confidence?: number;
  processingTime?: number;
  instructions?: string;
  summary?: string;
  model?: string;
  tokens?: number;
  cost?: number;
  relatedIssues?: string[];
  dependencies?: string[];
  verificationRequired?: boolean;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  userId: string;
  emoji: string;
  createdAt: Date;
  user: User;
}

export interface Attachment {
  id: string;
  filename: string;
  type: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  metadata?: Record<string, any>;
}

export interface ChatSession extends BaseEntity {
  projectId: string;
  title: string;
  description?: string;
  messages: Message[];
  participants: SessionParticipant[];
  settings: SessionSettings;
  isArchived: boolean;
  lastActivityAt: Date;
  messageCount: number;
}

export interface SessionParticipant {
  id: string;
  userId: string;
  role: SessionRole;
  joinedAt: Date;
  lastSeenAt: Date;
  isOnline: boolean;
  user: User;
}

export enum SessionRole {
  HOST = 'host',
  MODERATOR = 'moderator',
  PARTICIPANT = 'participant'
}

export interface SessionSettings {
  autoSave: boolean;
  memoryContext: boolean;
  aiAssistance: boolean;
  allowInvites: boolean;
  isPublic: boolean;
  maxParticipants?: number;
}

// Memory types
export interface MemoryItem extends BaseEntity {
  projectId: string;
  type: MemoryType;
  title: string;
  content: string;
  summary?: string;
  tags: string[];
  relevanceScore: number;
  context: MemoryContext;
  dependencies: string[];
  relatedIssues: string[];
  metadata: MemoryMetadata;
  expiresAt?: Date;
}

export enum MemoryType {
  ERROR = 'error',
  SOLUTION = 'solution',
  CONTEXT = 'context',
  DEPENDENCY = 'dependency',
  DECISION = 'decision',
  REQUIREMENT = 'requirement',
  TASK = 'task',
  NOTE = 'note'
}

export interface MemoryContext {
  files: string[];
  components: string[];
  environments: string[];
  technologies: string[];
}

export interface MemoryMetadata {
  author: string;
  source: string;
  confidence: number;
  verified: boolean;
  verifiedAt?: Date;
  verifiedBy?: string;
  lastAccessed: Date;
  accessCount: number;
}

// WebSocket types
export interface WebSocketEvent {
  type: string;
  data: any;
  timestamp: Date;
  projectId?: string;
  userId?: string;
  sessionId?: string;
  eventId: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  reconnectAttempts: number;
  lastConnected?: Date;
  latency?: number;
  connectionId?: string;
}

export interface WebSocketMessage {
  id: string;
  type: string;
  data: any;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  projectId?: string;
}

// System types
export interface SystemStatus {
  aiService: ServiceStatus;
  memoryService: ServiceStatus;
  websocketService: ServiceStatus;
  database: ServiceStatus;
  redis: ServiceStatus;
  overall: ServiceStatus;
}

export enum ServiceStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown'
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  uptime: number;
  activeConnections: number;
  messageRate: number;
  errorRate: number;
  responseTime: number;
}

export interface SystemAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  description?: string;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  source: string;
  metadata?: Record<string, any>;
}

export enum AlertType {
  SYSTEM = 'system',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  BUSINESS = 'business'
}

export enum AlertSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

// API types
export interface APIResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  errors?: string[];
  timestamp: Date;
  requestId: string;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface APIError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId: string;
}

// Form types
export interface CreateProjectRequest {
  name: string;
  description: string;
  priority: ProjectPriority;
  tags?: string[];
  settings?: Partial<ProjectSettings>;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  progress?: number;
  tags?: string[];
  settings?: Partial<ProjectSettings>;
}

export interface SendMessageRequest {
  sessionId: string;
  content: string;
  attachments?: File[];
  parentId?: string;
}

export interface CreateMemoryItemRequest {
  projectId: string;
  type: MemoryType;
  title: string;
  content: string;
  tags?: string[];
  context?: Partial<MemoryContext>;
  dependencies?: string[];
  expiresAt?: Date;
}

export interface CreateSessionRequest {
  projectId: string;
  title: string;
  description?: string;
  settings?: SessionSettings;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  preferences?: Partial<UserPreferences>;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
  expiresAt: Date;
  permissions: Permission[];
}

// Search and filter types
export interface SearchFilters {
  query?: string;
  type?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  author?: string;
}

export interface SearchResults<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  facets: Record<string, Array<{
    value: string;
    count: number;
  }>>;
  suggestions?: string[];
}

// Event types
export interface AppEvent {
  type: string;
  payload: any;
  timestamp: Date;
  source: string;
  userId?: string;
  sessionId?: string;
  projectId?: string;
}

export interface EventHandler<T = any> {
  (event: AppEvent & { payload: T }): void;
}

// UI types
export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ModalState {
  isOpen: boolean;
  title?: string;
  content?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  onClose?: () => void;
}

// Error types
export interface AppError extends Error {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  timestamp: Date;
  context?: Record<string, any>;
  details?: any;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraints?: Record<string, string>;
}

// Cache types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  metadata?: Record<string, any>;
}

export interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  strategy: 'lru' | 'fifo' | 'lfu';
}

// Performance types
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  networkRequests: number;
  cacheHits: number;
  cacheMisses: number;
  errorRate: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type PaginationParams = {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type DateRange = {
  start: Date;
  end: Date;
};

export type IdOrObject<T extends { id: string }> = string | T;