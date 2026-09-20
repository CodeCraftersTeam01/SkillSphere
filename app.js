require('dotenv').config();
const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

const { sequelize } = require('./models');
const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const apiRouter = require('./routes/api');

const app = express();

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
app.use(express.static(path.join(__dirname, 'public')));

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
  next(createError(404));
});

// Global error handler
app.use(function(err, req, res, next) {
  // API error JSON response
  if (req.path.startsWith('/api')) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || 'Terjadi kesalahan internal server.',
      error: req.app.get('env') === 'development' ? err : {},
    });
  }

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
