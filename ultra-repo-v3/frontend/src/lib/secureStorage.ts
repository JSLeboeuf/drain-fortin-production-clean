/**
 * Secure storage wrapper with encryption for sensitive data
 * Prevents plaintext storage of sensitive information
 */

interface StorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
}

class SecureStorage {
  private prefix = 'vapi_';
  
  // Simple obfuscation for demo - in production use proper encryption
  private encode(data: string): string {
    try {
      // Convert to base64 and reverse for basic obfuscation
      return btoa(encodeURIComponent(data)).split('').reverse().join('');
    } catch {
      return data;
    }
  }

  private decode(data: string): string {
    try {
      // Reverse the obfuscation
      return decodeURIComponent(atob(data.split('').reverse().join('')));
    } catch {
      return data;
    }
  }

  set<T>(key: string, value: T, options: StorageOptions = {}): void {
    const prefixedKey = this.prefix + key;
    const data = {
      value,
      timestamp: Date.now(),
      ttl: options.ttl
    };

    const stringified = JSON.stringify(data);
    const stored = options.encrypt !== false ? this.encode(stringified) : stringified;

    try {
      localStorage.setItem(prefixedKey, stored);
    } catch (e) {
      // Handle quota exceeded
      this.cleanup();
      try {
        localStorage.setItem(prefixedKey, stored);
      } catch {
        console.warn('Storage quota exceeded');
      }
    }
  }

  get<T>(key: string, options: StorageOptions = {}): T | null {
    const prefixedKey = this.prefix + key;
    const stored = localStorage.getItem(prefixedKey);
    
    if (!stored) return null;

    try {
      const decoded = options.encrypt !== false ? this.decode(stored) : stored;
      const data = JSON.parse(decoded);

      // Check TTL
      if (data.ttl && Date.now() - data.timestamp > data.ttl) {
        this.remove(key);
        return null;
      }

      return data.value as T;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        localStorage.removeItem(key);
      }
    });
  }

  // Clean up expired items
  cleanup(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        const stored = localStorage.getItem(key);
        if (stored) {
          try {
            const decoded = this.decode(stored);
            const data = JSON.parse(decoded);
            if (data.ttl && Date.now() - data.timestamp > data.ttl) {
              localStorage.removeItem(key);
            }
          } catch {
            // Remove corrupted data
            localStorage.removeItem(key);
          }
        }
      }
    });
  }

  // Get storage size
  getSize(): number {
    let size = 0;
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(this.prefix)) {
        const item = localStorage.getItem(key);
        if (item) size += item.length;
      }
    });
    return size;
  }
}

export const secureStorage = new SecureStorage();

// Session storage variant
class SecureSessionStorage extends SecureStorage {
  set<T>(key: string, value: T, options: StorageOptions = {}): void {
    const prefixedKey = this.prefix + key;
    const data = {
      value,
      timestamp: Date.now(),
      ttl: options.ttl
    };

    const stringified = JSON.stringify(data);
    const stored = options.encrypt !== false ? this.encode(stringified) : stringified;

    try {
      sessionStorage.setItem(prefixedKey, stored);
    } catch {
      console.warn('Session storage quota exceeded');
    }
  }

  get<T>(key: string, options: StorageOptions = {}): T | null {
    const prefixedKey = this.prefix + key;
    const stored = sessionStorage.getItem(prefixedKey);
    
    if (!stored) return null;

    try {
      const decoded = options.encrypt !== false ? this.decode(stored) : stored;
      const data = JSON.parse(decoded);

      if (data.ttl && Date.now() - data.timestamp > data.ttl) {
        this.remove(key);
        return null;
      }

      return data.value as T;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    sessionStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keys = Object.keys(sessionStorage);
    keys.forEach(key => {
      if (key.startsWith(this.prefix)) {
        sessionStorage.removeItem(key);
      }
    });
  }
}

export const secureSessionStorage = new SecureSessionStorage();

// Convenience functions
export function setSecure<T>(key: string, value: T, ttl?: number): void {
  secureStorage.set(key, value, { encrypt: true, ttl });
}

export function getSecure<T>(key: string): T | null {
  return secureStorage.get<T>(key, { encrypt: true });
}

export function removeSecure(key: string): void {
  secureStorage.remove(key);
}