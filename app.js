const express = require('express');
const path = require('path');
const app = express();

const pagesRoutes = require('./routes/pages.routes');
const usersRoutes = require('./routes/users.routes');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));

app.use('/', pagesRoutes);
app.use('/', usersRoutes);

app.listen(3000);