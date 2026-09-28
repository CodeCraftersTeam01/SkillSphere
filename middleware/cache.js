const { getCache, setCache, deleteCache } = require('../config/redis');

/**
 * Express middleware for route caching with Redis & Memory fallback.
 * Automatically adds 'X-Cache: HIT' or 'X-Cache: MISS' headers.
 * 
 * @param {number} ttlSeconds Time-to-live in seconds (default 300)
 * @param {Function} [customKeyGenerator] Optional custom key generator (req) => string
 */
function cacheMiddleware(ttlSeconds = 300, customKeyGenerator = null) {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Skip caching if user requested fresh bypass via header
    if (req.headers['x-bypass-cache'] === 'true' || req.headers['cache-control'] === 'no-cache') {
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    const cacheKey = customKeyGenerator 
      ? customKeyGenerator(req) 
      : `cache:${req.baseUrl || ''}${req.path}:${JSON.stringify(req.query || {})}`;

    try {
      const cachedResponse = await getCache(cacheKey);

      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-Key', cacheKey);
        return res.status(200).json(cachedResponse);
      }

      // Cache MISS - intercept res.json
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Cache-Key', cacheKey);

      const originalJson = res.json.bind(res);
      res.json = (body) => {
        // Only cache successful 200 responses
        if (res.statusCode >= 200 && res.statusCode < 300 && body && body.success !== false) {
          setCache(cacheKey, body, ttlSeconds).catch((e) => {
            console.error('[Cache Middleware] Failed to store cache:', e.message);
          });
        }
        return originalJson(body);
      };

      next();
    } catch (err) {
      console.error('[Cache Middleware] Error processing cache:', err.message);
      next();
    }
  };
}

/**
 * Invalidation helper to clear cache tags/patterns
 * @param {string|string[]} patterns
 */
function invalidateCacheMiddleware(patterns) {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const patternList = Array.isArray(patterns) ? patterns : [patterns];
        patternList.forEach((pat) => {
          deleteCache(pat).catch((err) => {
            console.error('[Cache Invalidation] Error:', err.message);
          });
        });
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = {
  cacheMiddleware,
  invalidateCacheMiddleware,
  deleteCache,
};
