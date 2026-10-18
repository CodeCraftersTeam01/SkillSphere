require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

const { sequelize } = require('./models');
const compressionMiddleware = require('./middleware/compression');
require('./config/redis'); // Initialize Redis connection

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const apiRouter = require('./routes/api');

const app = express();

// Trust proxy for reverse proxies / tunnels (Cloudflare, ngrok, HTTPS tunnels)
app.set('trust proxy', 1);

// Optional Force HTTPS redirection
if (process.env.FORCE_HTTPS === 'true') {
  app.use((req, res, next) => {
    if (!req.secure && req.get('x-forwarded-proto') !== 'https') {
      return res.redirect(301, 'https://' + req.get('host') + req.originalUrl);
    }
    next();
  });
}

// Global locals for EJS views (API Base URL and App URL from env)
app.use((req, res, next) => {
  const protocol = req.secure || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const defaultHost = req.get('host') || 'localhost:3000';
  res.locals.APP_URL = (process.env.APP_URL || `${protocol}://${defaultHost}`).replace(/\/+$/, '');
  const rawApiBase = (process.env.API_BASE_URL || '').trim().replace(/\/+$/, '').replace(/\/api$/, '');
  res.locals.API_BASE_URL = rawApiBase;
  res.locals.CURRENT_PATH = req.path;
  next();
});

// Enable Gzip/Deflate compression for all responses
app.use(compressionMiddleware);

// Security and utility middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allows flexible views & frontend integration
}));
app.use(cors({
  origin: true,
  credentials: true,
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

if (process.env.NODE_ENV !== 'test') {
  app.use(logger('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '7d', // 7 days client cache for static assets
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html') || filePath.endsWith('.ejs')) {
      res.setHeader('Cache-Control', 'no-cache');
    } else if (filePath.match(/\.(woff2?|ttf|otf|eot)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (filePath.match(/\.(webp|jpg|jpeg|png|gif|svg|ico)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000');
    } else if (filePath.match(/\.(css|js)$/)) {
      res.setHeader('Cache-Control', 'public, max-age=604800');
    }
  },
}));

// Database connection & sync
if (process.env.NODE_ENV !== 'test') {
  (async () => {
    try {
      await sequelize.authenticate();
      const dialect = sequelize.getDialect();
      console.log(`✅ [Database] ${dialect.toUpperCase()} Database connected successfully.`);
      
      if (dialect === 'mysql') {
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;');
        await sequelize.sync();
        try {
          await sequelize.query("ALTER TABLE `courses` MODIFY COLUMN `status` ENUM('draft', 'published', 'archived', 'suspended') NOT NULL DEFAULT 'draft';");
        } catch (_) {}
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
      } else {
        await sequelize.sync();
      }
      console.log('✅ [Database] 19 Core Relational Tables synchronized successfully.');
    } catch (err) {
      console.error('❌ [Database] Failed to connect/sync database:', err);
    }
  })();
}

// Register Web and API routes
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);

// Catch 404 and forward to error handler
app.use(function(req, res, next) {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({
      success: false,
      message: `API endpoint '${req.originalUrl}' tidak ditemukan.`,
    });
  }
  res.status(404).render('404');
});

// Global error handler
app.use(function(err, req, res, next) {
  const status = err.status || 500;

  // API error JSON response
  if (req.path.startsWith('/api')) {
    return res.status(status).json({
      success: false,
      message: err.message || 'Terjadi kesalahan internal server.',
      error: req.app.get('env') === 'development' ? err : {},
    });
  }

  // Render 404 page if status is 404
  if (status === 404) {
    return res.status(404).render('404');
  }

  // set locals
  res.locals.message = err.message || 'Terjadi Gangguan pada Server';
  res.locals.error = { status };

  // render the error page
  res.status(status);
  res.render('error');
});

module.exports = app;
