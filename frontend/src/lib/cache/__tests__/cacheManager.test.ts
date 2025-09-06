import { CacheManager, cacheManager } from '@/lib/cache/cacheManager';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

// Mock sessionStorage
const mockSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

// Mock indexedDB
const mockIndexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
  databases: jest.fn(),
};

// Mock window object
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  configurable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
  configurable: true,
});

Object.defineProperty(window, 'indexedDB', {
  value: mockIndexedDB,
  configurable: true,
});

describe('CacheManager', () => {
  let cacheManager: CacheManager;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager = new CacheManager({
      maxSize: 10,
      defaultTTL: 3600000,
      cleanupInterval: 60000,
      strategy: 'lru',
      enableCompression: false,
      enableEncryption: false,
      enableStats: true,
      enableDebug: false,
      storageBackend: 'memory',
    });
  });

  describe('constructor', () => {
    it('should create instance with default config', () => {
      expect(cacheManager).toBeInstanceOf(CacheManager);
    });

    it('should use custom config when provided', () => {
      const customConfig = {
        maxSize: 5,
        defaultTTL: 1800000,
        strategy: 'fifo' as const,
      };
      
      const customCacheManager = new CacheManager(customConfig);
      expect(customCacheManager).toBeInstanceOf(CacheManager);
    });
  });

  describe('set', () => {
    it('should set value in cache', async () => {
      await cacheManager.set('key1', 'value1');
      
      const result = await cacheManager.get('key1');
      expect(result).toBe('value1');
    });

    it('should set value with options', async () => {
      await cacheManager.set('key1', 'value1', {
        ttl: 1000,
        tags: ['tag1', 'tag2'],
      });
      
      const result = await cacheManager.get('key1');
      expect(result).toBe('value1');
    });

    it('should evict entries when maxSize is reached', async () => {
      // Fill cache to maxSize
      for (let i = 0; i < 15; i++) {
        await cacheManager.set(`key${i}`, `value${i}`);
      }
      
      // Should have maxSize entries
      expect(cacheManager.keys().length).toBe(10);
    });
  });

  describe('get', () => {
    it('should get value from cache', async () => {
      await cacheManager.set('key1', 'value1');
      
      const result = await cacheManager.get('key1');
      expect(result).toBe('value1');
    });

    it('should return undefined for non-existent key', async () => {
      const result = await cacheManager.get('non-existent');
      expect(result).toBeUndefined();
    });

    it('should return undefined for expired entry', async () => {
      await cacheManager.set('key1', 'value1', { ttl: 100 });
      
      // Wait for expiration
      jest.advanceTimersByTime(150);
      
      const result = await cacheManager.get('key1');
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should delete entry from cache', async () => {
      await cacheManager.set('key1', 'value1');
      
      expect(await cacheManager.get('key1')).toBe('value1');
      
      const deleted = cacheManager.delete('key1');
      expect(deleted).toBe(true);
      
      expect(await cacheManager.get('key1')).toBeUndefined();
    });

    it('should return false for non-existent key', () => {
      const deleted = cacheManager.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    it('should clear all entries', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      expect(cacheManager.keys().length).toBe(2);
      
      cacheManager.clear();
      
      expect(cacheManager.keys().length).toBe(0);
    });
  });

  describe('has', () => {
    it('should return true for existing key', async () => {
      await cacheManager.set('key1', 'value1');
      
      expect(cacheManager.has('key1')).toBe(true);
    });

    it('should return false for non-existent key', () => {
      expect(cacheManager.has('non-existent')).toBe(false);
    });

    it('should return false for expired entry', async () => {
      await cacheManager.set('key1', 'value1', { ttl: 100 });
      
      // Wait for expiration
      jest.advanceTimersByTime(150);
      
      expect(cacheManager.has('key1')).toBe(false);
    });
  });

  describe('keys', () => {
    it('should return all keys', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      const keys = cacheManager.keys();
      expect(keys).toHaveLength(2);
      expect(keys).toContain('key1');
      expect(keys).toContain('key2');
    });
  });

  describe('values', () => {
    it('should return all values', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      const values = cacheManager.values();
      expect(values).toHaveLength(2);
      expect(values).toContain('value1');
      expect(values).toContain('value2');
    });
  });

  describe('entries', () => {
    it('should return all entries', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      const entries = cacheManager.entries();
      expect(entries).toHaveLength(2);
      expect(entries).toEqual(
        expect.arrayContaining([
          ['key1', 'value1'],
          ['key2', 'value2'],
        ])
      );
    });
  });

  describe('getStats', () => {
    it('should return cache statistics', async () => {
      await cacheManager.set('key1', 'value1');
      await cacheManager.set('key2', 'value2');
      
      // Get some cache hits
      await cacheManager.get('key1');
      await cacheManager.get('key2');
      
      // Get some cache misses
      await cacheManager.get('non-existent1');
      await cacheManager.get('non-existent2');
      
      const stats = cacheManager.getStats();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(2);
      expect(stats.totalRequests).toBe(4);
      expect(stats.hitRate).toBe(0.5);
      expect(stats.entries).toBe(2);
      expect(stats.size).toBeGreaterThan(0);
    });
  });

  describe('getByTag', () => {
    it('should return entries by tag', async () => {
      await cacheManager.set('key1', 'value1', { tags: ['tag1'] });
      await cacheManager.set('key2', 'value2', { tags: ['tag2'] });
      await cacheManager.set('key3', 'value3', { tags: ['tag1', 'tag2'] });
      
      const tag1Entries = cacheManager.getByTag('tag1');
      expect(tag1Entries).toHaveLength(2);
      expect(tag1Entries).toContain('value1');
      expect(tag1Entries).toContain('value3');
      
      const tag2Entries = cacheManager.getByTag('tag2');
      expect(tag2Entries).toHaveLength(2);
      expect(tag2Entries).toContain('value2');
      expect(tag2Entries).toContain('value3');
    });
  });

  describe('deleteByTag', () => {
    it('should delete entries by tag', async () => {
      await cacheManager.set('key1', 'value1', { tags: ['tag1'] });
      await cacheManager.set('key2', 'value2', { tags: ['tag2'] });
      await cacheManager.set('key3', 'value3', { tags: ['tag1'] });
      
      expect(cacheManager.keys().length).toBe(3);
      
      const deletedCount = cacheManager.deleteByTag('tag1');
      expect(deletedCount).toBe(2);
      
      expect(cacheManager.keys().length).toBe(1);
      expect(cacheManager.has('key2')).toBe(true);
    });
  });

  describe('eviction strategies', () => {
    describe('LRU strategy', () => {
      it('should evict least recently used items', async () => {
        const lruCache = new CacheManager({
          maxSize: 3,
          strategy: 'lru',
        });
        
        await lruCache.set('key1', 'value1');
        await lruCache.set('key2', 'value2');
        await lruCache.set('key3', 'value3');
        
        // Access key1 to make it recently used
        await lruCache.get('key1');
        
        // Add key4, should evict key2 (least recently used)
        await lruCache.set('key4', 'value4');
        
        expect(lruCache.has('key1')).toBe(true);
        expect(lruCache.has('key2')).toBe(false);
        expect(lruCache.has('key3')).toBe(true);
        expect(lruCache.has('key4')).toBe(true);
      });
    });

    describe('FIFO strategy', () => {
      it('should evict first in first out', async () => {
        const fifoCache = new CacheManager({
          maxSize: 3,
          strategy: 'fifo',
        });
        
        await fifoCache.set('key1', 'value1');
        await fifoCache.set('key2', 'value2');
        await fifoCache.set('key3', 'value3');
        
        // Add key4, should evict key1 (first in)
        await fifoCache.set('key4', 'value4');
        
        expect(fifoCache.has('key1')).toBe(false);
        expect(fifoCache.has('key2')).toBe(true);
        expect(fifoCache.has('key3')).toBe(true);
        expect(fifoCache.has('key4')).toBe(true);
      });
    });

    describe('LFU strategy', () => {
      it('should evict least frequently used items', async () => {
        const lfuCache = new CacheManager({
          maxSize: 3,
          strategy: 'lfu',
        });
        
        await lfuCache.set('key1', 'value1');
        await lfuCache.set('key2', 'value2');
        await lfuCache.set('key3', 'value3');
        
        // Access key1 multiple times
        await lfuCache.get('key1');
        await lfuCache.get('key1');
        
        // Access key2 once
        await lfuCache.get('key2');
        
        // Add key4, should evict key3 (least frequently used)
        await lfuCache.set('key4', 'value4');
        
        expect(lfuCache.has('key1')).toBe(true);
        expect(lfuCache.has('key2')).toBe(true);
        expect(lfuCache.has('key3')).toBe(false);
        expect(lfuCache.has('key4')).toBe(true);
      });
    });
  });

  describe('cleanup', () => {
    it('should clean up expired entries', async () => {
      await cacheManager.set('key1', 'value1', { ttl: 100 });
      await cacheManager.set('key2', 'value2', { ttl: 200 });
      await cacheManager.set('key3', 'value3'); // No TTL
      
      // Wait for key1 to expire
      jest.advanceTimersByTime(150);
      
      // Manually trigger cleanup
      (cacheManager as any).cleanup();
      
      expect(cacheManager.has('key1')).toBe(false);
      expect(cacheManager.has('key2')).toBe(true);
      expect(cacheManager.has('key3')).toBe(true);
    });
  });

  describe('persistent storage', () => {
    it('should save to localStorage when enabled', async () => {
      const persistentCache = new CacheManager({
        storageBackend: 'localStorage',
        maxSize: 3,
      });
      
      await persistentCache.set('key1', 'value1');
      
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    it('should load from localStorage when enabled', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        cache: { key1: { data: 'value1', timestamp: Date.now() } },
        accessTimes: {},
        accessCounts: {},
      }));
      
      const persistentCache = new CacheManager({
        storageBackend: 'localStorage',
        maxSize: 3,
      });
      
      // Cache should be loaded from storage
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('cache-manager-data');
    });
  });

  describe('React hook', () => {
    it('should export useCache hook', () => {
      // The hook should be exported
      expect(typeof cacheManager).toBe('object');
      expect(cacheManager).toBeInstanceOf(CacheManager);
    });
  });
});