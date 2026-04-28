module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect('/login');
  }
  next();
};

module.exports.requireRole = (...roles) => (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect('/login');
  }
  if (!roles.includes(req.session.role)) {
    return res.redirect('/login?error=access_denied');
  }
  next();
};

module.exports.requirePrivilege = (privilege) => (req, res, next) => {
  if (!req.session.isLoggedIn) {
    return res.redirect('/login');
  }
  const userPrivileges = req.session.privileges || [];
  if (!userPrivileges.includes(privilege)) {
    return res.redirect('/login?error=access_denied_privilege');
  }
  next();
};