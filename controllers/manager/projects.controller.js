/**
 * Manager projects controller.
 * Reuses employee project view logic for the manager role.
 */

exports.getProjects = (req, res) => {
  const employeeController = require('../employee.controller');
  return employeeController.getProjects(req, res);
};