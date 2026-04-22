const db = require("../util/database");

/**
 * Team Leader views controller.
 * Handles dashboard, personal log, team log, team members, team report, self-review and profile.
 */

const Log = require("../models/log.model");
const Blocker = require("../models/blocker.model");
const Project = require("../models/project.model");
const User = require("../models/user.model");
const bcrypt = require("bcrypt");

exports.getDashboard = async (req, res) => {
  try {
    const teamIds = req.session.teamIds || [];
    if (teamIds.length === 0) {
      const [teams] = await User.fetchTeamByLeader(req.session.userId);
      if (teams.length > 0) {
        req.session.teamIds = teams.map(t => t.id_team);
        req.session.teamId = teams[0].id_team;
        await new Promise((resolve, reject) =>
          req.session.save((err) => (err ? reject(err) : resolve())),
        );
      } else {
        return res.render("team-leader/dashboard", {
          currentPage: "dashboard",
          noTeam: true,
        });
      }
    }
    const activeTeamIds = req.session.teamIds;

    const activeUserId = req.session.userId;
    const weekOffset = parseInt(req.query.weekOffset) || 0;
    const orgWeekOffset = parseInt(req.query.orgWeekOffset) || 0;
    const activeView = req.query.view || "team-dashboard";

    const [
      [[{ totalMembers }]],
      [[{ entriesThisWeek }]],
      [[{ totalAchievements }]],
      [[{ totalBlockers }]],
      [teamMembersOverview],
      [pendingBlockers],
      [pendingAchievements],
      [recentActivity],
      [weekRows],
      [todayLogs],
      [weekLogs],
      [[blockerRow]],
      [[orgActiveUsers]],
      [[orgTodayLogsCount]],
      [[orgActiveBlockers]],
      [orgWeekRows],
      [orgWeekLogs],
    ] = await Promise.all([
      db.query(
        `SELECT COUNT(*) AS totalMembers FROM user_team WHERE id_team IN (?)`,
        [activeTeamIds],
      ),
      db.query(
        `SELECT COUNT(DISTINCT l.id_log) AS entriesThisWeek
         FROM log l
         INNER JOIN log_project lp ON l.id_log = lp.id_log
         WHERE lp.id_team IN (?)
           AND YEARWEEK(DATE(l.created_at), 1) = YEARWEEK(CURDATE(), 1)`,
        [activeTeamIds],
      ),
      db.query(
        `SELECT COUNT(*) AS totalAchievements
         FROM achievement a
         INNER JOIN user_team ut ON a.id_user = ut.id_user
         WHERE ut.id_team IN (?)
           AND a.validation_status = 'approved'`,
        [activeTeamIds],
      ),
      db.query(
        `SELECT COUNT(*) AS totalBlockers
         FROM blocker b
         INNER JOIN log l ON b.id_log = l.id_log
         INNER JOIN log_project lp ON l.id_log = lp.id_log
         WHERE lp.id_team IN (?)
           AND b.resolution_status = 'pending'`,
        [activeTeamIds],
      ),
      db.query(
        `SELECT
          u.id_user, u.full_name, u.email, u.avatar,
          COALESCE(entries.entries_this_week, 0) AS entries_this_week,
          CASE WHEN COALESCE(blockers.pending_blockers, 0) > 0 THEN 'Blocked' ELSE 'On Track' END AS member_status
         FROM user_team ut
         INNER JOIN user u ON ut.id_user = u.id_user
         LEFT JOIN (
           SELECT l.id_user, COUNT(DISTINCT l.id_log) AS entries_this_week
           FROM log l INNER JOIN log_project lp ON l.id_log = lp.id_log
           WHERE lp.id_team IN (?) AND YEARWEEK(DATE(l.created_at), 1) = YEARWEEK(CURDATE(), 1)
           GROUP BY l.id_user
         ) entries ON u.id_user = entries.id_user
         LEFT JOIN (
           SELECT l.id_user, COUNT(DISTINCT b.id_blocker) AS pending_blockers
           FROM blocker b INNER JOIN log l ON b.id_log = l.id_log INNER JOIN log_project lp ON l.id_log = lp.id_log
           WHERE lp.id_team IN (?) AND b.resolution_status = 'pending'
           GROUP BY l.id_user
         ) blockers ON u.id_user = blockers.id_user
         WHERE ut.id_team IN (?)
         GROUP BY u.id_user
         ORDER BY u.full_name ASC`,
        [activeTeamIds, activeTeamIds, activeTeamIds],
      ),
      db.query(
        `SELECT b.id_blocker, b.description, l.created_at, u.full_name, u.avatar, p.project_name
         FROM blocker b
         INNER JOIN log l ON b.id_log = l.id_log
         INNER JOIN user u ON l.id_user = u.id_user
         INNER JOIN log_project lp ON l.id_log = lp.id_log
         INNER JOIN project p ON lp.id_project = p.id_project
         WHERE lp.id_team IN (?) AND b.resolution_status = 'pending'
         ORDER BY l.created_at DESC`,
        [activeTeamIds],
      ),
      db.query(
        `SELECT a.id_achievement, a.description, a.created_at, u.id_user, u.full_name, u.avatar
         FROM achievement a
         INNER JOIN user u ON a.id_user = u.id_user
         INNER JOIN user_team ut ON u.id_user = ut.id_user
         WHERE ut.id_team IN (?) AND a.validation_status = 'pending'
         ORDER BY a.created_at DESC`,
        [activeTeamIds],
      ),
      db.query(
        `SELECT activity_type, full_name, project_name, activity_date
         FROM (
           SELECT 'log' AS activity_type, u.full_name, p.project_name, l.created_at AS activity_date
           FROM log l INNER JOIN user u ON l.id_user = u.id_user INNER JOIN log_project lp ON l.id_log = lp.id_log INNER JOIN project p ON lp.id_project = p.id_project
           WHERE lp.id_team IN (?)
           UNION ALL
           SELECT 'blocker' AS activity_type, u.full_name, p.project_name, l.created_at AS activity_date
           FROM blocker b INNER JOIN log l ON b.id_log = l.id_log INNER JOIN user u ON l.id_user = u.id_user INNER JOIN log_project lp ON l.id_log = lp.id_log INNER JOIN project p ON lp.id_project = p.id_project
           WHERE lp.id_team IN (?)
           UNION ALL
           SELECT 'achievement' AS activity_type, u.full_name, NULL AS project_name, a.created_at AS activity_date
           FROM achievement a INNER JOIN user u ON a.id_user = u.id_user INNER JOIN user_team ut ON u.id_user = ut.id_user
           WHERE ut.id_team IN (?)
         ) feed ORDER BY activity_date DESC LIMIT 5`,
        [activeTeamIds, activeTeamIds, activeTeamIds],
      ),
      Log.countByWeek(activeUserId, weekOffset),
      Log.fetchToday(activeUserId),
      Log.fetchByWeek(activeUserId, weekOffset),
      Blocker.countActiveByUser(activeUserId),
      User.countActive(),
      Log.countTodayAll(),
      Blocker.countAllActive(),
      Log.countByWeekAll(orgWeekOffset),
      Log.fetchByWeekAll(orgWeekOffset),
    ]);

    const [teams] = await db.query(
      'SELECT id_team, team_name, description FROM team WHERE id_leader = ? ORDER BY team_name ASC',
      [activeUserId]
    );

    const weeklyData = [0, 0, 0, 0, 0];
    weekRows.forEach((row) => {
      if (row.weekday <= 4) weeklyData[row.weekday] = Number(row.count);
    });

    const logsByDay = [[], [], [], [], []];
    weekLogs.forEach((log) => {
      if (log.weekday <= 4) {
        logsByDay[log.weekday].push({
          id_log: log.id_log,
          completed: log.completed,
          created_at: log.created_at,
        });
      }
    });

    const orgWeeklyData = [0, 0, 0, 0, 0];
    orgWeekRows.forEach((row) => {
      if (row.weekday <= 4) orgWeeklyData[row.weekday] = Number(row.count);
    });

    const orgLogsByDay = [[], [], [], [], [], [], []];
    orgWeekLogs.forEach((log) => {
      orgLogsByDay[log.weekday].push({
        id_log: log.id_log,
        full_name: log.full_name,
        completed: log.completed,
        created_at: log.created_at,
        team_names: log.team_names,
      });
    });

    res.render("team-leader/dashboard", {
      currentPage: "dashboard",
      role: "team-leader",
      activeView,
      weekOffset,
      orgWeekOffset,
      summary: { totalMembers, entriesThisWeek, totalAchievements, totalBlockers },
      teamMembersOverview,
      pendingBlockers,
      pendingAchievements,
      recentActivity,
      
      // Personal stats
      weeklyData,
      logsByDay,
      todayLogs,
      completedToday: todayLogs.length,
      weeklyTotal: weeklyData.reduce((a, b) => a + b, 0),
      activeBlockers: blockerRow ? Number(blockerRow.count) : 0,

      // Org stats
      orgActiveUsers: Number(orgActiveUsers.count),
      orgTodayLogsCount: Number(orgTodayLogsCount.count),
      orgActiveBlockers: Number(orgActiveBlockers.count),
      orgWeeklyData,
      orgLogsByDay,
      
      teams,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading dashboard");
  }
};

exports.getLog = (req, res) => {
  const activeUserId = req.session.userId;

  const filters = {
    id_project: req.query.id_project || null,
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null,
  };

  Promise.all([
    Log.fetchAllByEmployee(activeUserId, filters),
    Project.fetchAllByEmployee(activeUserId),
  ])
    .then(([[logs], [projects]]) => {
      return Promise.all(
        logs.map((log) =>
          Blocker.fetchByLog(log.id_log).then(([blockers]) => ({
            ...log,
            blockers,
          })),
        ),
      ).then((logsWithBlockers) => {
        res.render("shared/log", {
          currentPage: "log",
          role: "team-leader",
          logBase: "/employee",
          logs: logsWithBlockers,
          projects,
          filters,
          successMessage: req.query.success || "",
          page: 1,
          totalPages: 1,
          totalItems: logsWithBlockers.length,
          hasPrevPage: false,
          hasNextPage: false,
          previousPage: 1,
          nextPage: 1,
          csrfToken: req.csrfToken(),
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send("Internal Server Error");
    });
};

exports.postLog = async (req, res) => {
  const employeeController = require("./employee.controller");
  return employeeController.postLog(req, res);
};

exports.postEditLog = async (req, res) => {
  const employeeController = require("./employee.controller");
  return employeeController.putLog(req, res);
};

exports.postDeleteLog = async (req, res) => {
  const employeeController = require("./employee.controller");
  return employeeController.deleteLog(req, res);
};

exports.getTeamLog = async (req, res) => {
  try {
    const teamIds = req.session.teamIds || [];
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;

    const filters = {
      id_user: req.query.id_user || null,
      id_project: req.query.id_project || null,
      date_from: req.query.date_from || null,
      date_to: req.query.date_to || null,
    };

    const [
      [[countResult]],
      [entries],
      [projects],
      [members]
    ] = await Promise.all([
      Log.countAllByTeams(teamIds, filters),
      Log.fetchAllByTeams(teamIds, filters, limit, offset),
      Project.fetchAllByEmployee(req.session.userId),
      db.query(
        `SELECT DISTINCT u.id_user, u.full_name
         FROM user_team ut
         INNER JOIN user u ON ut.id_user = u.id_user
         WHERE ut.id_team IN (?)
         ORDER BY u.full_name ASC`,
        [teamIds]
      )
    ]);

    const totalRecords = countResult ? countResult.total : 0;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    res.render("team-leader/team-log", {
      currentPage: "team-log",
      role: "team-leader",
      entries,
      projects,
      members,
      filters,
      page,
      totalPages,
      totalRecords,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading team log");
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const teamId = req.session.teamId;

    const [members] = await db.query(
      `
      SELECT 
        u.id_user,
        u.full_name,
        u.email,
        u.avatar,
        t.team_name
      FROM user_team ut
      INNER JOIN user u ON ut.id_user = u.id_user
      INNER JOIN team t ON ut.id_team = t.id_team
      WHERE ut.id_team = ?
      `,
      [teamId],
    );

    const [availableUsers] = await db.query(
      `
      SELECT 
        u.id_user,
        u.full_name,
        u.email
      FROM user u
      WHERE u.id_user NOT IN (
        SELECT ut.id_user
        FROM user_team ut
        WHERE ut.id_team = ?
      )
      `,
      [teamId],
    );

    res.render("team-leader/team-members", {
      currentPage: "team-members",
      role: "team-leader",
      members,
      availableUsers,
      teamName: members.length > 0 ? members[0].team_name : "Team",
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    res.send("Error DB");
  }
};

exports.searchAvailableUsers = async (req, res) => {
  try {
    const teamId = req.session.teamId;
    const search = (req.query.q || "").trim();

    const [users] = await db.query(
      `
      SELECT
        u.id_user,
        u.full_name,
        u.email
      FROM user u
      WHERE u.id_user NOT IN (
        SELECT ut.id_user
        FROM user_team ut
        WHERE ut.id_team = ?
      )
      AND (
        u.full_name LIKE ?
        OR u.email LIKE ?
      )
      ORDER BY u.full_name ASC
      LIMIT 10
      `,
      [teamId, `%${search}%`, `%${search}%`],
    );

    res.status(200).json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error DB" });
  }
};

exports.findTeamMembers = async (req, res) => {
  try {
    const teamId = req.session.teamId;
    const search = (req.query.q || "").trim();

    const [members] = await db.query(
      `
      SELECT
        u.id_user,
        u.full_name,
        u.email,
        u.avatar
      FROM user_team ut
      INNER JOIN user u ON ut.id_user = u.id_user
      WHERE ut.id_team = ?
        AND (
          u.full_name LIKE ?
          OR u.email LIKE ?
        )
      ORDER BY u.full_name ASC
      LIMIT 10
      `,
      [teamId, `%${search}%`, `%${search}%`],
    );

    res.status(200).json(members);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error DB" });
  }
};

exports.getTeamReport = async (req, res) => {
  try {
    const teamIds = req.session.teamIds || [];
    const { date_from, date_to, id_project } = req.query;

    const reportFrom = date_from || "2026-01-01";
    const reportTo = date_to || "2026-12-31";
    const projectId = id_project || null;

    const [projects] = await Project.fetchAllByEmployee(req.session.userId);

    const [teamMembers] = await db.query(
      `SELECT COUNT(DISTINCT id_user) AS total_members FROM user_team WHERE id_team IN (?)`,
      [teamIds],
    );

    let entriesQuery = `
      SELECT COUNT(DISTINCT l.id_log) AS total_entries
      FROM log l
      INNER JOIN log_project lp ON l.id_log = lp.id_log
      WHERE lp.id_team IN (?)
        AND DATE(l.created_at) BETWEEN ? AND ?
    `;
    const entriesParams = [teamIds, reportFrom, reportTo];
    if (projectId) {
      entriesQuery += " AND lp.id_project = ?";
      entriesParams.push(projectId);
    }
    const [entriesResult] = await db.query(entriesQuery, entriesParams);

    let achievementsQuery = `
      SELECT COUNT(*) AS total_achievements
      FROM achievement a
      INNER JOIN user_team ut ON a.id_user = ut.id_user
      WHERE ut.id_team IN (?)
        AND a.validation_status = 'approved'
        AND DATE(a.created_at) BETWEEN ? AND ?
    `;
    const achievementsParams = [teamIds, reportFrom, reportTo];
    if (projectId) {
      achievementsQuery += " AND a.id_project = ?";
      achievementsParams.push(projectId);
    }
    const [achievementsResult] = await db.query(achievementsQuery, achievementsParams);

    let blockersQuery = `
      SELECT COUNT(*) AS total_blockers
      FROM blocker b
      INNER JOIN log l ON b.id_log = l.id_log
      INNER JOIN log_project lp ON l.id_log = lp.id_log
      WHERE lp.id_team IN (?)
        AND b.resolution_status = 'pending'
        AND DATE(l.created_at) BETWEEN ? AND ?
    `;
    const blockersParams = [teamIds, reportFrom, reportTo];
    if (projectId) {
      blockersQuery += " AND lp.id_project = ?";
      blockersParams.push(projectId);
    }
    const [blockersResult] = await db.query(blockersQuery, blockersParams);

    let achListQuery = `
      SELECT a.description, u.full_name
      FROM achievement a
      INNER JOIN user u ON a.id_user = u.id_user
      INNER JOIN user_team ut ON a.id_user = ut.id_user
      WHERE ut.id_team IN (?)
        AND a.validation_status = 'approved'
        AND DATE(a.created_at) BETWEEN ? AND ?
    `;
    const achListParams = [teamIds, reportFrom, reportTo];
    if (projectId) {
      achListQuery += " AND a.id_project = ?";
      achListParams.push(projectId);
    }
    achListQuery += " ORDER BY a.created_at DESC";
    const [achievementsList] = await db.query(achListQuery, achListParams);

    let blockersListQuery = `
      SELECT b.description, u.full_name
      FROM blocker b
      INNER JOIN log l ON b.id_log = l.id_log
      INNER JOIN user u ON l.id_user = u.id_user
      INNER JOIN log_project lp ON l.id_log = lp.id_log
      WHERE lp.id_team IN (?)
        AND b.resolution_status = 'pending'
        AND DATE(l.created_at) BETWEEN ? AND ?
    `;
    const blockersListParams = [teamIds, reportFrom, reportTo];
    if (projectId) {
      blockersListQuery += " AND lp.id_project = ?";
      blockersListParams.push(projectId);
    }
    blockersListQuery += " ORDER BY l.created_at DESC";
    const [blockersList] = await db.query(blockersListQuery, blockersListParams);

    let memberActivityQuery = `
      SELECT
        u.id_user,
        u.full_name,
        u.avatar,
        COUNT(
          DISTINCT CASE
            WHEN lp.id_team IN (?)
             AND DATE(l.created_at) BETWEEN ? AND ?
             ${projectId ? "AND lp.id_project = ?" : ""}
            THEN l.id_log
          END
        ) AS total_entries
      FROM user u
      INNER JOIN user_team ut ON u.id_user = ut.id_user
      LEFT JOIN log l ON u.id_user = l.id_user
      LEFT JOIN log_project lp ON l.id_log = lp.id_log
      WHERE ut.id_team IN (?)
      GROUP BY u.id_user, u.full_name, u.avatar
      ORDER BY total_entries DESC, u.full_name ASC
    `;
    const memberActivityParams = [teamIds, reportFrom, reportTo];
    if (projectId) memberActivityParams.push(projectId);
    memberActivityParams.push(teamIds);
    
    const [memberActivity] = await db.query(memberActivityQuery, memberActivityParams);

    res.render("team-leader/team-report", {
      currentPage: "team-report",
      role: "team-leader",
      filters: { date_from: reportFrom, date_to: reportTo, id_project: projectId },
      projects,
      summary: {
        totalMembers: teamMembers[0].total_members,
        totalEntries: entriesResult[0].total_entries,
        totalAchievements: achievementsResult[0].total_achievements,
        totalBlockers: blockersResult[0].total_blockers,
      },
      achievementsList,
      blockersList,
      memberActivity,
      csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Error loading team report");
  }
};

exports.getSelfReview = (req, res) => {
  res.render("shared/self-review", {
    currentPage: "self-review",
    role: req.session.role,
    selfReviewBase: "/team-leader",
    csrfToken: req.csrfToken(),
  });
};

exports.generateSelfReview = async (req, res) => {
  const employeeController = require("./employee.controller");
  return employeeController.generateSelfReview(req, res);
};

exports.exportSelfReviewPDF = async (req, res) => {
  const employeeController = require("./employee.controller");
  return employeeController.exportSelfReviewPDF(req, res);
};

exports.getProfile = async (req, res) => {
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    res.render("shared/profile", {
      currentPage: "profile",
      role: "team-leader",
      user,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.addTeamMember = async (req, res) => {
  try {
    const teamId = req.session.teamId;
    const { id_user } = req.body;

    console.log("ADD MEMBER DEBUG:", {
      body: req.body,
      teamId,
      id_user,
      sessionUserId: req.session.userId,
      role: req.session.role,
    });

    if (!teamId) {
      return res.status(400).send("No team assigned to current team leader");
    }

    if (!id_user) {
      return res.status(400).send("id_user is required");
    }

    const [existingRelation] = await db.query(
      "SELECT * FROM user_team WHERE id_user = ? AND id_team = ?",
      [id_user, teamId],
    );

    if (existingRelation.length > 0) {
      return res.status(400).send("User is already assigned to this team");
    }



    const [userExists] = await db.query(
      "SELECT id_user, full_name, email FROM user WHERE id_user = ?",
      [id_user],
    );

    if (userExists.length === 0) {
      return res.status(404).send("User not found");
    }

    await db.query("INSERT INTO user_team (id_user, id_team) VALUES (?, ?)", [
      id_user,
      teamId,
    ]);

    return res.redirect("/team-leader/team-members");
  } catch (error) {
    console.error("ADD MEMBER ERROR:", error);
    return res.status(500).send(error.message);
  }
};

exports.removeTeamMember = async (req, res) => {
  try {
    const teamId = req.session.teamId;
    const { id_user } = req.body;

    await db.query("DELETE FROM user_team WHERE id_user = ? AND id_team = ?", [
      id_user,
      teamId,
    ]);

    res.redirect("/team-leader/team-members");
  } catch (error) {
    console.error(error);
    res.send("Error DB");
  }
};

exports.resolveBlocker = async (req, res) => {
  try {
    const { id_blocker } = req.body;

    await db.query(
      "UPDATE blocker SET resolution_status = ?, resolved_at = NOW() WHERE id_blocker = ?",
      ["resolved", id_blocker],
    );

    res.redirect("/team-leader/dashboard");
  } catch (error) {
    console.error(error);
    res.send("Error DB");
  }
};

exports.approveAchievement = async (req, res) => {
  try {
    const leaderId = req.session.userId;
    const { id_achievement } = req.body;

    await db.query(
      `
      UPDATE achievement
      SET validation_status = 'approved',
          validated_by = ?,
          validated_at = NOW()
      WHERE id_achievement = ?
      `,
      [leaderId, id_achievement],
    );

    res.redirect("/team-leader/dashboard");
  } catch (error) {
    console.error(error);
    res.send("Error DB");
  }
};

exports.rejectAchievement = async (req, res) => {
  try {
    const leaderId = req.session.userId;
    const { id_achievement } = req.body;

    await db.query(
      `
      UPDATE achievement
      SET validation_status = 'rejected',
          validated_by = ?,
          validated_at = NOW()
      WHERE id_achievement = ?
      `,
      [leaderId, id_achievement],
    );

    res.redirect("/team-leader/dashboard");
  } catch (error) {
    console.error(error);
    res.send("Error DB");
  }
};

exports.getProfile = async (req, res) => {
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    if (!user) return res.status(404).send("User not found");
    res.render("shared/profile", {
      currentPage: "profile",
      role: "team-leader",
      user,
      error: "",
      success: "",
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.postSlack = async (req, res) => {
  const { slack_user } = req.body;
  try {
    await User.updateSlack(req.session.userId, slack_user);
    const [[user]] = await User.fetchOne(req.session.userId);
    res.render("shared/profile", {
      currentPage: "profile",
      role: "team-leader",
      user,
      error: "",
      success: "Slack username updated successfully.",
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.postPassword = async (req, res) => {
  const { current_password, new_password, confirm_password } = req.body;
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    const match = await bcrypt.compare(current_password, user.password);

    if (!match) {
      return res.render("shared/profile", {
        currentPage: "profile",
        role: "team-leader",
        user,
        error: "Current password is incorrect.",
        success: "",
        csrfToken: req.csrfToken(),
      });
    }

    if (new_password !== confirm_password) {
      return res.render("shared/profile", {
        currentPage: "profile",
        role: "team-leader",
        user,
        error: "New passwords do not match.",
        success: "",
        csrfToken: req.csrfToken(),
      });
    }

    const hashed = await bcrypt.hash(new_password, 12);
    await User.updatePassword(req.session.userId, hashed);
    const [[updatedUser]] = await User.fetchOne(req.session.userId);
    res.render("shared/profile", {
      currentPage: "profile",
      role: "team-leader",
      user: updatedUser,
      error: "",
      success: "Password updated successfully.",
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};
