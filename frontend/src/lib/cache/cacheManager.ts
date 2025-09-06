import { useGlobalStore } from '../store';
import { CacheEntry, CacheConfig } from '../types';

export interface CacheManagerConfig extends CacheConfig {
  enableCompression: boolean;
  enableEncryption: boolean;
  encryptionKey?: string;
  enableStats: boolean;
  enableDebug: boolean;
  storageBackend: 'memory' | 'localStorage' | 'sessionStorage' | 'indexedDB';
}

export interface CacheStats {
  hits: number;
  misses: number;
  totalRequests: number;
  hitRate: number;
  size: number;
  entries: number;
  averageAccessTime: number;
  lastCleanup: Date;
}

export interface CacheOptions<T = any> {
  ttl?: number;
  tags?: string[];
  metadata?: Record<string, any>;
  compress?: boolean;
  encrypt?: boolean;
  strategy?: 'lru' | 'lfu' | 'fifo' | 'ttl';
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private accessTimes: Map<string, number> = new Map();
  private accessCounts: Map<string, number> = new Map();
  private stats: CacheStats;
  private config: CacheManagerConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheManagerConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      strategy: 'lru',
      enableCompression: false,
      enableEncryption: false,
      enableStats: true,
      enableDebug: false,
      storageBackend: 'memory',
      ...config,
    };

    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      size: 0,
      entries: 0,
      averageAccessTime: 0,
      lastCleanup: new Date(),
    };

    this.initializeCache();
    this.startCleanupTimer();
  }

  private initializeCache(): void {
    // Load from persistent storage if enabled
    if (this.config.storageBackend !== 'memory') {
      this.loadFromStorage();
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private generateKey(key: string, options?: CacheOptions): string {
    const prefix = options?.tags?.length ? options.tags.join(':') + ':' : '';
    return `${prefix}${key}`;
  }

  private isExpired(entry: CacheEntry<any>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private getSize(entry: CacheEntry<any>): number {
    return JSON.stringify(entry.data).length;
  }

  private async compressData<T>(data: T): Promise<T> {
    if (!this.config.enableCompression) return data;
    
    // Simple compression for demonstration
    // In a real implementation, you'd use a proper compression library
    try {
      const jsonString = JSON.stringify(data);
      // This is a placeholder for actual compression
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to compress data:', error);
      return data;
    }
  }

  private async decompressData<T>(data: T): Promise<T> {
    if (!this.config.enableCompression) return data;
    
    // Simple decompression for demonstration
    // In a real implementation, you'd use a proper decompression library
    try {
      const jsonString = JSON.stringify(data);
      // This is a placeholder for actual decompression
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to decompress data:', error);
      return data;
    }
  }

  private async encryptData<T>(data: T): Promise<T> {
    if (!this.config.enableEncryption || !this.config.encryptionKey) return data;
    
    // Simple encryption for demonstration
    // In a real implementation, you'd use a proper encryption library
    try {
      const jsonString = JSON.stringify(data);
      // This is a placeholder for actual encryption
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to encrypt data:', error);
      return data;
    }
  }

  private async decryptData<T>(data: T): Promise<T> {
    if (!this.config.enableEncryption || !this.config.encryptionKey) return data;
    
    // Simple decryption for demonstration
    // In a real implementation, you'd use a proper decryption library
    try {
      const jsonString = JSON.stringify(data);
      // This is a placeholder for actual decryption
      return JSON.parse(jsonString);
    } catch (error) {
      console.warn('Failed to decrypt data:', error);
      return data;
    }
  }

  private updateAccessStats(key: string): void {
    const now = Date.now();
    this.accessTimes.set(key, now);
    this.accessCounts.set(key, (this.accessCounts.get(key) || 0) + 1);
  }

  private getEvictionCandidates(): string[] {
    const candidates: string[] = [];
    
    switch (this.config.strategy) {
      case 'lru':
        // Least Recently Used
        const sortedByAccess = Array.from(this.accessTimes.entries())
          .sort(([, a], [, b]) => a - b);
        candidates.push(...sortedByAccess.map(([key]) => key));
        break;
        
      case 'lfu':
        // Least Frequently Used
        const sortedByCount = Array.from(this.accessCounts.entries())
          .sort(([, a], [, b]) => a - b);
        candidates.push(...sortedByCount.map(([key]) => key));
        break;
        
      case 'fifo':
        // First In First Out
        candidates.push(...Array.from(this.cache.keys()));
        break;
        
      case 'ttl':
        // Shortest Time To Live
        const entriesWithTTL = Array.from(this.cache.entries())
          .filter(([, entry]) => entry.ttl)
          .sort(([, a], [, b]) => (a.ttl || 0) - (b.ttl || 0));
        candidates.push(...entriesWithTTL.map(([key]) => key));
        break;
    }
    
    return candidates;
  }

  private evictEntries(): void {
    while (this.cache.size >= this.config.maxSize) {
      const candidates = this.getEvictionCandidates();
      if (candidates.length === 0) break;
      
      const keyToEvict = candidates[0];
      this.delete(keyToEvict);
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.delete(key);
        cleanedCount++;
      }
    }

    this.stats.lastCleanup = new Date();

    if (this.config.enableDebug && cleanedCount > 0) {
      console.log(`Cache cleanup: removed ${cleanedCount} expired entries`);
    }

    // Update persistent storage
    if (this.config.storageBackend !== 'memory') {
      this.saveToStorage();
    }
  }

  private async loadFromStorage(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storage = window[this.config.storageBackend];
      const cachedData = storage.getItem('cache-manager-data');
      
      if (cachedData) {
        const data = JSON.parse(cachedData);
        this.cache = new Map(Object.entries(data.cache || {}));
        this.accessTimes = new Map(Object.entries(data.accessTimes || {}));
        this.accessCounts = new Map(Object.entries(data.accessCounts || {}));
        
        if (this.config.enableDebug) {
          console.log('Cache loaded from storage:', this.cache.size, 'entries');
        }
      }
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
    }
  }

  private async saveToStorage(): Promise<void> {
    if (typeof window === 'undefined' || this.config.storageBackend === 'memory') return;

    try {
      const storage = window[this.config.storageBackend];
      const data = {
        cache: Object.fromEntries(this.cache),
        accessTimes: Object.fromEntries(this.accessTimes),
        accessCounts: Object.fromEntries(this.accessCounts),
      };
      
      storage.setItem('cache-manager-data', JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  // Public methods
  async set<T>(key: string, data: T, options?: CacheOptions<T>): Promise<void> {
    const fullKey = this.generateKey(key, options);
    const startTime = Date.now();

    try {
      // Process data (compress, encrypt)
      let processedData = data;
      if (options?.compress ?? this.config.enableCompression) {
        processedData = await this.compressData(processedData);
      }
      if (options?.encrypt ?? this.config.enableEncryption) {
        processedData = await this.encryptData(processedData);
      }

      const entry: CacheEntry<T> = {
        data: processedData,
        timestamp: Date.now(),
        ttl: options?.ttl ?? this.config.defaultTTL,
        key: fullKey,
        metadata: {
          ...options?.metadata,
          originalSize: this.getSize({ data, timestamp: Date.now(), ttl: 0, key: fullKey }),
          compressed: options?.compress ?? this.config.enableCompression,
          encrypted: options?.encrypt ?? this.config.enableEncryption,
          tags: options?.tags || [],
        },
      };

      this.cache.set(fullKey, entry);
      this.updateAccessStats(fullKey);
      
      // Evict entries if necessary
      this.evictEntries();

      // Update stats
      if (this.config.enableStats) {
        this.stats.size += this.getSize(entry);
        this.stats.entries = this.cache.size;
      }

      // Save to persistent storage
      if (this.config.storageBackend !== 'memory') {
        await this.saveToStorage();
      }

      if (this.config.enableDebug) {
        console.log(`Cache set: ${key}, size: ${this.getSize(entry)} bytes`);
      }

    } catch (error) {
      console.error('Failed to set cache entry:', error);
      throw error;
    }
  }

  async get<T>(key: string, options?: CacheOptions): Promise<T | undefined> {
    const fullKey = this.generateKey(key, options);
    const startTime = Date.now();

    try {
      const entry = this.cache.get(fullKey);
      
      if (!entry) {
        this.stats.misses++;
        this.stats.totalRequests++;
        this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
        return undefined;
      }

      // Check if expired
      if (this.isExpired(entry)) {
        this.delete(fullKey);
        this.stats.misses++;
        this.stats.totalRequests++;
        this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
        return undefined;
      }

      // Process data (decrypt, decompress)
      let data = entry.data;
      if (entry.metadata?.encrypted) {
        data = await this.decryptData(data);
      }
      if (entry.metadata?.compressed) {
        data = await this.decompressData(data);
      }

      this.updateAccessStats(fullKey);
      this.stats.hits++;
      this.stats.totalRequests++;
      this.stats.hitRate = this.stats.hits / this.stats.totalRequests;

      // Update average access time
      const accessTime = Date.now() - startTime;
      this.stats.averageAccessTime = (
        this.stats.averageAccessTime * (this.stats.totalRequests - 1) + accessTime
      ) / this.stats.totalRequests;

      if (this.config.enableDebug) {
        console.log(`Cache hit: ${key}, access time: ${accessTime}ms`);
      }

      return data as T;

    } catch (error) {
      console.error('Failed to get cache entry:', error);
      this.stats.misses++;
      this.stats.totalRequests++;
      this.stats.hitRate = this.stats.hits / this.stats.totalRequests;
      return undefined;
    }
  }

  delete(key: string, options?: CacheOptions): boolean {
    const fullKey = this.generateKey(key, options);
    const deleted = this.cache.delete(fullKey);
    
    if (deleted) {
      this.accessTimes.delete(fullKey);
      this.accessCounts.delete(fullKey);
      
      // Update stats
      if (this.config.enableStats) {
        this.stats.entries = this.cache.size;
      }
      
      // Update persistent storage
      if (this.config.storageBackend !== 'memory') {
        this.saveToStorage();
      }
    }
    
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.accessTimes.clear();
    this.accessCounts.clear();
    
    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      totalRequests: 0,
      hitRate: 0,
      size: 0,
      entries: 0,
      averageAccessTime: 0,
      lastCleanup: new Date(),
    };
    
    // Clear persistent storage
    if (this.config.storageBackend !== 'memory' && typeof window !== 'undefined') {
      const storage = window[this.config.storageBackend];
      storage.removeItem('cache-manager-data');
    }
  }

  has(key: string, options?: CacheOptions): boolean {
    const fullKey = this.generateKey(key, options);
    const entry = this.cache.get(fullKey);
    return entry !== undefined && !this.isExpired(entry);
  }

  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  values<T>(): T[] {
    return Array.from(this.cache.values()).map(entry => entry.data);
  }

  entries<T>(): [string, T][] {
    return Array.from(this.cache.entries()).map(([key, entry]) => [key, entry.data]);
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getByTag<T>(tag: string): T[] {
    const results: T[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata?.tags?.includes(tag)) {
        let data = entry.data;
        if (entry.metadata?.encrypted) {
          data = this.decryptData(data);
        }
        if (entry.metadata?.compressed) {
          data = this.decompressData(data);
        }
        results.push(data as T);
      }
    }
    
    return results;
  }

  deleteByTag(tag: string): number {
    let deletedCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.metadata?.tags?.includes(tag)) {
        if (this.delete(key)) {
          deletedCount++;
        }
      }
    }
    
    return deletedCount;
  }

  updateConfig(newConfig: Partial<CacheManagerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart cleanup timer with new interval
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.startCleanupTimer();
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Export singleton instance
export const cacheManager = new CacheManager({
  maxSize: 1000,
  defaultTTL: 3600000,
  cleanupInterval: 300000,
  strategy: 'lru',
  enableCompression: false,
  enableEncryption: false,
  enableStats: true,
  enableDebug: false,
  storageBackend: 'memory',
});

// Export convenience methods
export const {
  set: setCache,
  get: getCache,
  delete: deleteCache,
  clear: clearCache,
  has: hasCache,
  keys: getCacheKeys,
  values: getCacheValues,
  entries: getCacheEntries,
  getStats: getCacheStats,
  getByTag: getCacheByTag,
  deleteByTag: deleteCacheByTag,
  updateConfig: updateCacheConfig,
  destroy: destroyCache,
} = cacheManager;

// React hook for caching
export function useCache<T>(options?: CacheOptions<T>) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);

  const set = React.useCallback(async (key: string, data: T, cacheOptions?: CacheOptions<T>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await cacheManager.set(key, data, { ...options, ...cacheOptions });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cache data'));
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const get = React.useCallback(async (key: string, cacheOptions?: CacheOptions<T>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      return await cacheManager.get<T>(key, { ...options, ...cacheOptions });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to retrieve cached data'));
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [options]);

  const remove = React.useCallback((key: string, cacheOptions?: CacheOptions<T>) => {
    try {
      return cacheManager.delete(key, { ...options, ...cacheOptions });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove cached data'));
      return false;
    }
  }, [options]);

  return {
    set,
    get,
    delete: remove,
    isLoading,
    error,
    has: (key: string, cacheOptions?: CacheOptions<T>) => cacheManager.has(key, { ...options, ...cacheOptions }),
    clear: () => cacheManager.clear(),
    getStats: () => cacheManager.getStats(),
  };
}

// Higher-order function for caching API results
export function withCache<T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  keyGenerator: (...args: T) => string,
  options?: CacheOptions<R>
) {
  return async (...args: T): Promise<R> => {
    const cacheKey = keyGenerator(...args);
    
    // Try to get from cache first
    const cached = await cacheManager.get<R>(cacheKey, options);
    if (cached !== undefined) {
      return cached;
    }
    
    // Execute function and cache result
    const result = await fn(...args);
    await cacheManager.set(cacheKey, result, options);
    
    return result;
  };
}