/**
 * Project Manager Routes
 */

const express   = require('express');
const rateLimit = require('express-rate-limit');
const router    = express.Router();
const pmController = require('../controllers/project-manager.controller');

const selfReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: 'Too many self-review generation requests. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generales
router.get('/dashboard',   pmController.getDashboard);
router.get('/reports',     pmController.getReports);
router.get('/log',         pmController.getLog);
router.get('/self-review', pmController.getSelfReview);
router.get('/self-review/generate',     selfReviewLimiter, pmController.generateSelfReview);
router.post('/self-review/export-pdf',  selfReviewLimiter, pmController.exportSelfReviewPDF);

// Perfil
router.get('/profile',           pmController.getProfile);
router.post('/profile/slack',    pmController.postSlack);
router.post('/profile/password', pmController.postPassword);

// Proyectos
router.get('/projects',         pmController.getProjects);
router.get('/project/:id',      pmController.getProjectDetail);

router.post('/projects/create',     pmController.postCreateProject);  // 4.1
router.post('/projects/:id/delete', pmController.postDeleteProject);  // 4.3

router.post('/project/:id/edit',  pmController.postEditProject);    // 4.2
router.post('/project/:id/dates', pmController.postProjectDates);   // 4.4
router.post('/project/:id/progress', pmController.postProjectProgressStatus); // 4.5

module.exports = router;
