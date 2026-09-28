const compression = require('compression');

/**
 * Filter function to determine if response should be compressed with Gzip/Deflate.
 * - Skips responses with 'x-no-compression' header
 * - Compresses HTML, JSON, CSS, JS, SVG, XML, and text assets
 * - Compression threshold set to 1024 bytes (1 KB)
 */
const compressionMiddleware = compression({
  level: 6, // Optimal balance between compression ratio and CPU performance
  threshold: 1024, // 1KB threshold
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Standard compression filter fallback
    return compression.filter(req, res);
  },
});

module.exports = compressionMiddleware;
