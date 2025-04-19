import { createClient } from 'redis';
import { env } from './env';

// Create Redis client
const redisClient = createClient({
  url: env.REDIS_URL,
});

// Handle Redis connection events
redisClient.on('connect', () => {
  console.log('✅ Redis client connected');
});

redisClient.on('error', (error) => {
  console.error('❌ Redis client error:', error);
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis client reconnecting...');
});

// Cache wrapper class
export class Cache {
  private static instance: Cache;
  private client: ReturnType<typeof createClient>;

  private constructor() {
    this.client = redisClient;
  }

  public static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  public async connect(): Promise<void> {
    if (!this.client.isOpen) {
      await this.client.connect();
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client.isOpen) {
      await this.client.disconnect();
    }
  }

  public async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    return value ? JSON.parse(value) : null;
  }

  public async set(
    key: string,
    value: unknown,
    ttlSeconds?: number
  ): Promise<void> {
    const stringValue = JSON.stringify(value);
    if (ttlSeconds) {
      await this.client.setEx(key, ttlSeconds, stringValue);
    } else {
      await this.client.set(key, stringValue);
    }
  }

  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async flush(): Promise<void> {
    await this.client.flushAll();
  }

  // Cache decorator
  public static cached(ttlSeconds?: number) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;

      descriptor.value = async function (...args: any[]) {
        const cache = Cache.getInstance();
        const key = `${propertyKey}:${JSON.stringify(args)}`;

        const cachedValue = await cache.get(key);
        if (cachedValue) {
          return cachedValue;
        }

        const result = await originalMethod.apply(this, args);
        await cache.set(key, result, ttlSeconds);

        return result;
      };

      return descriptor;
    };
  }
}

// Export singleton instance
export const cache = Cache.getInstance();
