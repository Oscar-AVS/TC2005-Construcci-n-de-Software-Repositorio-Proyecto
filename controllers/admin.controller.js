/**
 * Admin views controller.
 * Handles system administration: users, teams, roles, integrations and profile.
 */

const User = require('../models/user.model');
const Team = require('../models/team.model');
const Log = require('../models/log.model');
const Blocker = require('../models/blocker.model');
const Project = require('../models/project.model');
const Achievement = require('../models/achievement.model');
const db = require('../util/database');
const bcrypt = require('bcrypt');

exports.getDashboard = async (req, res) => {
  const activeUserId = req.session.userId;
  const weekOffset = parseInt(req.query.weekOffset) || 0;
  const orgWeekOffset = parseInt(req.query.orgWeekOffset) || 0;
  const activeTab = req.query.tab || 'system-dashboard';
  const activeView = req.query.view || 'personal';

  try {
    const [[{ totalUsers }]] = await db.query(
      `SELECT COUNT(*) AS totalUsers FROM user WHERE status = 'active'`
    );
    const [[{ totalTeams }]] = await db.query(
      `SELECT COUNT(*) AS totalTeams FROM team`
    );
    const [[{ pendingApprovals }]] = await db.query(
      `SELECT COUNT(*) AS pendingApprovals FROM user WHERE status = 'pending'`
    );
    const [roleStats] = await db.query(
      `SELECT r.role_name, COUNT(ur.id_user) AS count
      FROM role r
      LEFT JOIN user_role ur ON r.id_role = ur.id_role
      LEFT JOIN user u ON ur.id_user = u.id_user AND u.status = 'active'
      GROUP BY r.id_role, r.role_name
      ORDER BY r.id_role`
    );
    const [recentUsers] = await db.query(
      `SELECT u.full_name, r.role_name, u.id_user
      FROM user u
      LEFT JOIN user_role ur ON u.id_user = ur.id_user
      LEFT JOIN role r ON ur.id_role = r.id_role
      WHERE u.status = 'active'
      ORDER BY u.id_user DESC
      LIMIT 4`
    );

    const [weekRows] = await Log.countByWeek(activeUserId, weekOffset);
    const [todayLogs] = await Log.fetchToday(activeUserId);
    const [weekLogs] = await Log.fetchByWeek(activeUserId, weekOffset);
    const [[blockerRow]] = await Blocker.countActiveByUser(activeUserId);

    const [[orgActiveUsers]] = await User.countActive();
    const [[orgTodayLogsCount]] = await Log.countTodayAll();
    const [[orgActiveBlockers]] = await Blocker.countAllActive();
    const [orgWeekRows] = await Log.countByWeekAll(orgWeekOffset);
    const [orgWeekLogs] = await Log.fetchByWeekAll(orgWeekOffset);

    const [allTeamsRaw] = await Team.fetchAll();
    const uniqueTeamsMap = new Map();
    allTeamsRaw.forEach(team => {
      if (!uniqueTeamsMap.has(team.id_team)) {
        uniqueTeamsMap.set(team.id_team, {
          id_team: team.id_team,
          team_name: team.team_name,
          description: team.description,
        });
      }
    });
    const teams = Array.from(uniqueTeamsMap.values());

    const weeklyData = [0, 0, 0, 0, 0];
    weekRows.forEach(row => {
      if (row.weekday <= 4) weeklyData[row.weekday] = Number(row.count);
    });

    const orgWeeklyData = [0, 0, 0, 0, 0];
    orgWeekRows.forEach(row => {
      if (row.weekday <= 4) orgWeeklyData[row.weekday] = Number(row.count);
    });

    const logsByDay = [[], [], [], [], []];
    weekLogs.forEach(log => {
      if (log.weekday <= 4) {
        logsByDay[log.weekday].push({ id_log: log.id_log, completed: log.completed, created_at: log.created_at });
      }
    });

    const orgLogsByDay = [[], [], [], [], [], [], []];
    orgWeekLogs.forEach(log => {
      orgLogsByDay[log.weekday].push({
        id_log: log.id_log,
        full_name: log.full_name,
        completed: log.completed,
        created_at: log.created_at,
        team_names: log.team_names,
      });
    });

    res.render('admin/dashboard', {
      currentPage: 'dashboard',
      role: 'admin',
      totalUsers,
      totalTeams,
      pendingApprovals,
      roleStats,
      recentUsers,
      weeklyData,
      logsByDay,
      todayLogs,
      completedToday: todayLogs.length,
      weeklyTotal: weeklyData.reduce((a, b) => a + b, 0),
      activeBlockers: Number(blockerRow.count),
      orgActiveUsers: Number(orgActiveUsers.count),
      orgTodayLogsCount: Number(orgTodayLogsCount.count),
      orgActiveBlockers: Number(orgActiveBlockers.count),
      orgWeeklyData,
      orgLogsByDay,
      teams,
      weekOffset,
      orgWeekOffset,
      activeTab,
      activeView,
    });
  } catch (err) {
    console.error('getDashboard error:', err);
    res.status(500).send('Error loading dashboard');
  }
};

exports.getUsers = async (req, res) => {
  try {
    const [users] = await User.fetchAll();
    const [roles] = await db.query('SELECT * FROM role ORDER BY id_role ASC');
    const [pending] = await User.fetchPending();
    res.render('admin/users', {
      currentPage: 'users',
      role: 'admin',
      users,
      roles,
      pending,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error('getUsers error:', err);
    res.status(500).send('Error loading users');
  }
};

exports.toggleUserStatus = async (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  try {
    const [[user]] = await db.query(
      'SELECT id_user AS id, status FROM user WHERE id_user = ?', [id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newStatus = user.status === 'active' ? 'inactive' : 'active';

    await db.query(
      'UPDATE user SET status = ? WHERE id_user = ?',
      [newStatus, id]
    );

    res.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('toggleUserStatus error:', err);
    res.status(500).json({ success: false, message: 'Could not update user status' });
  }
};

exports.createUser = async (req, res) => {
  const { full_name, email, password, id_role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await User.create(full_name, email, hashedPassword);
    await User.assignRole(result.insertId, id_role);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).send('Error creating user');
  }
};

exports.editUser = async (req, res) => {
  const { id_user, full_name, email, id_role } = req.body;

  try {
    await User.update(id_user, full_name, email);
    await User.updateRole(id_user, id_role);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('editUser error:', err);
    res.status(500).send('Error updating user');
  }
};

exports.getTeams = async (req, res) => {
  try {
    const [rows] = await Team.fetchAll();
    const [users] = await User.fetchAll();

    const teamsMap = {};
    rows.forEach(row => {
      if (!teamsMap[row.id_team]) {
        teamsMap[row.id_team] = {
          id_team: row.id_team,
          team_name: row.team_name,
          description: row.description,
          created_at: row.created_at,
          leader_id: row.leader_id,
          leader_name: row.leader_name,
          members: [],
        };
      }
      if (row.member_name) {
        teamsMap[row.id_team].members.push({
          full_name: row.member_name,
          email: row.member_email,
        });
      }
    });

    const teams = Object.values(teamsMap);

    res.render('admin/teams', {
      currentPage: 'teams',
      role: 'admin',
      teams,
      users,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error('getTeams error:', err);
    res.status(500).send('Error loading teams');
  }
};

exports.createTeam = async (req, res) => {
  const { team_name, description, id_leader } = req.body;

  try {
    await Team.create(team_name, description, id_leader || null);
    res.redirect('/admin/teams');
  } catch (err) {
    console.error('createTeam error:', err);
    res.status(500).send('Error creating team');
  }
};

exports.editTeam = async (req, res) => {
  const { id_team, team_name, description, id_leader } = req.body;

  try {
    await Team.update(id_team, team_name, description, id_leader || null);
    res.redirect('/admin/teams');
  } catch (err) {
    console.error('editTeam error:', err);
    res.status(500).send('Error updating team');
  }
};

exports.deleteTeam = async (req, res) => {
  const { id_team } = req.body;

  try {
    await Team.delete(id_team);
    res.redirect('/admin/teams');
  } catch (err) {
    console.error('deleteTeam error:', err);
    res.status(500).send('Error deleting team');
  }
};

exports.getRoles = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.id_role, r.role_name,
        u.full_name, u.email
       FROM role r
       LEFT JOIN user_role ur ON r.id_role = ur.id_role
       LEFT JOIN user u ON ur.id_user = u.id_user AND u.status = 'active'
       ORDER BY r.id_role, u.full_name`
    );

    const rolesMap = {};
    rows.forEach(row => {
      if (!rolesMap[row.id_role]) {
        rolesMap[row.id_role] = {
          id_role: row.id_role,
          role_name: row.role_name,
          users: [],
        };
      }
      if (row.full_name) {
        rolesMap[row.id_role].users.push({
          full_name: row.full_name,
          email: row.email,
        });
      }
    });

    const roles = Object.values(rolesMap);

    res.render('admin/roles', {
      currentPage: 'roles',
      role: 'admin',
      roles,
    });
  } catch (err) {
    console.error('getRoles error:', err);
    res.status(500).send('Error loading roles');
  }
};

// ─── LOG ─────────────────────────────────────────────────────────────────────

exports.getLog = async (req, res) => {
  const activeUserId = req.session.userId;
  const filters = {
    id_project: req.query.id_project || null,
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null,
  };
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const [[countResult]] = await Log.countAllByEmployee(activeUserId, filters);
    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const [logs] = await Log.fetchAllByEmployee(activeUserId, filters, limit, offset);
    const [projects] = await Project.fetchAllByEmployee(activeUserId);

    const logsWithBlockers = await Promise.all(
      logs.map(async (log) => {
        const [blockers] = await Blocker.fetchByLog(log.id_log);
        return { ...log, blockers };
      })
    );

    res.render('shared/log', {
      currentPage: 'log',
      role: 'admin',
      logBase: '/admin',
      logs: logsWithBlockers,
      projects,
      filters,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      csrfToken: req.csrfToken(),
      successMessage: req.query.success === 'true' ? 'Log entry created successfully!' : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postLog = (req, res) => {
  const activeUserId = req.session.userId;
  const { completed, planned, blocker } = req.body;
  let id_projects = req.body.id_projects;

  if (!id_projects) return res.redirect('/admin/log?error=noproject');
  if (!Array.isArray(id_projects)) id_projects = [id_projects];

  Log.create(activeUserId, completed, planned)
    .then(([result]) => {
      const insertId = result.insertId;
      return Project.fetchAllByEmployee(activeUserId).then(([projects]) => {
        const projectsToLink = projects
          .filter((p) => id_projects.includes(String(p.id_project)))
          .map((p) => ({ id_project: p.id_project, id_team: p.id_team }));
        return Log.linkProjects(insertId, projectsToLink).then(() => {
          if (blocker && blocker.trim() !== '') {
            return Blocker.create(insertId, blocker);
          }
        });
      });
    })
    .then(() => res.redirect('/admin/log?success=true'))
    .catch((err) => {
      console.error(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.putLog = (req, res) => {
  const activeUserId = req.session.userId;
  const { id_log, completed, planned, blocker, blocker_id, blocker_status } = req.body;
  let id_projects = req.body.id_projects;

  if (!Array.isArray(id_projects)) id_projects = id_projects ? [id_projects] : [];
  id_projects = id_projects.filter((p) => p !== '');

  Log.update(id_log, completed, planned)
    .then(() => {
      if (id_projects.length === 0) return;
      return Project.fetchAllByEmployee(activeUserId).then(([projects]) => {
        const projectsToLink = projects
          .filter((p) => id_projects.includes(String(p.id_project)))
          .map((p) => ({ id_project: p.id_project, id_team: p.id_team }));
        if (projectsToLink.length === 0) return;
        return Log.updateProjects(id_log, projectsToLink);
      });
    })
    .then(() => {
      if (blocker && blocker.trim() !== '') {
        if (blocker_id) {
          return Blocker.update(blocker_id, blocker, blocker_status || 'pending');
        } else {
          return Blocker.create(id_log, blocker);
        }
      } else if (blocker_id) {
        return Blocker.deleteByLog(id_log);
      }
    })
    .then(() => res.redirect('/admin/log'))
    .catch((err) => {
      console.error(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.deleteLog = (req, res) => {
  const { id_log } = req.body;
  Log.delete(id_log)
    .then(() => res.redirect('/admin/log'))
    .catch((err) => {
      console.error(err);
      res.status(500).send('Internal Server Error');
    });
};

// ─── ACHIEVEMENTS ─────────────────────────────────────────────────────────────

exports.getAchievements = async (req, res) => {
  const activeUserId = req.session.userId;
  const filters = {
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null,
  };
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const [[countResult]] = await Achievement.countAllByUser(activeUserId, filters);
    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;
    const [achievements] = await Achievement.fetchAllByUser(activeUserId, filters, limit, offset);
    const [projects] = await Project.fetchAllByEmployee(activeUserId);

    res.render('employee/achievements', {
      currentPage: 'achievements',
      role: 'admin',
      achievementsBase: '/admin',
      achievements,
      projects,
      filters,
      totalRecords,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postAchievement = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.postAchievement(req, res);
};

exports.deleteAchievement = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.deleteAchievement(req, res);
};

exports.editAchievement = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.editAchievement(req, res);
};

// ─── PROJECTS ─────────────────────────────────────────────────────────────────

exports.getProjects = (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.getProjects(req, res);
};

// ─── SELF-REVIEW ─────────────────────────────────────────────────────────────

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'admin',
    selfReviewBase: '/admin',
    csrfToken: req.csrfToken(),
  });
};

exports.generateSelfReview = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.generateSelfReview(req, res);
};

exports.exportSelfReviewPDF = async (req, res) => {
  const employeeController = require('./employee.controller');
  return employeeController.exportSelfReviewPDF(req, res);
};

exports.getProfile = async (req, res) => {
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'admin',
      user,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.approveUser = async (req, res) => {
  const { id_user } = req.body;

  try {
    await User.approve(id_user);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('approveUser error:', err);
    res.status(500).send('Error approving user');
  }
};

exports.rejectUser = async (req, res) => {
  const { id_user } = req.body;

  try {
    await User.rejectUser(id_user);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('rejectUser error:', err);
    res.status(500).send('Error rejecting user');
  }
};

exports.deleteUser = async (req, res) => {
  const { id_user } = req.body;

  try {
    await User.delete(id_user);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('deleteUser error:', err);
    res.status(500).send('Error deleting user');
  }
};

exports.postSlack = async (req, res) => {
  const { slack_user } = req.body;
  try {
    await User.updateSlack(req.session.userId, slack_user);
    const [[user]] = await User.fetchOne(req.session.userId);
    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'admin',
      user,
      error: '',
      success: 'Slack username updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postPassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    const match = await bcrypt.compare(current_password, user.password);

    if (!match) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'admin',
        user,
        error: 'Current password is incorrect.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    if (new_password !== confirm_password) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'admin',
        user,
        error: 'New passwords do not match.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await User.updatePassword(req.session.userId, hashed);
    const [[updatedUser]] = await User.fetchOne(req.session.userId);
    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'admin',
      user: updatedUser,
      error: '',
      success: 'Password updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};