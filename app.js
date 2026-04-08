/**
 * Application entry point.
 * Configures Express, views and routes.
 */

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const session = require('express-session');
const db = require('./util/database');

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
  secret: 'mufasa_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 24 },
}));

const usersRoutes = require('./routes/users.routes');
const employeeRoutes = require('./routes/employee.routes');
const teamLeaderRoutes = require('./routes/team-leader.routes');
const managerRoutes = require('./routes/manager.routes');
const adminRoutes = require('./routes/admin.routes');
const projectManagerRoutes = require('./routes/project-manager.routes');
const reportRoutes = require('./routes/report.routes');
const isAuth = require('./util/is-auth');

app.get('/', (req, res) => res.redirect('/login'));
app.use('/', usersRoutes);
app.use('/employee', isAuth, employeeRoutes);
app.use('/team-leader', isAuth, teamLeaderRoutes);
app.use('/manager', isAuth, managerRoutes);
app.use('/admin', isAuth, adminRoutes);
app.use('/project-manager', isAuth, projectManagerRoutes);
app.use('/manager/reports', isAuth, reportRoutes);

app.use((req, res) => res.status(404).send('Page not found'));

app.listen(3000);