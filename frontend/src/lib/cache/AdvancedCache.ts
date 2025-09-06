import { cacheManager, CacheOptions } from './CacheManager';

// Query Cache for API responses and computed data
export class QueryCache {
  private prefix = 'query:';

  constructor(private options: CacheOptions = {}) {}

  // Generate cache key for API queries
  generateKey(endpoint: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `${this.prefix}${endpoint}_${btoa(paramString)}`;
  }

  // Get with fallback to fetch function
  async getOrFetch<T>(
    endpoint: string,
    fetchFn: () => Promise<T>,
    params?: Record<string, any>,
    options?: CacheOptions<T>
  ): Promise<T> {
    const key = this.generateKey(endpoint, params);
    
    // Try to get from cache first
    const cached = await cacheManager.get<T>(key, { ...this.options, ...options });
    if (cached !== undefined) {
      return cached;
    }

    // Fetch and cache
    try {
      const data = await fetchFn();
      await cacheManager.set(key, data, { 
        ...this.options, 
        ...options,
        ttl: options?.ttl || this.options.ttl || 1800000, // 30 minutes default
        tags: ['api', 'query', endpoint, ...(options?.tags || [])]
      });
      return data;
    } catch (error) {
      console.error(`Failed to fetch data for ${endpoint}:`, error);
      throw error;
    }
  }

  // Prefetch multiple queries
  async prefetch<T>(
    queries: Array<{
      endpoint: string;
      fetchFn: () => Promise<T>;
      params?: Record<string, any>;
      options?: CacheOptions<T>;
    }>
  ): Promise<void> {
    await Promise.allSettled(
      queries.map(query => 
        this.getOrFetch(query.endpoint, query.fetchFn, query.params, query.options)
      )
    );
  }

  // Invalidate cache entries by pattern
  async invalidate(pattern: string): Promise<void> {
    const regex = new RegExp(pattern);
    const keys = cacheManager.keys();
    
    for (const key of keys) {
      if (regex.test(key)) {
        cacheManager.delete(key);
      }
    }
  }

  // Invalidate by endpoint
  async invalidateEndpoint(endpoint: string): Promise<void> {
    await this.invalidate(`${this.prefix}${endpoint}_`);
  }

  // Clear all query cache
  async clear(): Promise<void> {
    const keys = cacheManager.keys();
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        cacheManager.delete(key);
      }
    }
  }

  // Get stats for query cache only
  getStats() {
    const allStats = cacheManager.getStats();
    const keys = cacheManager.keys();
    const queryKeys = keys.filter(key => key.startsWith(this.prefix));
    
    return {
      ...allStats,
      queryEntries: queryKeys.length,
      totalEntries: keys.length,
    };
  }
}

// Image Cache for optimized image loading
export interface ImageCacheEntry {
  src: string;
  dataUrl: string;
  width: number;
  height: number;
  format: string;
  size: number;
  lastAccessed: number;
}

export class ImageCache {
  private prefix = 'image:';
  private loadingPromises: Map<string, Promise<string>> = new Map();

  constructor(private options: CacheOptions = {}) {}

  // Load and cache image
  async loadImage(url: string, options?: CacheOptions): Promise<string> {
    const key = `${this.prefix}${url}`;
    
    // Check if already cached
    const cached = await cacheManager.get<ImageCacheEntry>(key, { ...this.options, ...options });
    if (cached) {
      // Update last accessed time
      await cacheManager.set(key, { ...cached, lastAccessed: Date.now() }, { ...this.options, ...options });
      return cached.dataUrl;
    }

    // Check if already loading
    if (this.loadingPromises.has(url)) {
      return this.loadingPromises.get(url)!;
    }

    // Start loading
    const loadPromise = this.fetchAndCacheImage(url, options);
    this.loadingPromises.set(url, loadPromise);

    try {
      const result = await loadPromise;
      return result;
    } finally {
      this.loadingPromises.delete(url);
    }
  }

  private async fetchAndCacheImage(url: string, options?: CacheOptions): Promise<string> {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.statusText}`);
      }

      const blob = await response.blob();
      const dataUrl = await this.blobToDataUrl(blob);

      // Get image dimensions
      const dimensions = await this.getImageDimensions(dataUrl);

      const entry: ImageCacheEntry = {
        src: url,
        dataUrl,
        width: dimensions.width,
        height: dimensions.height,
        format: blob.type,
        size: blob.size,
        lastAccessed: Date.now(),
      };

      await cacheManager.set(`${this.prefix}${url}`, entry, { 
        ...this.options, 
        ...options,
        ttl: options?.ttl || this.options.ttl || 86400000, // 24 hours default
        tags: ['image', 'media', ...(options?.tags || [])]
      });

      return dataUrl;
    } catch (error) {
      console.error(`Failed to load image ${url}:`, error);
      throw error;
    }
  }

  private blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.width, height: img.height });
      img.onerror = reject;
      img.src = dataUrl;
    });
  }

  // Preload multiple images
  async preloadImages(urls: string[], options?: CacheOptions): Promise<void> {
    await Promise.allSettled(
      urls.map(url => this.loadImage(url, options))
    );
  }

  // Get image info
  async getImageInfo(url: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  } | null> {
    const key = `${this.prefix}${url}`;
    const entry = await cacheManager.get<ImageCacheEntry>(key, { ...this.options });
    
    if (!entry) {
      return null;
    }

    return {
      width: entry.width,
      height: entry.height,
      format: entry.format,
      size: entry.size,
    };
  }

  // Clear images by size range
  async clearBySize(minSize: number, maxSize: number): Promise<void> {
    const keys = cacheManager.keys();
    
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        const entry = await cacheManager.get<ImageCacheEntry>(key);
        if (entry && entry.size >= minSize && entry.size <= maxSize) {
          cacheManager.delete(key);
        }
      }
    }
  }

  // Clear old images (not accessed recently)
  async clearOld(maxAge: number = 604800000): Promise<void> { // 7 days default
    const now = Date.now();
    const keys = cacheManager.keys();
    
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        const entry = await cacheManager.get<ImageCacheEntry>(key);
        if (entry && now - entry.lastAccessed > maxAge) {
          cacheManager.delete(key);
        }
      }
    }
  }

  // Clear all image cache
  async clear(): Promise<void> {
    const keys = cacheManager.keys();
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        cacheManager.delete(key);
      }
    }
  }

  // Get stats for image cache only
  async getStats() {
    const allStats = cacheManager.getStats();
    const keys = cacheManager.keys();
    const imageKeys = keys.filter(key => key.startsWith(this.prefix));
    
    let totalSize = 0;
    let oldestAccess = Date.now();
    let newestAccess = 0;
    
    for (const key of imageKeys) {
      const entry = await cacheManager.get<ImageCacheEntry>(key);
      if (entry) {
        totalSize += entry.size;
        oldestAccess = Math.min(oldestAccess, entry.lastAccessed);
        newestAccess = Math.max(newestAccess, entry.lastAccessed);
      }
    }
    
    return {
      ...allStats,
      imageEntries: imageKeys.length,
      totalSize,
      oldestAccess,
      newestAccess,
      averageSize: imageKeys.length > 0 ? totalSize / imageKeys.length : 0,
    };
  }
}

// Asset Cache for JavaScript, CSS, and other assets
export interface AssetCacheEntry {
  url: string;
  content: string;
  contentType: string;
  version?: string;
  integrity?: string;
  lastAccessed: number;
}

export class AssetCache {
  private prefix = 'asset:';
  private loadedScripts: Set<string> = new Set();
  private loadedStyles: Set<string> = new Set();

  constructor(private options: CacheOptions = {}) {}

  // Load and cache asset
  async loadAsset(
    url: string,
    options: {
      ttl?: number;
      version?: string;
      integrity?: string;
      tags?: string[];
    } = {}
  ): Promise<string> {
    const { ttl, version, integrity, tags = [] } = options;
    const key = version ? `${this.prefix}${url}?v=${version}` : `${this.prefix}${url}`;

    // Check if already cached
    const cached = await cacheManager.get<AssetCacheEntry>(key, { ...this.options, ...options });
    if (cached) {
      // Update last accessed time
      await cacheManager.set(key, { ...cached, lastAccessed: Date.now() }, { ...this.options, ...options });
      return cached.content;
    }

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load asset: ${response.statusText}`);
      }

      const content = await response.text();

      const entry: AssetCacheEntry = {
        url,
        content,
        contentType: response.headers.get('content-type') || 'text/plain',
        version,
        integrity,
        lastAccessed: Date.now(),
      };

      await cacheManager.set(key, entry, { 
        ...this.options, 
        ...options,
        ttl: ttl || this.options.ttl || 604800000, // 7 days default
        tags: ['asset', url.includes('.js') ? 'script' : 'stylesheet', ...tags]
      });

      return content;
    } catch (error) {
      console.error(`Failed to load asset ${url}:`, error);
      throw error;
    }
  }

  // Load script
  async loadScript(url: string, options: {
    ttl?: number;
    version?: string;
    integrity?: string;
    async?: boolean;
    tags?: string[];
  } = {}): Promise<void> {
    const { async = true, ...loadOptions } = options;
    
    // Check if already loaded
    const cacheKey = options.version ? `${url}?v=${options.version}` : url;
    if (this.loadedScripts.has(cacheKey)) {
      return;
    }

    try {
      const content = await this.loadAsset(url, loadOptions);
      
      if (typeof window !== 'undefined') {
        const script = document.createElement('script');
        script.text = content;
        script.async = async;
        document.head.appendChild(script);
        document.head.removeChild(script);
        
        this.loadedScripts.add(cacheKey);
      }
    } catch (error) {
      console.error(`Failed to load script ${url}:`, error);
      throw error;
    }
  }

  // Load stylesheet
  async loadStylesheet(url: string, options: {
    ttl?: number;
    version?: string;
    integrity?: string;
    tags?: string[];
  } = {}): Promise<void> {
    // Check if already loaded
    const cacheKey = options.version ? `${url}?v=${options.version}` : url;
    if (this.loadedStyles.has(cacheKey)) {
      return;
    }

    try {
      const content = await this.loadAsset(url, options);
      
      if (typeof window !== 'undefined') {
        const style = document.createElement('style');
        style.textContent = content;
        document.head.appendChild(style);
        
        this.loadedStyles.add(cacheKey);
      }
    } catch (error) {
      console.error(`Failed to load stylesheet ${url}:`, error);
      throw error;
    }
  }

  // Clear assets by type
  async clearByType(contentType: string): Promise<void> {
    const keys = cacheManager.keys();
    
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        const entry = await cacheManager.get<AssetCacheEntry>(key);
        if (entry && entry.contentType.includes(contentType)) {
          cacheManager.delete(key);
        }
      }
    }
  }

  // Clear assets by version
  async clearByVersion(version: string): Promise<void> {
    const keys = cacheManager.keys();
    
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        const entry = await cacheManager.get<AssetCacheEntry>(key);
        if (entry && entry.version === version) {
          cacheManager.delete(key);
        }
      }
    }
  }

  // Clear old assets (not accessed recently)
  async clearOld(maxAge: number = 2592000000): Promise<void> { // 30 days default
    const now = Date.now();
    const keys = cacheManager.keys();
    
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        const entry = await cacheManager.get<AssetCacheEntry>(key);
        if (entry && now - entry.lastAccessed > maxAge) {
          cacheManager.delete(key);
        }
      }
    }
  }

  // Clear all asset cache
  async clear(): Promise<void> {
    const keys = cacheManager.keys();
    for (const key of keys) {
      if (key.startsWith(this.prefix)) {
        cacheManager.delete(key);
      }
    }
    
    // Clear loaded sets
    this.loadedScripts.clear();
    this.loadedStyles.clear();
  }

  // Get stats for asset cache only
  async getStats() {
    const allStats = cacheManager.getStats();
    const keys = cacheManager.keys();
    const assetKeys = keys.filter(key => key.startsWith(this.prefix));
    
    let scripts = 0;
    let stylesheets = 0;
    let other = 0;
    let oldestAccess = Date.now();
    let newestAccess = 0;
    
    for (const key of assetKeys) {
      const entry = await cacheManager.get<AssetCacheEntry>(key);
      if (entry) {
        if (entry.contentType.includes('javascript')) {
          scripts++;
        } else if (entry.contentType.includes('css')) {
          stylesheets++;
        } else {
          other++;
        }
        oldestAccess = Math.min(oldestAccess, entry.lastAccessed);
        newestAccess = Math.max(newestAccess, entry.lastAccessed);
      }
    }
    
    return {
      ...allStats,
      assetEntries: assetKeys.length,
      scripts,
      stylesheets,
      other,
      oldestAccess,
      newestAccess,
      loadedScripts: this.loadedScripts.size,
      loadedStyles: this.loadedStyles.size,
    };
  }
}

// Export cache instances
export const queryCache = new QueryCache({
  ttl: 1800000, // 30 minutes
  tags: ['api', 'query'],
});

export const imageCache = new ImageCache({
  ttl: 86400000, // 24 hours
  tags: ['image', 'media'],
});

export const assetCache = new AssetCache({
  ttl: 604800000, // 7 days
  tags: ['asset'],
});

// Cache utilities
export const cacheUtils = {
  // Clear all caches
  async clearAll(): Promise<void> {
    await Promise.all([
      queryCache.clear(),
      imageCache.clear(),
      assetCache.clear(),
      cacheManager.clear(),
    ]);
  },

  // Get combined stats
  async getAllStats() {
    const [queryStats, imageStats, assetStats, generalStats] = await Promise.all([
      queryCache.getStats(),
      imageCache.getStats(),
      assetCache.getStats(),
      cacheManager.getStats(),
    ]);

    return {
      query: queryStats,
      image: imageStats,
      asset: assetStats,
      general: generalStats,
      timestamp: Date.now(),
    };
  },

  // Prefetch common assets
  async prefetchCommonAssets(): Promise<void> {
    // Prefetch common libraries and assets
    const commonAssets = [
      // Add your common asset URLs here
      // '/js/common.js',
      // '/css/common.css',
    ];

    await Promise.allSettled([
      ...commonAssets.map(url => assetCache.loadAsset(url)),
      // Add common image preloading here
    ]);
  },

  // Cache warming for critical data
  async warmCache(): Promise<void> {
    // Warm up critical caches
    await this.prefetchCommonAssets();
    
    // Add other cache warming strategies here
    console.log('Cache warming completed');
  },
};