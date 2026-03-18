/**
 * User authentication controller.
 * Handles login, logout and credentials validation.
 */

exports.getLogin = (req, res) => {
  // Layout false because login is a standalone page without sidebar/topbar
  res.render('auth/login', {
    layout: false,
    error: '',
  });
};

exports.postLogin = (req, res) => {
  const { username, password } = req.body;

  // Temporary validation until database connection is implemented
  if (username === 'admin' && password === '1234') {
    return res.redirect('/employee/dashboard');
  }

  res.render('auth/login', {
    layout: false,
    error: 'Invalid username or password.',
  });
};

exports.getLogout = (req, res) => {
  // Redirects to login, session will be destroyed when express-session is implemented
  res.redirect('/login');
};