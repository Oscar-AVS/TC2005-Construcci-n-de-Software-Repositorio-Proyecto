/**
 * Manager dashboard controller.
 * Handles the main manager dashboard view.
 */

const Log = require('../../models/log.model');
const Goal = require('../../models/goal.model');
const Highlight = require('../../models/highlight.model');
const Blocker = require('../../models/blocker.model');
const Achievement = require('../../models/achievement.model');
const User = require('../../models/user.model');

// (MANAGER DASHBOARD) Controlador para cargar el dashboard con datos reales
exports.getDashboard = async (req, res) => {
  try {
    const idUser = req.session.user ? req.session.user.id_user : req.session.userId;

    const [
      totalEntriesResult,
      achievementsResult,
      blockersResult,
      activeGoalsResult,
      recentHighlightsResult,
      criticalGoalsResult,
      activeGoalsListResult,
      activeBlockersResult,
      activeEmployeesResult,
      logsTodayResult,
    ] = await Promise.all([
      Log.countAllForManagerDashboard(),
      Achievement.countByManager(idUser),
      Blocker.countAllActive(),
      Goal.countActiveByManager(idUser),
      Highlight.fetchRecentByManager(idUser, 3),
      Goal.fetchCriticalByManager(idUser, 3),
      Goal.fetchActiveByManager(idUser, 3),
      Blocker.fetchActiveForManagerDashboard(3),
      User.countActive(),
      Log.countTodayAll(),
    ]);

    res.render('manager/dashboard', {
      currentPage: 'dashboard',
      role: 'manager',
      dashboardStats: {
        totalEntries: totalEntriesResult[0][0].count || 0,
        achievements: achievementsResult[0][0].count || 0,
        blockers: blockersResult[0][0].count || 0,
        activeGoals: activeGoalsResult[0][0].count || 0,
        activeEmployees: activeEmployeesResult[0][0].count || 0,
        logsToday: logsTodayResult[0][0].count || 0,
      },
      recentHighlights: recentHighlightsResult[0] || [],
      criticalGoals: criticalGoalsResult[0] || [],
      activeGoalsList: activeGoalsListResult[0] || [],
      activeBlockers: activeBlockersResult[0] || [],
    });
  } catch (error) {
    console.error('Error loading manager dashboard:', error);

    res.render('manager/dashboard', {
      currentPage: 'dashboard',
      role: 'manager',
      dashboardStats: {
        totalEntries: 0,
        achievements: 0,
        blockers: 0,
        activeGoals: 0,
        activeEmployees: 0,
        logsToday: 0,
      },
      recentHighlights: [],
      criticalGoals: [],
      activeGoalsList: [],
      activeBlockers: [],
    });
  }
};