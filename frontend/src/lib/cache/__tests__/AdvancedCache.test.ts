/**
 * @jest-environment jsdom
 */

import { QueryCache, ImageCache, AssetCache, CacheManager } from '../AdvancedCache';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock IndexedDB
const mockDB = {
  close: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn(),
};

const mockObjectStore = {
  get: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
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

describe('QueryCache', () => {
  let cache: QueryCache;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock IndexedDB
    global.indexedDB = {
      open: jest.fn(() => mockRequest),
    } as any;
    
    mockObjectStore.get.mockImplementation(() => mockRequest);
    mockObjectStore.put.mockImplementation(() => mockRequest);
    mockObjectStore.delete.mockImplementation(() => mockRequest);
    
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockDB.transaction.mockReturnValue(mockTransaction);
    
    cache = new QueryCache('test-query-cache', 300000); // 5 minutes
  });

  describe('Cache Key Generation', () => {
    it('generates keys without parameters', () => {
      const key = cache.generateKey('/api/users');
      expect(key).toBe('test-query-cache/api/users_Xw==');
    });

    it('generates keys with parameters', () => {
      const key = cache.generateKey('/api/users', { page: 1, limit: 10 });
      expect(key).toBe('test-query-cache/api/users_eyJwYWdlIjoxLCJsaW1pdCI6MTB9');
    });

    it('generates keys with complex parameters', () => {
      const key = cache.generateKey('/api/search', { 
        query: 'test', 
        filters: { category: 'books', price: { min: 10, max: 100 } } 
      });
      expect(key).toContain('test-query-cache/api/search_');
    });

    it('handles undefined parameters', () => {
      const key = cache.generateKey('/api/users', undefined);
      expect(key).toBe('test-query-cache/api/users_Xw==');
    });
  });

  describe('Cache Operations', () => {
    beforeEach(async () => {
      mockRequest.onsuccess = jest.fn(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: mockDB } });
        }
      });
      await cache.init();
    });

    it('sets and gets cache data', async () => {
      const mockData = { users: [{ id: 1, name: 'John' }] };
      mockRequest.result = mockData;
      mockRequest.onsuccess = jest.fn();
      
      await cache.set('/api/users', mockData);
      
      mockRequest.onsuccess = jest.fn();
      const result = await cache.get('/api/users');
      
      expect(result).toEqual(mockData);
    });

    it('returns null for cache miss', async () => {
      mockRequest.result = undefined;
      mockRequest.onsuccess = jest.fn();
      
      const result = await cache.get('/api/nonexistent');
      
      expect(result).toBeNull();
    });

    it('respects TTL', async () => {
      const mockData = { users: [{ id: 1, name: 'John' }] };
      mockRequest.result = mockData;
      mockRequest.onsuccess = jest.fn();
      
      await cache.set('/api/users', mockData);
      
      // Mock expired data
      mockRequest.result = {
        data: mockData,
        timestamp: Date.now() - 400000, // Older than TTL
      };
      
      const result = await cache.get('/api/users');
      
      expect(result).toBeNull();
    });

    it('deletes cache entries', async () => {
      mockRequest.onsuccess = jest.fn();
      
      await cache.delete('/api/users');
      
      expect(mockObjectStore.delete).toHaveBeenCalledWith(
        'test-query-cache/api/users_Xw=='
      );
    });

    it('clears all cache entries', async () => {
      mockRequest.onsuccess = jest.fn();
      
      await cache.clear();
      
      expect(mockObjectStore.delete).toHaveBeenCalled();
    });

    it('checks if cache has key', async () => {
      mockRequest.result = { data: 'test' };
      mockRequest.onsuccess = jest.fn();
      
      const hasKey = await cache.has('/api/users');
      
      expect(hasKey).toBe(true);
    });

    it('returns cache statistics', async () => {
      mockRequest.result = { size: 1024, count: 5 };
      mockRequest.onsuccess = jest.fn();
      
      const stats = await cache.getStats();
      
      expect(stats).toEqual({ size: 1024, count: 5 });
    });
  });

  describe('Cache Compression', () => {
    it('compresses large data', async () => {
      const largeData = { data: 'x'.repeat(10000) };
      mockRequest.onsuccess = jest.fn();
      
      await cache.set('/api/large', largeData);
      
      // Should attempt compression for large data
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: expect.any(String),
          data: expect.any(String),
          compressed: expect.any(Boolean),
        })
      );
    });
  });
});

describe('ImageCache', () => {
  let cache: ImageCache;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock IndexedDB
    global.indexedDB = {
      open: jest.fn(() => mockRequest),
    } as any;
    
    mockObjectStore.get.mockImplementation(() => mockRequest);
    mockObjectStore.put.mockImplementation(() => mockRequest);
    mockObjectStore.delete.mockImplementation(() => mockRequest);
    
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockDB.transaction.mockReturnValue(mockTransaction);
    
    cache = new ImageCache('test-image-cache', 50 * 1024 * 1024); // 50MB
  });

  describe('Image Caching', () => {
    beforeEach(async () => {
      mockRequest.onsuccess = jest.fn(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: mockDB } });
        }
      });
      await cache.init();
    });

    it('caches blob data', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      mockRequest.onsuccess = jest.fn();
      
      await cache.set('image1.jpg', mockBlob);
      
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-image-cache_image1.jpg',
          data: mockBlob,
          size: mockBlob.size,
          type: 'image/jpeg',
        })
      );
    });

    it('retrieves blob data', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      mockRequest.result = {
        data: mockBlob,
        timestamp: Date.now(),
      };
      mockRequest.onsuccess = jest.fn();
      
      const result = await cache.get('image1.jpg');
      
      expect(result).toEqual(mockBlob);
    });

    it('handles cache size limits', async () => {
      const mockBlob = new Blob(['x'.repeat(60 * 1024 * 1024)], { type: 'image/jpeg' }); // 60MB
      mockRequest.onsuccess = jest.fn();
      
      await cache.set('large.jpg', mockBlob);
      
      // Should handle size limit appropriately
      expect(mockObjectStore.put).toHaveBeenCalled();
    });

    it('gets image dimensions', async () => {
      const mockBlob = new Blob(['test'], { type: 'image/jpeg' });
      mockRequest.result = {
        data: mockBlob,
        width: 800,
        height: 600,
      };
      mockRequest.onsuccess = jest.fn();
      
      const dimensions = await cache.getImageDimensions('image1.jpg');
      
      expect(dimensions).toEqual({ width: 800, height: 600 });
    });

    it('clears expired images', async () => {
      mockRequest.onsuccess = jest.fn();
      
      await cache.clearExpired();
      
      expect(mockObjectStore.delete).toHaveBeenCalled();
    });
  });
});

describe('AssetCache', () => {
  let cache: AssetCache;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock IndexedDB
    global.indexedDB = {
      open: jest.fn(() => mockRequest),
    } as any;
    
    mockObjectStore.get.mockImplementation(() => mockRequest);
    mockObjectStore.put.mockImplementation(() => mockRequest);
    mockObjectStore.delete.mockImplementation(() => mockRequest);
    
    mockTransaction.objectStore.mockReturnValue(mockObjectStore);
    mockDB.transaction.mockReturnValue(mockTransaction);
    
    cache = new AssetCache('test-asset-cache');
  });

  describe('Asset Caching', () => {
    beforeEach(async () => {
      mockRequest.onsuccess = jest.fn(() => {
        if (mockRequest.onsuccess) {
          mockRequest.onsuccess({ target: { result: mockDB } });
        }
      });
      await cache.init();
    });

    it('caches text assets', async () => {
      mockRequest.onsuccess = jest.fn();
      
      await cache.setTextAsset('script.js', 'console.log("hello");', 'text/javascript');
      
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-asset-cache_script.js',
          data: 'console.log("hello");',
          type: 'text/javascript',
          format: 'text',
        })
      );
    });

    it('caches binary assets', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      mockRequest.onsuccess = jest.fn();
      
      await cache.setBinaryAsset('data.bin', mockArrayBuffer, 'application/octet-stream');
      
      expect(mockObjectStore.put).toHaveBeenCalledWith(
        expect.objectContaining({
          key: 'test-asset-cache_data.bin',
          data: mockArrayBuffer,
          type: 'application/octet-stream',
          format: 'binary',
        })
      );
    });

    it('retrieves text assets', async () => {
      mockRequest.result = {
        data: 'console.log("hello");',
        type: 'text/javascript',
        format: 'text',
      };
      mockRequest.onsuccess = jest.fn();
      
      const result = await cache.getTextAsset('script.js');
      
      expect(result).toBe('console.log("hello");');
    });

    it('retrieves binary assets', async () => {
      const mockArrayBuffer = new ArrayBuffer(1024);
      mockRequest.result = {
        data: mockArrayBuffer,
        type: 'application/octet-stream',
        format: 'binary',
      };
      mockRequest.onsuccess = jest.fn();
      
      const result = await cache.getBinaryAsset('data.bin');
      
      expect(result).toEqual(mockArrayBuffer);
    });

    it('checks asset type support', () => {
      expect(cache.isAssetTypeSupported('text/javascript')).toBe(true);
      expect(cache.isAssetTypeSupported('application/json')).toBe(true);
      expect(cache.isAssetTypeSupported('image/jpeg')).toBe(true);
      expect(cache.isAssetTypeSupported('application/xml')).toBe(true);
      expect(cache.isAssetTypeSupported('unknown/type')).toBe(false);
    });

    it('gets asset metadata', async () => {
      mockRequest.result = {
        data: 'test',
        type: 'text/plain',
        size: 4,
        timestamp: Date.now(),
        checksum: 'abc123',
      };
      mockRequest.onsuccess = jest.fn();
      
      const metadata = await cache.getAssetMetadata('test.txt');
      
      expect(metadata).toEqual({
        type: 'text/plain',
        size: 4,
        timestamp: expect.any(Number),
        checksum: 'abc123',
      });
    });
  });
});

describe('CacheManager', () => {
  let manager: CacheManager;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock browser caches API
    global.caches = {
      open: jest.fn().mockResolvedValue({
        keys: jest.fn().mockResolvedValue([
          { url: 'https://example.com/script.js' },
          { url: 'https://example.com/style.css' },
        ]),
        delete: jest.fn().mockResolvedValue(true),
        match: jest.fn().mockResolvedValue(new Response('test content')),
        add: jest.fn().mockResolvedValue(undefined),
        addAll: jest.fn().mockResolvedValue(undefined),
      }),
      keys: jest.fn().mockResolvedValue(['cache-v1', 'cache-v2']),
      delete: jest.fn().mockResolvedValue(true),
    } as any;
    
    manager = new CacheManager();
  });

  describe('Cache Management', () => {
    it('clears all caches', async () => {
      await manager.clearAllCaches();
      
      expect(global.caches.keys).toHaveBeenCalled();
      expect(global.caches.delete).toHaveBeenCalledWith('cache-v1');
      expect(global.caches.delete).toHaveBeenCalledWith('cache-v2');
    });

    it('clears specific cache', async () => {
      await manager.clearCache('cache-v1');
      
      expect(global.caches.delete).toHaveBeenCalledWith('cache-v1');
    });

    it('gets cache statistics', async () => {
      const stats = await manager.getCacheStats();
      
      expect(stats).toEqual({
        caches: ['cache-v1', 'cache-v2'],
        totalCaches: 2,
      });
    });

    it('checks cache support', () => {
      expect(manager.isCacheSupported()).toBe(true);
    });

    it('handles no cache support', () => {
      global.caches = undefined as any;
      
      expect(manager.isCacheSupported()).toBe(false);
    });
  });

  describe('Cache Strategies', () => {
    it('implements cache-first strategy', async () => {
      const response = await manager.cacheFirst('https://example.com/api/data');
      
      expect(response).toBeInstanceOf(Response);
    });

    it('implements network-first strategy', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue(new Response('network data'));
      
      const response = await manager.networkFirst('https://example.com/api/data');
      
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/data');
      expect(response).toBeInstanceOf(Response);
    });

    it('implements stale-while-revalidate strategy', async () => {
      const response = await manager.staleWhileRevalidate('https://example.com/api/data');
      
      expect(response).toBeInstanceOf(Response);
    });

    it('implements cache-only strategy', async () => {
      const response = await manager.cacheOnly('https://example.com/api/data');
      
      expect(response).toBeInstanceOf(Response);
    });

    it('implements network-only strategy', async () => {
      global.fetch = jest.fn().mockResolvedValue(new Response('network data'));
      
      const response = await manager.networkOnly('https://example.com/api/data');
      
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/api/data');
      expect(response).toBeInstanceOf(Response);
    });
  });

  describe('Prefetching', () => {
    it('prefetches multiple URLs', async () => {
      const urls = [
        'https://example.com/script.js',
        'https://example.com/style.css',
      ];
      
      await manager.prefetch(urls);
      
      expect(global.caches.open).toHaveBeenCalled();
    });

    it('handles prefetch errors gracefully', async () => {
      global.caches.open = jest.fn().mockRejectedValue(new Error('Cache error'));
      
      const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      await manager.prefetch(['https://example.com/test.js']);
      
      expect(mockConsoleError).toHaveBeenCalled();
      
      mockConsoleError.mockRestore();
    });
  });

  describe('Cache Invalidation', () => {
    it('invalidates cache by pattern', async () => {
      await manager.invalidateByPattern('/api/*');
      
      expect(global.caches.open).toHaveBeenCalled();
    });

    it('invalidates cache by timestamp', async () => {
      const timestamp = Date.now() - 86400000; // 24 hours ago
      
      await manager.invalidateByTimestamp(timestamp);
      
      expect(global.caches.open).toHaveBeenCalled();
    });

    it('clears expired cache entries', async () => {
      await manager.clearExpired();
      
      expect(global.caches.open).toHaveBeenCalled();
    });
  });
});