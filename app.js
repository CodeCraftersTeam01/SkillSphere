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
  maxAge: '1d', // 1 day client cache for static assets
  etag: true,
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
