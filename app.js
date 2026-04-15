/**
 * Application entry point.
 * Configures Express, views and routes.
 */

require('dotenv').config();
const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const csrf = require('csurf');
const db = require('./util/database');
const User = require('./models/user.model');

const app = express();

db.query('SELECT DATABASE() AS db_name')
  .then(([rows]) => {
    console.log('Base conectada:', rows[0].db_name);
  })
  .catch((error) => {
    console.error('Error de conexion a BD:', error.message);
  });

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(expressLayouts);
app.set('layout', 'layouts/main');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'mufasa_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 },
}));

app.use(async (req, res, next) => {
  if (!req.session.isLoggedIn || !req.session.userId) {
    return next();
  }

  const isAjax = req.xhr || req.headers.accept?.includes('application/json') || req.method === 'PATCH';
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

app.use(async (req, res, next) => {
  if (req.session.isLoggedIn && req.session.role === 'admin') {
    try {
      const [[row]] = await User.countPending();
      res.locals.pendingCount = row.count;
    } catch (err) {
      res.locals.pendingCount = 0;
    }
  } else {
    res.locals.pendingCount = 0;
  }
  next();
});

const csrfProtection = csrf();

const isAuth = require('./util/is-auth');
const { requireRole } = require('./util/is-auth');
const usersRoutes = require('./routes/users.routes');
const employeeRoutes = require('./routes/employee.routes');
const teamLeaderRoutes = require('./routes/team-leader.routes');
const managerRoutes = require('./routes/manager.routes');
const adminRoutes = require('./routes/admin.routes');
const projectManagerRoutes = require('./routes/project-manager.routes');
const reportRoutes = require('./routes/report.routes');

app.get('/', (req, res) => res.redirect('/login'));
app.use('/', csrfProtection, usersRoutes);
app.use('/employee', isAuth, requireRole('employee'), csrfProtection, employeeRoutes);
app.use('/team-leader', isAuth, requireRole('team-leader'), csrfProtection, teamLeaderRoutes);
app.use('/manager', isAuth, requireRole('manager'), csrfProtection, managerRoutes);
app.use('/admin', isAuth, requireRole('admin'), csrfProtection, adminRoutes);
app.use('/project-manager', isAuth, requireRole('project-manager'), csrfProtection, projectManagerRoutes);
app.use('/manager/reports', isAuth, requireRole('manager'), csrfProtection, reportRoutes);

app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).send('Invalid CSRF token');
  }
  next(err);
});

app.use((req, res) => res.status(404).send('Page not found'));

app.listen(3000);