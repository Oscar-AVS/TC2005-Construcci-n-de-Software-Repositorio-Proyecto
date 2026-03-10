const User = require('../models/user.model');

exports.postLogin = (req, res) => {
  const { username, password } = req.body;

  const user = User.findByUsername(username);

  if (!user || user.password !== password) {
    return res.render('pages/index', {
      isAuthenticated: false,
      loginError: 'Invalid username or password.',
      user: null,
    });
  }

  return res.render('pages/index', {
    isAuthenticated: true,
    loginError: '',
    user,
  });
};

exports.getLogout = (req, res) => {
  res.render('pages/index', {
    isAuthenticated: false,
    loginError: '',
    user: null,
  });
};