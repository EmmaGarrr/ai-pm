import { register } from 'workbox-window';
import { openDB } from 'idb-keyval';

// Offline Storage
export interface OfflineStorageConfig {
  dbName: string;
  version: number;
  stores: string[];
}

export class OfflineStorage {
  private db: IDBDatabase | null = null;
  private config: OfflineStorageConfig;

  constructor(config: OfflineStorageConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        this.config.stores.forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
          }
        });
      };
    });
  }

  async store(storeName: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.add(data);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get(storeName: string, id: string): Promise<any> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(storeName: string): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async update(storeName: string, id: string, data: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.put({ ...data, id });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Service Worker Manager
export class ServiceWorkerManager {
  private wb: Workbox | null = null;
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline: boolean = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners();
      this.syncOfflineData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners();
    });
  }

  async register(swPath: string = '/sw.js'): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return;
    }

    try {
      this.wb = new Workbox(swPath);
      
      // Register the service worker
      this.registration = await this.wb.register();
      
      // Set up service worker message handling
      this.setupMessageHandling();
      
      console.log('Service Worker registered successfully');
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }

  private setupMessageHandling(): void {
    if (!this.wb) return;

    this.wb.addEventListener('message', (event) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'CACHE_UPDATED':
          console.log('Cache updated:', data);
          break;
        case 'OFFLINE_READY':
          console.log('Offline mode ready');
          break;
        default:
          console.log('Service Worker message:', type, data);
      }
    });
  }

  async syncOfflineData(): Promise<void> {
    if (!this.isOnline || !this.registration) return;

    try {
      // Trigger background sync
      await this.registration.sync.register('offline-data');
      console.log('Offline data sync triggered');
    } catch (error) {
      console.error('Failed to sync offline data:', error);
    }
  }

  addOnlineStatusListener(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  isOnlineStatus(): boolean {
    return this.isOnline;
  }

  async getCacheNames(): Promise<string[]> {
    if (!this.registration) return [];
    
    return await caches.keys();
  }

  async clearCache(cacheName: string): Promise<void> {
    try {
      const cache = await caches.open(cacheName);
      await cache.delete('/');
      console.log(`Cache ${cacheName} cleared`);
    } catch (error) {
      console.error(`Failed to clear cache ${cacheName}:`, error);
    }
  }

  async clearAllCaches(): Promise<void> {
    try {
      const cacheNames = await this.getCacheNames();
      await Promise.all(cacheNames.map(name => this.clearCache(name)));
      console.log('All caches cleared');
    } catch (error) {
      console.error('Failed to clear all caches:', error);
    }
  }
}

// Offline Queue Manager
export interface QueueItem {
  id: string;
  type: 'api' | 'analytics' | 'sync';
  data: any;
  timestamp: number;
  retryCount: number;
  maxRetries: number;
}

export class OfflineQueue {
  private queue: QueueItem[] = [];
  private isProcessing: boolean = false;
  private storage: OfflineStorage;

  constructor(storage: OfflineStorage) {
    this.storage = storage;
    this.loadQueue();
  }

  private async loadQueue(): Promise<void> {
    try {
      const items = await this.storage.getAll('queue');
      this.queue = items;
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }

  async addItem(item: Omit<QueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    const queueItem: QueueItem = {
      ...item,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      retryCount: 0,
    };

    this.queue.push(queueItem);
    await this.saveQueue();
  }

  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;

    this.isProcessing = true;
    
    try {
      const itemsToProcess = [...this.queue];
      this.queue = [];
      await this.saveQueue();

      for (const item of itemsToProcess) {
        try {
          await this.processItem(item);
        } catch (error) {
          console.error(`Failed to process queue item ${item.id}:`, error);
          
          // Retry logic
          if (item.retryCount < item.maxRetries) {
            item.retryCount++;
            this.queue.push(item);
          }
        }
      }

      if (this.queue.length > 0) {
        await this.saveQueue();
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processItem(item: QueueItem): Promise<void> {
    switch (item.type) {
      case 'api':
        await this.processAPIRequest(item);
        break;
      case 'analytics':
        await this.processAnalyticsEvent(item);
        break;
      case 'sync':
        await this.processSyncOperation(item);
        break;
    }
  }

  private async processAPIRequest(item: QueueItem): Promise<void> {
    const { url, method = 'POST', headers = {}, body } = item.data;
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
  }

  private async processAnalyticsEvent(item: QueueItem): Promise<void> {
    // Process analytics events
    console.log('Processing analytics event:', item.data);
  }

  private async processSyncOperation(item: QueueItem): Promise<void> {
    // Process sync operations
    console.log('Processing sync operation:', item.data);
  }

  private async saveQueue(): Promise<void> {
    try {
      await this.storage.clear('queue');
      for (const item of this.queue) {
        await this.storage.store('queue', item);
      }
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }

  getQueue(): QueueItem[] {
    return [...this.queue];
  }

  async clearQueue(): Promise<void> {
    this.queue = [];
    await this.storage.clear('queue');
  }
}

// React hooks for offline functionality
export const useOfflineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    serviceWorkerReady,
  };
};

export const useOfflineStorage = (storeName: string) => {
  const [storage, setStorage] = useState<OfflineStorage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initStorage = async () => {
      try {
        const offlineStorage = new OfflineStorage({
          dbName: 'offline-db',
          version: 1,
          stores: [storeName, 'queue'],
        });
        
        await offlineStorage.init();
        setStorage(offlineStorage);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize storage'));
      } finally {
        setIsLoading(false);
      }
    };

    initStorage();
  }, [storeName]);

  const store = useCallback(async (data: any) => {
    if (!storage) throw new Error('Storage not initialized');
    return storage.store(storeName, data);
  }, [storage, storeName]);

  const get = useCallback(async (id: string) => {
    if (!storage) throw new Error('Storage not initialized');
    return storage.get(storeName, id);
  }, [storage, storeName]);

  const getAll = useCallback(async () => {
    if (!storage) throw new Error('Storage not initialized');
    return storage.getAll(storeName);
  }, [storage, storeName]);

  const update = useCallback(async (id: string, data: any) => {
    if (!storage) throw new Error('Storage not initialized');
    return storage.update(storeName, id, data);
  }, [storage, storeName]);

  const remove = useCallback(async (id: string) => {
    if (!storage) throw new Error('Storage not initialized');
    return storage.delete(storeName, id);
  }, [storage, storeName]);

  const clear = useCallback(async () => {
    if (!storage) throw new Error('Storage not initialized');
    return storage.clear(storeName);
  }, [storage, storeName]);

  return {
    storage,
    isLoading,
    error,
    store,
    get,
    getAll,
    update,
    delete: remove,
    clear,
  };
};

// Offline Component
export const OfflineIndicator: React.FC<{ className?: string }> = ({ className }) => {
  const { isOnline } = useOfflineStatus();

  if (isOnline) return null;

  return (
    <div className={cn('fixed bottom-4 left-4 bg-yellow-500 text-white px-4 py-2 rounded-lg shadow-lg z-50', className)}>
      <div className="flex items-center space-x-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span>You are offline. Some features may be unavailable.</span>
      </div>
    </div>
  );
};

// Service Worker Registration Component
export const ServiceWorkerRegister: React.FC<{ swPath?: string }> = ({ swPath = '/sw.js' }) => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    const registerSW = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const wb = new Workbox(swPath);
          const reg = await wb.register();
          setRegistration(reg);

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const installingWorker = reg.installing;
            if (installingWorker) {
              installingWorker.addEventListener('statechange', () => {
                if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                }
              });
            }
          });
        } catch (error) {
          console.error('Service Worker registration failed:', error);
        }
      }
    };

    registerSW();
  }, [swPath]);

  const handleUpdate = async () => {
    if (!registration) return;

    setIsInstalling(true);
    try {
      await registration.update();
      window.location.reload();
    } catch (error) {
      console.error('Failed to update service worker:', error);
      setIsInstalling(false);
    }
  };

  if (!updateAvailable) return null;

  return (
    <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg z-50">
      <div className="flex items-center space-x-2">
        <span>New version available!</span>
        <button
          onClick={handleUpdate}
          disabled={isInstalling}
          className="px-3 py-1 bg-white text-blue-500 rounded text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
        >
          {isInstalling ? 'Installing...' : 'Update'}
        </button>
      </div>
    </div>
  );
};

// Export instances
export const offlineStorage = new OfflineStorage({
  dbName: 'offline-db',
  version: 1,
  stores: ['sessions', 'messages', 'files', 'queue'],
});

export const serviceWorkerManager = new ServiceWorkerManager();
export const offlineQueue = new OfflineQueue(offlineStorage);