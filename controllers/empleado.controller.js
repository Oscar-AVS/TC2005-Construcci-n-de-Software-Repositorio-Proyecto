/**
 * Employee views controller.
 * Handles dashboard, bitacora, achievements and self-review.
 */

exports.getDashboard = (req, res) => {
  res.render('empleado/dashboard');
};