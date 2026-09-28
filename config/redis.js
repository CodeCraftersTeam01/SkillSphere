const Redis = require('ioredis');

const REDIS_ENABLED = process.env.REDIS_ENABLED !== 'false';
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = parseInt(process.env.REDIS_PORT, 10) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;
const REDIS_DB = parseInt(process.env.REDIS_DB, 10) || 0;

// In-memory fallback map if Redis server is temporarily unreachable
const memoryFallbackStore = new Map();
let isConnected = false;
let redisClient = null;

if (REDIS_ENABLED) {
  try {
    redisClient = new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      password: REDIS_PASSWORD,
      db: REDIS_DB,
      lazyConnect: false,
      enableOfflineQueue: true,
      retryStrategy(times) {
        if (times > 5) {
          return null; // Stop retrying after 5 attempts and use memory fallback
        }
        return Math.min(times * 100, 1000);
      },
    });

    redisClient.on('connect', () => {
      isConnected = true;
      console.log(`✅ [Redis] Connected successfully to ${REDIS_HOST}:${REDIS_PORT} (DB: ${REDIS_DB}).`);
    });

    redisClient.on('ready', () => {
      isConnected = true;
    });

    redisClient.on('error', (err) => {
      isConnected = false;
    });

    redisClient.on('close', () => {
      isConnected = false;
    });
  } catch (err) {
    console.warn('⚠️ [Redis] Initialization failed, using memory fallback:', err.message);
    isConnected = false;
  }
}

/**
 * Get value from Redis or Memory fallback
 * @param {string} key
 * @returns {Promise<any|null>}
 */
async function getCache(key) {
  try {
    if (isConnected && redisClient) {
      const data = await redisClient.get(key);
      return data ? JSON.parse(data) : null;
    }
    
    // Memory fallback
    const entry = memoryFallbackStore.get(key);
    if (entry) {
      if (Date.now() > entry.expiry) {
        memoryFallbackStore.delete(key);
        return null;
      }
      return entry.value;
    }
    return null;
  } catch (err) {
    console.error(`[Redis] Error getting key "${key}":`, err.message);
    return null;
  }
}

/**
 * Set value in Redis or Memory fallback with TTL
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds Default is 300 seconds (5 minutes)
 */
async function setCache(key, value, ttlSeconds = 300) {
  try {
    const serialized = JSON.stringify(value);
    if (isConnected && redisClient) {
      if (ttlSeconds > 0) {
        await redisClient.setex(key, ttlSeconds, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    }

    // Memory fallback
    memoryFallbackStore.set(key, {
      value,
      expiry: Date.now() + (ttlSeconds * 1000),
    });
    return true;
  } catch (err) {
    console.error(`[Redis] Error setting key "${key}":`, err.message);
    return false;
  }
}

/**
 * Delete one or multiple keys by pattern
 * @param {string} pattern
 */
async function deleteCache(pattern) {
  try {
    if (isConnected && redisClient) {
      if (pattern.includes('*')) {
        const stream = redisClient.scanStream({
          match: pattern,
          count: 100,
        });
        stream.on('data', (keys) => {
          if (keys.length) {
            const pipeline = redisClient.pipeline();
            keys.forEach((k) => pipeline.del(k));
            pipeline.exec();
          }
        });
      } else {
        await redisClient.del(pattern);
      }
    }

    // Clear matching memory fallback
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      for (const k of memoryFallbackStore.keys()) {
        if (regex.test(k)) {
          memoryFallbackStore.delete(k);
        }
      }
    } else {
      memoryFallbackStore.delete(pattern);
    }
    return true;
  } catch (err) {
    console.error(`[Redis] Error deleting cache for pattern "${pattern}":`, err.message);
    return false;
  }
}

/**
 * Clear all cache in database
 */
async function flushCache() {
  try {
    if (isConnected && redisClient) {
      await redisClient.flushdb();
    }
    memoryFallbackStore.clear();
    return true;
  } catch (err) {
    console.error('[Redis] Error flushing cache:', err.message);
    return false;
  }
}

module.exports = {
  redisClient,
  isRedisConnected: () => isConnected,
  getCache,
  setCache,
  deleteCache,
  flushCache,
};
