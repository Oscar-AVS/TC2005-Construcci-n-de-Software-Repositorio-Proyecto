exports.getIndex = (req, res) => {
  res.render('pages/index', {
    isAuthenticated: false,
    loginError: '',
    user: null,
  });
};