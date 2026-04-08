/**
 * User authentication controller.
 * Handles login, logout and credentials validation.
 */

const bcrypt = require('bcrypt');
const User = require('../models/user.model');

exports.getLogin = (req, res) => {
  res.render('auth/login', {
    layout: false,
    error: '',
  });
};

exports.postLogin = (req, res) => {
  const { username, password } = req.body;

  User.findByUsername(username)
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.render('auth/login', {
          layout: false,
          error: 'Invalid username or password.',
        });
      }

      const user = rows[0];

      return bcrypt.compare(password, user.password).then((match) => {
        if (!match) {
          return res.render('auth/login', {
            layout: false,
            error: 'Invalid username or password.',
          });
        }

        return User.fetchRoleByUser(user.id_user)
          .then(([roles]) => {
            const role = roles.length > 0 ? roles[0].role_name : 'employee';

            return User.fetchPrivilegesByUser(user.id_user).then(([privileges]) => {
              req.session.isLoggedIn = true;
              req.session.userId = user.id_user;
              req.session.username = user.username;
              req.session.fullName = user.full_name;
              req.session.role = role;
              req.session.privileges = privileges;

              req.session.save((err) => {
                if (err) {
                  console.log(err);
                  return res.status(500).send('Session error');
                }

                const dashboardRoutes = {
                  admin: '/admin/dashboard',
                  manager: '/manager/dashboard',
                  'team-leader': '/team-leader/dashboard',
                  'project-manager': '/project-manager/dashboard',
                  employee: '/employee/dashboard',
                };

                res.redirect(dashboardRoutes[role] || '/employee/dashboard');
              });
            });
          });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.getLogout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect('/login');
  });
};

exports.getSignup = (req, res) => {
  res.render('auth/signup', {
    layout: false,
    error: '',
  });
};

exports.postSignup = (req, res) => {
  const { full_name, email, username, password } = req.body;

  bcrypt.hash(password, 12)
    .then((hashedPassword) => {
      return User.create(full_name, email, username, hashedPassword);
    })
    .then(([result]) => {
      return User.assignRole(result.insertId, 4);
    })
    .then(() => {
      res.redirect('/login');
    })
    .catch((err) => {
      console.log(err);
      res.render('auth/signup', {
        layout: false,
        error: 'Username or email already exists.',
      });
    });
};