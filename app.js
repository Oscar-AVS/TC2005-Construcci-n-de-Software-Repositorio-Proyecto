/**
 * Application entry point.
 * Configures Express, views, sessions, security middleware and routes.
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const csrf = require('csurf');

const db = require('./util/database');
const User = require('./models/user.model');

const isAuth = require('./util/is-auth');
const { requireRole } = isAuth;

const usersRoutes = require('./routes/users.routes');
const employeeRoutes = require('./routes/employee.routes');
const teamLeaderRoutes = require('./routes/team-leader.routes');
const managerRoutes = require('./routes/manager.routes');
const adminRoutes = require('./routes/admin.routes');
const projectManagerRoutes = require('./routes/project-manager.routes');
const reportRoutes = require('./routes/report.routes');
const slackRoutes = require('./routes/slack.routes');

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3000;
const csrfProtection = csrf();

/**
 * Temporary database connection check.
 */
db.query('SELECT DATABASE() AS db_name')
  .then(([rows]) => {
    console.log('Base conectada:', rows[0].db_name);
  })
  .catch((error) => {
    console.error('Error de conexion a BD:', error.message);
  });

/**
 * View engine configuration.
 */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/**
 * Layout configuration.
 */
app.use(expressLayouts);
app.set('layout', 'layouts/main');

/**
 * Static files and body parsing.
 */
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * Session configuration.
 */
app.use(session({
  secret: process.env.SESSION_SECRET || 'mufasa_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24,
    sameSite: 'lax',
  },
}));

/**
 * Session user status validation.
 * If a logged-in user becomes inactive or pending, destroy the session.
 */
app.use(async (req, res, next) => {
  if (!req.session.isLoggedIn || !req.session.userId) {
    return next();
  }

  const isAjax =
    req.xhr ||
    req.headers.accept?.includes('application/json') ||
    req.method === 'PATCH';

  if (isAjax) {
    return next();
  }

  try {
    const [[user]] = await db.query(
      'SELECT status FROM user WHERE id_user = ?',
      [req.session.userId]
    );

    if (!user) {
      return next();
    }

    if (user.status === 'inactive' || user.status === 'pending') {
      return req.session.destroy(() => {
        return res.redirect('/login');
      });
    }
  } catch (err) {
    console.error('session check error:', err);
  }

  next();
});

/**
 * Pending admin count for layout badges.
 */
app.use(async (req, res, next) => {
  if (req.session.isLoggedIn && req.session.role === 'admin') {
    try {
      const [[row]] = await User.countPending();
      res.locals.pendingCount = row.count;
    } catch (err) {
      console.error('pending count error:', err);
      res.locals.pendingCount = 0;
    }
  } else {
    res.locals.pendingCount = 0;
  }

  next();
});

/**
 * Shared locals for views.
 */
app.use((req, res, next) => {
  res.locals.fullName = req.session.fullName || '';
  res.locals.role = req.session.role || '';
  res.locals.privileges = req.session.privileges || [];
  next();
});

app.use(async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      await db.execute('SET @current_user_id = ?', [req.session.userId]);
    } catch (err) {
      console.error('Error setting audit context:', err);
    }
  }
  next();
});

// Slack webhook — mounted BEFORE csrf (external calls have no CSRF token)
app.use('/api/slack', slackRoutes);

/**
 * Base route.
 */
app.get('/', (req, res) => res.redirect('/login'));

/**
 * Routes.
 */
app.use('/', csrfProtection, usersRoutes);
app.use('/employee', isAuth, requireRole('employee', 'admin', 'team-leader'), csrfProtection, employeeRoutes);
app.use('/team-leader', isAuth, requireRole('team-leader'), csrfProtection, teamLeaderRoutes);
app.use('/manager', isAuth, requireRole('manager'), csrfProtection, managerRoutes);
app.use('/admin', isAuth, requireRole('admin'), csrfProtection, adminRoutes);
app.use('/project-manager', isAuth, requireRole('project-manager'), csrfProtection, projectManagerRoutes);
app.use('/manager/reports', isAuth, requireRole('manager'), csrfProtection, reportRoutes);

/**
 * CSRF error handler.
 */
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).send('Invalid CSRF token');
  }
  next(err);
});

/**
 * 404 handler.
 */
app.use((req, res) => {
  res.status(404).send('Page not found');
});

/**
 * Server start.
 */
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});