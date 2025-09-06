/**
 * @jest-environment jsdom
 */

import { OfflineStorage, ServiceWorkerManager, OfflineQueue, offlineStorage, serviceWorkerManager, offlineQueue } from '../OfflineSupport';

// Mock IndexedDB
const mockDB = {
  objectStoreNames: {
    contains: jest.fn(),
  },
  transaction: jest.fn(),
  close: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(),
};

const mockObjectStore = {
  add: jest.fn(),
  get: jest.fn(),
  getAll: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  clear: jest.fn(),
};

const mockRequest = {
  onsuccess: null,
  onerror: null,
  result: null,
  error: null,
};

jest.mock('idb-keyval', () => ({
  openDB: jest.fn(),
}));

describe('OfflineStorage', () => {
  let storage: OfflineStorage;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock IndexedDB
    global.indexedDB = {
      open: jest.fn(() => mockRequest),
    } as any;
    
    mockObjectStore.add.mockImplementation(() => mockRequest);
    mockObjectStore.get.mockImplementation(() => mockRequest);
    mockObjectStore.getAll.mockImplementation(() => mockRequest);
    mockObjectStore.put.mockImplementation(() => mockRequest);
    mockObjectStore.delete.mockImplementation(() => mockRequest);
    mockObjectStore.clear.mockImplementation(() => mockRequest);
    
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockDB.transaction.mockReturnValue(mockTransaction);
    
    storage = new OfflineStorage({
      dbName: 'test-db',
      version: 1,
      stores: ['test-store'],
    });
  });

  describe('Initialization', () => {
    it('initializes database successfully', async () => {
      mockRequest.onsuccess = jest.fn();
      mockRequest.onerror = jest.fn();
      mockDB.objectStoreNames.contains.mockReturnValue(false);
      
      const upgradeNeeded = {
        target: { result: mockDB },
      };
      
      await storage.init();
      
      expect(global.indexedDB.open).toHaveBeenCalledWith('test-db', 1);
    });

    it('handles initialization errors', async () => {
      mockRequest.onsuccess = null;
      mockRequest.onerror = jest.fn();
      mockRequest.error = new Error('Database error');
      
      await expect(storage.init()).rejects.toThrow('Database error');
    });
  });

  describe('Store Operations', () => {
    beforeEach(async () => {
      mockDB.objectStoreNames.contains.mockReturnValue(true);
      mockRequest.onsuccess = jest.fn(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: mockDB } });
        }
      });
      await storage.init();
    });

    it('stores data successfully', async () => {
      mockRequest.onsuccess = jest.fn();
      
      await storage.store('test-store', { id: '1', data: 'test' });
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['test-store'], 'readwrite');
      expect(mockObjectStore.add).toHaveBeenCalledWith({ id: '1', data: 'test' });
    });

    it('retrieves data by id', async () => {
      const mockData = { id: '1', data: 'test' };
      mockRequest.result = mockData;
      mockRequest.onsuccess = jest.fn();
      
      const result = await storage.get('test-store', '1');
      
      expect(mockDB.transaction).toHaveBeenCalledWith(['test-store'], 'readonly');
      expect(mockObjectStore.get).toHaveBeenCalledWith('1');
      expect(result).toEqual(mockData);
    });

    it('retrieves all data', async () => {
      const mockData = [{ id: '1', data: 'test' }, { id: '2', data: 'test2' }];
      mockRequest.result = mockData;
      mockRequest.onsuccess = jest.fn();
      
      const result = await storage.getAll('test-store');
      
      expect(mockObjectStore.getAll).toHaveBeenCalled();
      expect(result).toEqual(mockData);
    });

    it('updates data', async () => {
      mockRequest.onsuccess = jest.fn();
      
      await storage.update('test-store', '1', { data: 'updated' });
      
      expect(mockObjectStore.put).toHaveBeenCalledWith({ id: '1', data: 'updated' });
    });

    it('deletes data', async () => {
      mockRequest.onsuccess = jest.fn();
      
      await storage.delete('test-store', '1');
      
      expect(mockObjectStore.delete).toHaveBeenCalledWith('1');
    });

    it('clears store', async () => {
      mockRequest.onsuccess = jest.fn();
      
      await storage.clear('test-store');
      
      expect(mockObjectStore.clear).toHaveBeenCalled();
    });

    it('handles database not initialized error', async () => {
      const uninitializedStorage = new OfflineStorage({
        dbName: 'test-db',
        version: 1,
        stores: ['test-store'],
      });
      
      await expect(uninitializedStorage.store('test-store', {})).rejects.toThrow('Database not initialized');
    });
  });
});

describe('ServiceWorkerManager', () => {
  let manager: ServiceWorkerManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock navigator
    global.navigator = {
      onLine: true,
      serviceWorker: {
        register: jest.fn(),
      },
    } as any;
    
    // Mock window
    global.window = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
    } as any;
    
    // Mock Workbox
    global.Workbox = jest.fn(() => ({
      register: jest.fn(),
      addEventListener: jest.fn(),
    }));
    
    manager = new ServiceWorkerManager();
  });

  describe('Constructor', () => {
    it('sets up event listeners', () => {
      expect(global.window.addEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(global.window.addEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('sets initial online status', () => {
      expect(manager.isOnlineStatus()).toBe(true);
    });
  });

  describe('Online Status Management', () => {
    it('updates online status on online event', () => {
      const onlineHandler = (global.window.addEventListener as jest.Mock).mock.calls[0][1];
      
      onlineHandler({ type: 'online' });
      
      expect(manager.isOnlineStatus()).toBe(true);
    });

    it('updates online status on offline event', () => {
      const offlineHandler = (global.window.addEventListener as jest.Mock).mock.calls[1][1];
      
      offlineHandler({ type: 'offline' });
      
      expect(manager.isOnlineStatus()).toBe(false);
    });

    it('notifies listeners of status changes', () => {
      const mockListener = jest.fn();
      manager.addOnlineStatusListener(mockListener);
      
      const onlineHandler = (global.window.addEventListener as jest.Mock).mock.calls[0][1];
      onlineHandler({ type: 'online' });
      
      expect(mockListener).toHaveBeenCalledWith(true);
    });
  });

  describe('Service Worker Registration', () => {
    it('registers service worker successfully', async () => {
      const mockRegistration = {
        addEventListener: jest.fn(),
        sync: {
          register: jest.fn(),
        },
      };
      
      const mockWorkbox = {
        register: jest.fn().mockResolvedValue(mockRegistration),
        addEventListener: jest.fn(),
      };
      
      global.Workbox = jest.fn(() => mockWorkbox);
      
      await manager.register('/sw.js');
      
      expect(global.Workbox).toHaveBeenCalledWith('/sw.js');
      expect(mockWorkbox.register).toHaveBeenCalled();
    });

    it('handles service worker not supported', async () => {
      global.navigator.serviceWorker = undefined;
      
      const mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      await manager.register('/sw.js');
      
      expect(mockConsoleWarn).toHaveBeenCalledWith('Service Worker not supported');
      
      mockConsoleWarn.mockRestore();
    });

    it('handles registration errors', async () => {
      const mockWorkbox = {
        register: jest.fn().mockRejectedValue(new Error('Registration failed')),
      };
      
      global.Workbox = jest.fn(() => mockWorkbox);
      
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await manager.register('/sw.js');
      
      expect(mockConsoleError).toHaveBeenCalledWith('Service Worker registration failed:', expect.any(Error));
      
      mockConsoleError.mockRestore();
    });
  });

  describe('Background Sync', () => {
    it('triggers background sync when online', async () => {
      const mockRegistration = {
        sync: {
          register: jest.fn().mockResolvedValue(undefined),
        },
      };
      
      manager['registration'] = mockRegistration;
      
      await manager.syncOfflineData();
      
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('offline-data');
    });

    it('does not sync when offline', async () => {
      manager['isOnline'] = false;
      
      await manager.syncOfflineData();
      
      // Should not call sync.register
    });

    it('handles sync errors gracefully', async () => {
      const mockRegistration = {
        sync: {
          register: jest.fn().mockRejectedValue(new Error('Sync failed')),
        },
      };
      
      manager['registration'] = mockRegistration;
      
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await manager.syncOfflineData();
      
      expect(mockConsoleError).toHaveBeenCalledWith('Failed to sync offline data:', expect.any(Error));
      
      mockConsoleError.mockRestore();
    });
  });

  describe('Cache Management', () => {
    beforeEach(() => {
      manager['registration'] = {
        sync: { register: jest.fn() },
      };
    });

    it('gets cache names', async () => {
      const mockCacheNames = ['cache1', 'cache2'];
      global.caches = {
        keys: jest.fn().mockResolvedValue(mockCacheNames),
      } as any;
      
      const result = await manager.getCacheNames();
      
      expect(result).toEqual(mockCacheNames);
    });

    it('clears specific cache', async () => {
      const mockCache = {
        delete: jest.fn().mockResolvedValue(true),
      };
      
      global.caches = {
        open: jest.fn().mockResolvedValue(mockCache),
      } as any;
      
      await manager.clearCache('cache1');
      
      expect(global.caches.open).toHaveBeenCalledWith('cache1');
      expect(mockCache.delete).toHaveBeenCalledWith('/');
    });

    it('clears all caches', async () => {
      const mockCacheNames = ['cache1', 'cache2'];
      const mockCache = {
        delete: jest.fn().mockResolvedValue(true),
      };
      
      global.caches = {
        keys: jest.fn().mockResolvedValue(mockCacheNames),
        open: jest.fn().mockResolvedValue(mockCache),
      } as any;
      
      await manager.clearAllCaches();
      
      expect(global.caches.keys).toHaveBeenCalled();
      expect(global.caches.open).toHaveBeenCalledWith('cache1');
      expect(global.caches.open).toHaveBeenCalledWith('cache2');
    });
  });
});

describe('OfflineQueue', () => {
  let queue: OfflineQueue;
  let mockStorage: jest.Mocked<OfflineStorage>;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStorage = {
      init: jest.fn(),
      store: jest.fn(),
      get: jest.fn(),
      getAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      clear: jest.fn(),
    } as any;
    
    queue = new OfflineQueue(mockStorage);
  });

  describe('Queue Management', () => {
    it('adds item to queue', async () => {
      const item = {
        type: 'api' as const,
        data: { url: '/api/test', method: 'POST' },
        maxRetries: 3,
      };
      
      await queue.addItem(item);
      
      expect(mockStorage.store).toHaveBeenCalledWith('queue', expect.objectContaining({
        type: 'api',
        data: item.data,
        maxRetries: 3,
        retryCount: 0,
      }));
    });

    it('processes queue items', async () => {
      const queueItems = [
        {
          id: '1',
          type: 'api' as const,
          data: { url: '/api/test1', method: 'POST' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: '2',
          type: 'analytics' as const,
          data: { event: 'test' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];
      
      mockStorage.getAll.mockResolvedValue(queueItems);
      
      // Mock successful API calls
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
      });
      
      await queue.processQueue();
      
      expect(mockStorage.clear).toHaveBeenCalledWith('queue');
      expect(global.fetch).toHaveBeenCalledWith('/api/test1', expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }));
    });

    it('handles processing errors and retries', async () => {
      const queueItems = [
        {
          id: '1',
          type: 'api' as const,
          data: { url: '/api/test', method: 'POST' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];
      
      mockStorage.getAll.mockResolvedValue(queueItems);
      
      // Mock failed API call
      global.fetch = jest.fn().mockRejectedValue(new Error('API failed'));
      
      await queue.processQueue();
      
      expect(mockStorage.store).toHaveBeenCalledWith('queue', expect.objectContaining({
        id: '1',
        retryCount: 1,
      }));
    });

    it('removes items after max retries', async () => {
      const queueItems = [
        {
          id: '1',
          type: 'api' as const,
          data: { url: '/api/test', method: 'POST' },
          timestamp: Date.now(),
          retryCount: 3,
          maxRetries: 3,
        },
      ];
      
      mockStorage.getAll.mockResolvedValue(queueItems);
      
      global.fetch = jest.fn().mockRejectedValue(new Error('API failed'));
      
      await queue.processQueue();
      
      // Should not retry after max retries
      expect(mockStorage.store).not.toHaveBeenCalled();
    });

    it('processes different item types', async () => {
      const queueItems = [
        {
          id: '1',
          type: 'api' as const,
          data: { url: '/api/test', method: 'POST' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: '2',
          type: 'analytics' as const,
          data: { event: 'test' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
        {
          id: '3',
          type: 'sync' as const,
          data: { action: 'sync' },
          timestamp: Date.now(),
          retryCount: 0,
          maxRetries: 3,
        },
      ];
      
      mockStorage.getAll.mockResolvedValue(queueItems);
      
      global.fetch = jest.fn().mockResolvedValue({ ok: true });
      
      await queue.processQueue();
      
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only API calls
    });
  });

  describe('Queue Operations', () => {
    it('gets queue items', () => {
      const mockItems = [{ id: '1', type: 'api' as const }];
      queue['queue'] = mockItems;
      
      const result = queue.getQueue();
      
      expect(result).toEqual(mockItems);
    });

    it('clears queue', async () => {
      await queue.clearQueue();
      
      expect(mockStorage.clear).toHaveBeenCalledWith('queue');
      expect(queue['queue']).toEqual([]);
    });
  });
});

describe('Exported Instances', () => {
  it('exports configured instances', () => {
    expect(offlineStorage).toBeInstanceOf(OfflineStorage);
    expect(serviceWorkerManager).toBeInstanceOf(ServiceWorkerManager);
    expect(offlineQueue).toBeInstanceOf(OfflineQueue);
  });
});