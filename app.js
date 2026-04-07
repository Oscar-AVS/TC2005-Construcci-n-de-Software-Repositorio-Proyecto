/**
 * Application entry point.
 * Configures Express, views and routes.
 */

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const db = require('./models/db');

const app = express();
db.query('SELECT DATABASE() AS db_name')
  .then(([rows]) => {
    console.log('Base conectada:', rows[0].db_name);
  })
  .catch((error) => {
    console.error('Error de conexion a BD:', error.message);
  });

// View engine configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enable base layout for all views
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Static files and form parsing
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 

// Routes
const usersRoutes = require('./routes/users.routes');
const employeeRoutes = require('./routes/employee.routes');
const teamLeaderRoutes = require('./routes/team-leader.routes');
const managerRoutes = require('./routes/manager.routes');
const adminRoutes = require('./routes/admin.routes');
const projectManagerRoutes = require('./routes/project-manager.routes');
const reportRoutes = require('./routes/report.routes');

// Route configuration
app.get('/', (req, res) => res.redirect('/login'));

app.use('/', usersRoutes);
app.use('/employee', employeeRoutes);
app.use('/team-leader', teamLeaderRoutes);
app.use('/manager', managerRoutes);
app.use('/admin', adminRoutes);
app.use('/project-manager', projectManagerRoutes);
app.use('/manager/reports', reportRoutes);

// 404 handler for undefined routes
app.use((req, res) => res.status(404).send('Page not found'));

app.listen(3000);