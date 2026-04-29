/**
 * Manager self-review controller.
 * Reuses employee self-review logic with manager role settings.
 */

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'manager',
    selfReviewBase: '/manager',
    csrfToken: req.csrfToken(),
  });
};

exports.generateSelfReview = async (req, res) => {
  const employeeController = require('../employee.controller');
  return employeeController.generateSelfReview(req, res);
};

exports.exportSelfReviewPDF = async (req, res) => {
  const employeeController = require('../employee.controller');
  return employeeController.exportSelfReviewPDF(req, res);
};