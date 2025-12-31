/**
 * Cache utility for API responses
 * Uses both localStorage (persistent) and in-memory cache (fast)
 * Supports TTL (time-to-live) for automatic expiration
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class CacheManager {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private readonly STORAGE_PREFIX = 'ozu_cache_';

  /**
   * Get data from cache (checks memory first, then localStorage)
   */
  get<T>(key: string): T | null {
    // Check memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      return memoryEntry.data as T;
    }

    // Check localStorage
    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
      if (stored) {
        const entry: CacheEntry<T> = JSON.parse(stored);
        if (this.isValid(entry)) {
          // Also store in memory for faster access
          this.memoryCache.set(key, entry);
          return entry.data;
        } else {
          // Expired, remove it
          this.remove(key);
        }
      }
    } catch (error) {
      console.warn('Cache get error:', error);
    }

    return null;
  }

  /**
   * Set data in cache (both memory and localStorage)
   */
  set<T>(key: string, data: T, ttlMs: number = 5 * 60 * 1000): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    // Store in memory
    this.memoryCache.set(key, entry);

    // Store in localStorage
    try {
      localStorage.setItem(`${this.STORAGE_PREFIX}${key}`, JSON.stringify(entry));
    } catch (error) {
      // localStorage might be full or disabled, that's okay
      console.warn('Cache set to localStorage failed:', error);
    }
  }

  /**
   * Remove data from cache
   */
  remove(key: string): void {
    this.memoryCache.delete(key);
    try {
      localStorage.removeItem(`${this.STORAGE_PREFIX}${key}`);
    } catch (error) {
      console.warn('Cache remove error:', error);
    }
  }

  /**
   * Clear all cache entries matching a pattern
   */
  clearPattern(pattern: string): void {
    const keysToRemove: string[] = [];

    // Collect keys from memory
    this.memoryCache.forEach((_, key) => {
      if (key.includes(pattern)) {
        keysToRemove.push(key);
      }
    });

    // Collect keys from localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX) && key.includes(pattern)) {
          keysToRemove.push(key.replace(this.STORAGE_PREFIX, ''));
        }
      }
    } catch (error) {
      console.warn('Cache clearPattern error:', error);
    }

    // Remove all collected keys
    keysToRemove.forEach(key => this.remove(key));
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.memoryCache.clear();
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_PREFIX)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Cache clearAll error:', error);
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  /**
   * Get cache entry age in milliseconds
   */
  getAge(key: string): number | null {
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry) {
      return Date.now() - memoryEntry.timestamp;
    }

    try {
      const stored = localStorage.getItem(`${this.STORAGE_PREFIX}${key}`);
      if (stored) {
        const entry: CacheEntry<any> = JSON.parse(stored);
        return Date.now() - entry.timestamp;
      }
    } catch (error) {
      // Ignore
    }

    return null;
  }
}

// Export singleton instance
export const cache = new CacheManager();

/**
 * Cache keys used throughout the app
 */
export const CacheKeys = {
  // Riders
  RIDERS_PENDING: 'riders_pending',
  RIDERS_APPROVED: 'riders_approved',
  RIDERS_LIVE: 'riders_live',
  
  // Profile
  ADMIN_PROFILE: (userId: string) => `admin_profile_${userId}`,
  
  // Shipments
  SHIPMENTS_ACTIVE: (adminMobile?: string) => 
    adminMobile ? `shipments_active_${adminMobile}` : 'shipments_active',
  SHIPMENTS_COMPLETED: (adminMobile?: string) => 
    adminMobile ? `shipments_completed_${adminMobile}` : 'shipments_completed',
  
  // Issues
  ISSUES_PENDING: 'issues_pending',
  ISSUES_BY_SHIPMENT: (shipmentId: string | number) => `issues_shipment_${shipmentId}`,
  
  // Rider Locations (cached for fast display)
  RIDER_LOCATION: (riderId: string | number) => `rider_location_${riderId}`,
} as const;

/**
 * Cache TTL constants (in milliseconds)
 */
export const CacheTTL = {
  RIDERS: 2 * 60 * 1000, // 2 minutes
  PROFILE: 10 * 60 * 1000, // 10 minutes (profile changes less frequently)
  SHIPMENTS_ACTIVE: 30 * 1000, // 30 seconds (active shipments change frequently)
  SHIPMENTS_COMPLETED: 5 * 60 * 1000, // 5 minutes (completed shipments change less frequently)
  ISSUES: 1 * 60 * 1000, // 1 minute
  RIDER_LOCATION: 10 * 1000, // 10 seconds (rider location updates frequently)
} as const;

