interface CacheConfig {
  maxAge: number; // in milliseconds
  maxSize: number; // in bytes
  backgroundRefresh: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  size: number;
}

export class CacheService {
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  set<T>(key: string, data: T): boolean {
    try {
      const timestamp = Date.now();
      const serialized = JSON.stringify(data);
      const size = new Blob([serialized]).size;

      const entry: CacheEntry<T> = {
        data,
        timestamp,
        size,
      };

      // Check if adding this entry would exceed max size
      if (this.getTotalCacheSize() + size > this.config.maxSize) {
        console.warn("Cache size limit reached, clearing old entries...");
        this.clearOldEntries();
      }

      localStorage.setItem(key, JSON.stringify(entry));
      return true;
    } catch (error) {
      console.error("Failed to cache data:", error);
      return false;
    }
  }

  get<T>(key: string): T | null {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;

      if (age > this.config.maxAge) {
        localStorage.removeItem(key);
        return null;
      }

      // Background refresh if data is getting stale
      if (this.config.backgroundRefresh && age > this.config.maxAge / 2) {
        console.log("Cache is getting stale, consider background refresh...");
      }

      return entry.data;
    } catch (error) {
      console.error("Failed to retrieve cached data:", error);
      localStorage.removeItem(key);
      return null;
    }
  }

  isStale(key: string): boolean {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return true;

      const entry: CacheEntry<any> = JSON.parse(cached);
      const age = Date.now() - entry.timestamp;
      return age > this.config.maxAge;
    } catch {
      return true;
    }
  }

  getAge(key: string): number {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return Infinity;

      const entry: CacheEntry<any> = JSON.parse(cached);
      return Date.now() - entry.timestamp;
    } catch {
      return Infinity;
    }
  }

  private getTotalCacheSize(): number {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("github-")) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }
    }
    return totalSize;
  }

  private clearOldEntries(): void {
    const entries: Array<{ key: string; timestamp: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("github-")) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry = JSON.parse(cached);
            entries.push({ key, timestamp: entry.timestamp });
          }
        } catch {
          // Remove corrupted entries
          localStorage.removeItem(key);
        }
      }
    }

    // Sort by timestamp (oldest first) and remove oldest entries
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const entriesToRemove = Math.ceil(entries.length / 2); // Remove half of the entries

    for (let i = 0; i < entriesToRemove; i++) {
      const entry = entries[i];
      if (entry) {
        localStorage.removeItem(entry.key);
      }
    }
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("github-")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  getStats(): { totalSize: number; entryCount: number; oldestEntry: number } {
    let totalSize = 0;
    let entryCount = 0;
    let oldestTimestamp = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("github-")) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const entry = JSON.parse(cached);
            totalSize += entry.size || 0;
            entryCount++;
            if (entry.timestamp && entry.timestamp < oldestTimestamp) {
              oldestTimestamp = entry.timestamp;
            }
          }
        } catch {
          // Skip corrupted entries
        }
      }
    }

    return {
      totalSize,
      entryCount,
      oldestEntry: Date.now() - oldestTimestamp,
    };
  }
}

// Create a default cache instance for GitHub data
export const githubCache = new CacheService({
  maxAge: 30 * 60 * 1000, // 30 minutes
  maxSize: 5 * 1024 * 1024, // 5MB
  backgroundRefresh: true,
});
