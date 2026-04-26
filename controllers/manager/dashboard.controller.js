/**
 * Manager dashboard controller.
 * Handles the main manager dashboard view.
 */

exports.getDashboard = (req, res) => {
  res.render('manager/dashboard', {
    currentPage: 'dashboard',
    role: 'manager',
  });
};