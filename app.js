/**
 * Application entry point.
 * Configures Express, views and routes.
 */

const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// View engine configuration
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Enables a base layout for all authenticated views
app.use(expressLayouts);
app.set('layout', 'layouts/main');

// Static files and form parsing
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

// Routes
const usersRoutes = require('./routes/users.routes');
const empleadoRoutes = require('./routes/empleado.routes');

app.get('/', (req, res) => res.redirect('/login'));
app.use('/', usersRoutes);
app.use('/empleado', empleadoRoutes);

// 404 handler for undefined routes
app.use((req, res) => res.status(404).send('Page not found'));

const PORT = 3000;
app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));