/**
 * Project Manager Routes
 */

const express = require("express");
const rateLimit = require("express-rate-limit");
const router = express.Router();

const pmController = require("../controllers/project-manager.controller");
const reportController = require("../controllers/report.controller");
const { requirePrivilege } = require("../util/is-auth");

const selfReviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many self-review generation requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const aiSummaryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many AI summary requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const pdfExportLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many PDF export requests. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Generales
router.get("/dashboard", pmController.getDashboard);

router.get("/reports", requirePrivilege('generate_reports'), pmController.getReports);
router.get("/reports/project-team-range", requirePrivilege('generate_reports'), pmController.getProjectTeamRange);
router.get(
  "/reports/ai-summary",
  aiSummaryLimiter,
  requirePrivilege('generate_reports'),
  reportController.generateAiSummary,
);
router.get("/reports/export-pdf", pdfExportLimiter, requirePrivilege('generate_reports'), reportController.exportPDF);

router.get("/log", pmController.getLog);
router.post("/log", pmController.postLog);
router.post("/log/edit", pmController.postEditLog);
router.post("/log/delete", pmController.postDeleteLog);

router.get("/achievements", pmController.getAchievements);
router.post("/achievements", pmController.postAchievement);
router.post("/achievements/delete", pmController.deleteAchievement);
router.post("/achievements/edit", pmController.editAchievement);

router.get("/self-review", pmController.getSelfReview);
router.get(
  "/self-review/generate",
  selfReviewLimiter,
  pmController.generateSelfReview,
);
router.post(
  "/self-review/export-pdf",
  selfReviewLimiter,
  pmController.exportSelfReviewPDF,
);

// Perfil
router.get("/profile", pmController.getProfile);
router.post("/profile/slack", pmController.postSlack);
router.post("/profile/password", pmController.postPassword);

// Proyectos
router.get("/projects", requirePrivilege('manage_projects'), pmController.getProjects);
router.get("/project/:id", requirePrivilege('manage_projects'), pmController.getProjectDetail);
router.get("/project/:id/activity", requirePrivilege('manage_projects'), pmController.getProjectActivity);
router.get("/project/:id/blockers", requirePrivilege('manage_projects'), pmController.getProjectBlockers);
router.post("/projects/create", requirePrivilege('manage_projects'), pmController.postCreateProject);
router.post("/projects/:id/delete", requirePrivilege('manage_projects'), pmController.postDeleteProject);
router.post("/project/:id/edit", requirePrivilege('manage_projects'), pmController.postEditProject);
router.post("/project/:id/dates", requirePrivilege('manage_projects'), pmController.postProjectDates);
router.post("/project/:id/teams/assign", requirePrivilege('manage_projects'), pmController.postAssignTeam);
router.post("/project/:id/teams/:id_team/remove", requirePrivilege('manage_projects'), pmController.postRemoveTeam);
router.get("/project/:id/users/search", requirePrivilege('manage_projects'), pmController.getMemberSearch);
router.post("/project/:id/users/assign", requirePrivilege('manage_projects'), pmController.postAssignUser);
router.post("/project/:id/users/:id_user/remove", requirePrivilege('manage_projects'), pmController.postRemoveUser);
router.post(
  "/project/:id/report/export-pdf",
  requirePrivilege('manage_projects'),
  pmController.exportProjectReportPDF,
);

// Bloqueos
router.get("/blockers", requirePrivilege('manage_projects'), pmController.getBlockers);

module.exports = router;
