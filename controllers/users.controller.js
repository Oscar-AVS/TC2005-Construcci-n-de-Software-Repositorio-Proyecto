/**
 * User authentication controller.
 * Handles login, logout and credentials validation.
 */

const bcrypt = require('bcrypt');
const User = require('../models/user.model');

exports.getLogin = (req, res) => {
  const error = req.query.error === 'access_denied'
    ? 'You do not have permission to access that page. Please log in with the correct account.'
    : '';

  res.render('auth/login', {
    layout: false,
    error,
    csrfToken: req.csrfToken(),
  });
};

exports.postLogin = (req, res) => {
  const { email, password, rememberMe } = req.body;

  User.findByEmail(email)
    .then(([rows]) => {
      if (rows.length === 0) {
        return res.render('auth/login', {
          layout: false,
          error: 'Invalid email or password.',
          csrfToken: req.csrfToken(),
        });
      }

      const user = rows[0];

      if (user.status === 'pending') {
        return res.render('auth/login', {
          layout: false,
          error: 'Your account is pending approval. Please wait for an administrator to activate it.',
          csrfToken: req.csrfToken(),
        });
      }

      if (user.status === 'inactive') {
        return res.render('auth/login', {
          layout: false,
          error: 'Your account has been deactivated. Please contact an administrator.',
          csrfToken: req.csrfToken(),
        });
      }

      return bcrypt.compare(password, user.password).then((match) => {
        if (!match) {
          return res.render('auth/login', {
            layout: false,
            error: 'Invalid email or password.',
            csrfToken: req.csrfToken(),
          });
        }

        return User.fetchRoleByUser(user.id_user)
          .then(([roles]) => {
            const role = roles.length > 0 ? roles[0].role_name : 'employee';

            return User.fetchPrivilegesByUser(user.id_user).then(([privileges]) => {
              req.session.isLoggedIn = true;
              req.session.userId = user.id_user;
              req.session.email = user.email;
              req.session.fullName = user.full_name;
              req.session.role = role;
              req.session.privileges = privileges.map((p) => p.privilege_name);

              if (role === 'team-leader') {
                return User.fetchTeamByLeader(user.id_user).then(([teams]) => {
                  req.session.teamId = teams.length > 0 ? teams[0].id_team : null;
                  return saveAndRedirect(req, res, role, rememberMe);
                });
              }

              return saveAndRedirect(req, res, role, rememberMe);
            });
          });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

function saveAndRedirect(req, res, role, rememberMe) {
  const dashboardRoutes = {
    admin: '/admin/dashboard',
    manager: '/manager/dashboard',
    'team-leader': '/team-leader/dashboard',
    'project-manager': '/project-manager/dashboard',
    employee: '/employee/dashboard',
  };

  if (rememberMe) {
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 30;
  } else {
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24;
  }

  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        console.log(err);
        return reject(err);
      }
      res.redirect(dashboardRoutes[role] || '/employee/dashboard');
      resolve();
    });
  });
}

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
    success: '',
    csrfToken: req.csrfToken(),
  });
};

exports.postSignup = (req, res) => {
  const { full_name, email, password } = req.body;

  const trimmedName = full_name ? full_name.trim() : '';
  if (!trimmedName) {
    return res.render('auth/signup', { layout: false, error: 'Full name is required.', success: '', csrfToken: req.csrfToken() });
  }
  if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/.test(trimmedName)) {
    return res.render('auth/signup', { layout: false, error: 'Full name must contain letters only, no numbers.', success: '', csrfToken: req.csrfToken() });
  }
  if (trimmedName.split(' ').filter(w => w).length < 2) {
    return res.render('auth/signup', { layout: false, error: 'Please enter first and last name.', success: '', csrfToken: req.csrfToken() });
  }

  bcrypt.hash(password, 12)
    .then((hashedPassword) => {
      return User.createPending(full_name, email, hashedPassword);
    })
    .then(([result]) => {
      return User.assignRole(result.insertId, 4);
    })
    .then(() => {
      res.render('auth/signup', {
        layout: false,
        error: '',
        success: 'Account created successfully. Please wait for an administrator to approve your account.',
        csrfToken: req.csrfToken(),
      });
    })
    .catch((err) => {
      console.log(err);
      res.render('auth/signup', {
        layout: false,
        error: 'Email already exists.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    });
};