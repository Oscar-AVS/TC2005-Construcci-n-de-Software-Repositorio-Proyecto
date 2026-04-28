/**
 * Project Manager Controller
 */

const PDFDocument = require("pdfkit");
const { getProjectReportData } = require("../models/report.model");
const User = require("../models/user.model");
const Project = require("../models/project.model");
const Team = require("../models/team.model");
const Blocker = require("../models/blocker.model");
const Log = require("../models/log.model");
const Achievement = require("../models/achievement.model");
const bcrypt = require("bcrypt");

const isInvalidDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return false;

  const start = new Date(startDate);
  const end = new Date(endDate);

  return end < start;
};

const renderProjectDetailView = async (req, res, project, options = {}) => {
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const [teams] = await Project.fetchAssignedTeams(project.id_project);
  const [allTeamsRaw] = await Team.fetchAllForSelect();
  const [users] = await Project.fetchAssignedUsers(project.id_project);
  const [allUsers] = await User.fetchAll();
  
  const [activity] = await Project.fetchActivity(project.id_project, limit, offset);
  const [[{ total: totalRecords }]] = await Project.countActivity(project.id_project);
  const totalPages = Math.ceil(totalRecords / limit);

  // Blocker Pagination
  const blockerPage = parseInt(req.query.blockerPage) || 1;
  const blockerLimit = 5; // Fewer blockers per page usually
  const blockerOffset = (blockerPage - 1) * blockerLimit;
  const [blockers] = await Blocker.fetchByProject(project.id_project, blockerLimit, blockerOffset);
  const [[{ total: totalBlockersRecords }]] = await Blocker.countByProject(project.id_project);
  const totalBlockerPages = Math.ceil(totalBlockersRecords / blockerLimit);

  return res.render("project-manager/project-detail", {
    title: project.project_name,
    role: "project-manager",
    currentPage: "projects",
    project,
    teams,
    allTeams: allTeamsRaw,
    users,
    allUsers,
    activity,
    blockers,
    page,
    totalPages,
    totalRecords,
    hasPrevPage: page > 1,
    hasNextPage: page < totalPages,
    blockerPage,
    totalBlockerPages,
    totalBlockersRecords,
    hasPrevBlockerPage: blockerPage > 1,
    hasNextBlockerPage: blockerPage < totalBlockerPages,
    error: options.error || "",
    success: options.success || "",
    csrfToken: req.csrfToken(),
  });
};

exports.getDashboard = async (req, res) => {
  const activeUserId = req.session.userId;
  const weekOffset = parseInt(req.query.weekOffset) || 0;
  const orgWeekOffset = parseInt(req.query.orgWeekOffset) || 0;
  const activeView = req.query.view || "personal";
  const activeTab = req.query.tab || "pm-dashboard";

  try {
    // PM Dashboard Stats
    const [[activeProjectsCount]] = await Project.countActive();
    const [[activeBlockersCount]] = await Blocker.countAllActive();
    const [[completedThisMonth]] = await Project.countCompletedThisMonth();
    const [[activeUsersCount]] = await User.countActive();

    const [recentProjects] = await Project.fetchAll();
    const [activeBlockers] = await Blocker.fetchAllOrganizational();
    const [globalActivity] = await Project.fetchGlobalActivity(5);

    // Personal Activity Data (same as employee)
    const [weekRows] = await Log.countByWeek(activeUserId, weekOffset);
    const [todayLogs] = await Log.fetchToday(activeUserId);
    const [weekLogs] = await Log.fetchByWeek(activeUserId, weekOffset);
    const [[personalActiveBlockerRow]] =
      await Blocker.countActiveByUser(activeUserId);

    // Organization data
    const [[orgTodayLogsCount]] = await Log.countTodayAll();
    const [orgWeekRows] = await Log.countByWeekAll(orgWeekOffset);
    const [orgWeekLogs] = await Log.fetchByWeekAll(orgWeekOffset);

    // Fetch teams for filter
    const [allTeamsRaw] = await Team.fetchAll();
    const uniqueTeamsMap = new Map();
    allTeamsRaw.forEach((team) => {
      if (!uniqueTeamsMap.has(team.id_team)) {
        uniqueTeamsMap.set(team.id_team, {
          id_team: team.id_team,
          team_name: team.team_name,
        });
      }
    });
    const teams = Array.from(uniqueTeamsMap.values());

    // Map weekly data for charts
    const weeklyData = [0, 0, 0, 0, 0];
    weekRows.forEach((row) => {
      if (row.weekday <= 4) weeklyData[row.weekday] = Number(row.count);
    });

    const orgWeeklyData = [0, 0, 0, 0, 0];
    orgWeekRows.forEach((row) => {
      if (row.weekday <= 4) orgWeeklyData[row.weekday] = Number(row.count);
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

    res.render("project-manager/dashboard", {
      title: "PM Dashboard",
      role: "project-manager",
      currentPage: "dashboard",
      // PM Stats
      stats: {
        activeProjects: activeProjectsCount.count,
        activeBlockers: activeBlockersCount.count,
        completedThisMonth: completedThisMonth.count,
        activeUsers: activeUsersCount.count,
      },
      projects: recentProjects.slice(0, 3), // Show first 3 for summary
      blockers: activeBlockers.slice(0, 3), // Show first 3 for summary
      globalActivity,
      // Personal Activity
      weeklyData,
      logsByDay,
      todayLogs,
      completedToday: todayLogs.length,
      weeklyTotal: weeklyData.reduce((a, b) => a + b, 0),
      personalActiveBlockers: Number(personalActiveBlockerRow.count),
      weekOffset,
      orgWeekOffset,
      activeView,
      // Org vars
      orgActiveUsers: Number(activeUsersCount.count),
      orgTodayLogsCount: Number(orgTodayLogsCount.count),
      orgActiveBlockers: Number(activeBlockersCount.count),
      orgWeeklyData,
      orgLogsByDay,
      teams,
      activeTab,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.getReports = async (req, res) => {
  try {
    const [projects] = await Project.fetchAll();
    const [teamRows] = await Team.fetchAll();

    const uniqueTeams = [];
    const seenTeams = new Set();

    teamRows.forEach((team) => {
      if (!seenTeams.has(team.id_team)) {
        seenTeams.add(team.id_team);
        uniqueTeams.push(team);
      }
    });

    res.render("project-manager/reports", {
      title: "Reports",
      role: "project-manager",
      currentPage: "reports",
      projects,
      teams: uniqueTeams,
      filters: {
        id_project: req.query.id_project || "",
        id_team: req.query.id_team || "",
        date_from: req.query.date_from || "",
        date_to: req.query.date_to || "",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.getProjectTeamRange = async (req, res) => {
  const { id_project, id_team } = req.query;

  if (!id_project || !id_team) {
    return res.status(400).json({
      error: "Missing parameters: id_project and id_team are required.",
    });
  }

  try {
    const [[project]] = await Project.fetchOne(id_project);

    if (!project) {
      return res.status(404).json({
        error: "Project not found.",
      });
    }

    const [teamRows] = await Team.fetchAll();
    const team = teamRows.find(
      (row) => String(row.id_team) === String(id_team),
    );

    if (!team) {
      return res.status(404).json({
        error: "Team not found.",
      });
    }

    return res.status(200).json({
      project: {
        id_project: project.id_project,
        project_name: project.project_name,
        start_date: project.start_date,
        end_date: project.end_date,
      },
      team: {
        id_team: team.id_team,
        team_name: team.team_name,
      },
    });
  } catch (err) {
    console.error("Error fetching project/team range:", err);
    return res.status(500).json({
      error: "Internal Server Error",
    });
  }
};

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
    const Log = require("../models/log.model");
    const Blocker = require("../models/blocker.model");

    const [[countResult]] = await Log.countAllByEmployee(activeUserId, filters);
    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const [logs] = await Log.fetchAllByEmployee(
      activeUserId,
      filters,
      limit,
      offset,
    );
    const [projects] = await Project.fetchAll(); // PM can see all projects

    const logsWithBlockers = await Promise.all(
      logs.map(async (log) => {
        const [blockers] = await Blocker.fetchByLog(log.id_log);
        return { ...log, blockers };
      }),
    );

    res.render("shared/log", {
      title: "My Log",
      role: "project-manager",
      logBase: "/project-manager",
      currentPage: "log",
      logs: logsWithBlockers,
      projects,
      filters,
      page,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
      csrfToken: req.csrfToken(),
      successMessage:
        req.query.success === "true" ? "Log entry created successfully!" : null,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
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

exports.getSelfReview = (req, res) => {
  res.render("shared/self-review", {
    title: "Self Review",
    role: "project-manager",
    selfReviewBase: "/project-manager",
    currentPage: "self-review",
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

    if (!user) {
      return res.status(404).send("User not found");
    }

    res.render("shared/profile", {
      currentPage: "profile",
      role: "project-manager",
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
      role: "project-manager",
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

    if (!user) {
      return res.status(404).send("User not found");
    }

    const match = await bcrypt.compare(current_password, user.password);

    if (!match) {
      return res.render("shared/profile", {
        currentPage: "profile",
        role: "project-manager",
        user,
        error: "Current password is incorrect.",
        success: "",
        csrfToken: req.csrfToken(),
      });
    }

    if (new_password !== confirm_password) {
      return res.render("shared/profile", {
        currentPage: "profile",
        role: "project-manager",
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
      role: "project-manager",
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

 // Grafica avance
 
exports.getProjects = async (req, res) => {
  try {
    const [projects] = await Project.fetchAll();

    const statusLabels = {
      not_started: "Not Started",
      in_progress: "In Progress",
      on_hold: "On Hold",
      at_risk: "At Risk",
      completed: "Completed",
      archived: "Archived",
    };

    const statusCounts = {
      not_started: 0,
      in_progress: 0,
      on_hold: 0,
      at_risk: 0,
      completed: 0,
      archived: 0,
    };

    projects.forEach((project) => {
      if (statusCounts[project.progress_status] !== undefined) {
        statusCounts[project.progress_status] += 1;
      }
    });

    const statusChartData = Object.keys(statusCounts).map((status) => ({
      status,
      label: statusLabels[status],
      total: statusCounts[status],
    }));

    res.render("project-manager/projects", {
      title: "Projects",
      role: "project-manager",
      currentPage: "projects",
      projects,
      statusChartData,
      error: req.query.error || "",
      success: req.query.success || "",
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.getProjectDetail = async (req, res) => {
  try {
    const [[project]] = await Project.fetchOne(req.params.id);

    if (!project) {
      return res.redirect("/project-manager/projects?error=Project+not+found");
    }

    return renderProjectDetailView(req, res, project, {
      error: req.query.error || "",
      success: req.query.success || "",
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

exports.getProjectActivity = async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const filters = {
    id_team: req.query.id_team || null,
    id_user: req.query.id_user || null,
    date_from: req.query.date_from || null,
    date_to: req.query.date_to || null
  };

  try {
    const [activity] = await Project.fetchActivity(id, limit, offset, filters);
    const [[{ total: totalRecords }]] = await Project.countActivity(id, filters);
    const totalPages = Math.ceil(totalRecords / limit);

    return res.json({
      activity,
      page,
      totalPages,
      totalRecords,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch activity" });
  }
};

exports.getProjectBlockers = async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 5;
  const offset = (page - 1) * limit;

  try {
    const [blockers] = await Blocker.fetchByProject(id, limit, offset);
    const [[{ total: totalRecords }]] = await Blocker.countByProject(id);
    const totalPages = Math.ceil(totalRecords / limit);

    return res.json({
      blockers,
      page,
      totalPages,
      totalRecords,
      hasPrevPage: page > 1,
      hasNextPage: page < totalPages
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch blockers" });
  }
};

exports.postCreateProject = async (req, res) => {
  const { project_name, description, progress_status, start_date, end_date } = req.body;

  const renderWithError = async (error) => {
    const [projects] = await Project.fetchAll();

    return res.render("project-manager/projects", {
      title: "Projects",
      role: "project-manager",
      currentPage: "projects",
      projects,
      error,
      success: "",
      csrfToken: req.csrfToken(),
    });
  };

  if (!project_name || !project_name.trim()) {
    return renderWithError("Project name is required.");
  }

  if (isInvalidDateRange(start_date, end_date)) {
    return renderWithError("End date cannot be earlier than start date.");
  }

  try {
    const [[existing]] = await Project.findByName(project_name.trim());

    if (existing) {
      return renderWithError("A project with this name already exists.");
    }

    await Project.create(
      project_name.trim(),
      description,
      progress_status,
      start_date || null,
      end_date || null,
    );

    return res.redirect(
      "/project-manager/projects?success=Project+registered+successfully",
    );
  } catch (err) {
    console.error(err);
    return renderWithError("The project could not be registered. Please try again.");
  }
};

exports.postAssignTeam = async (req, res) => {
  const { id } = req.params;
  const { id_team } = req.body;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect("/project-manager/projects?error=Project+not+found");
    }

    if (!id_team) {
      return res.redirect(
        `/project-manager/project/${id}?error=Please+select+a+team`,
      );
    }

    const [[already]] = await Project.isTeamAssigned(id, id_team);

    if (already) {
      return res.redirect(
        `/project-manager/project/${id}?error=This+team+is+already+assigned+to+the+project`,
      );
    }

    await Project.assignTeam(id, id_team, req.session.userId);

    return res.redirect(
      `/project-manager/project/${id}?success=Team+assigned+successfully`,
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      `/project-manager/project/${id}?error=Could+not+assign+the+team`,
    );
  }
};

exports.postRemoveTeam = async (req, res) => {
  const { id, id_team } = req.params;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect("/project-manager/projects?error=Project+not+found");
    }

    await Project.removeTeam(id, id_team);

    return res.redirect(
      `/project-manager/project/${id}?success=Team+removed+successfully`,
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      `/project-manager/project/${id}?error=Could+not+remove+the+team`,
    );
  }
};

exports.postEditProject = async (req, res) => {
  const { id } = req.params;
  const { project_name, description, progress_status, start_date, end_date } = req.body;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect(
        "/project-manager/projects?error=Project+not+available",
      );
    }

    if (!project_name || !project_name.trim()) {
      return renderProjectDetailView(req, res, project, {
        error: "Project name is required.",
      });
    }

    if (start_date && end_date && end_date < start_date) {
      return renderProjectDetailView(req, res, project, {
        error: "End date cannot be earlier than start date.",
      });
    }

    const [[duplicate]] = await Project.findByNameExcluding(
      project_name.trim(),
      id,
    );

    if (duplicate) {
      return renderProjectDetailView(req, res, project, {
        error: "Another project with this name already exists.",
      });
    }

    await Project.update(
      id,
      project_name.trim(),
      description,
      progress_status,
      start_date || null,
      end_date || null,
    );

    return res.redirect(
      `/project-manager/project/${id}?success=Project+updated+successfully`,
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      `/project-manager/project/${id}?error=The+project+could+not+be+updated`,
    );
  }
};

exports.postDeleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect(
        "/project-manager/projects?error=El+proyecto+no+está+disponible",
      );
    }

    await Project.delete(id);

    return res.redirect(
      "/project-manager/projects?success=Proyecto+eliminado+correctamente",
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      "/project-manager/projects?error=No+fue+posible+eliminar+el+proyecto",
    );
  }
};

exports.postProjectDates = async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.body;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect(
        "/project-manager/projects?error=Project+not+found",
      );
    }

    if (!start_date || !end_date) {
      return renderProjectDetailView(req, res, project, {
        error: "Both dates are required.",
      });
    }

    if (isInvalidDateRange(start_date, end_date)) {
      return renderProjectDetailView(req, res, project, {
        error: "End date cannot be earlier than start date.",
      });
    }

    await Project.updateDates(id, start_date, end_date);

    return res.redirect(
      `/project-manager/project/${id}?success=Dates+updated+successfully`,
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      `/project-manager/project/${id}?error=Dates+could+not+be+updated`,
    );
  }
};


// Member search for dynamic "Add Member" modal
exports.getMemberSearch = async (req, res) => {
  const query = req.query.q;
  if (!query) return res.json([]);
  try {
    const [users] = await User.searchByNameEmail(query);
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
};

exports.postAssignUser = async (req, res) => {
  const { id } = req.params;
  const { id_user, id_team } = req.body;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect("/project-manager/projects?error=Project+not+found");
    }

    if (!id_user) {
      return res.redirect(
        `/project-manager/project/${id}?error=Please+select+a+user`,
      );
    }

    const [[already]] = await Project.isUserAssigned(id, id_user);

    if (already) {
      return res.redirect(
        `/project-manager/project/${id}?error=This+user+is+already+assigned+to+the+project`,
      );
    }

    await Project.assignUser(id, id_user, id_team || null, req.session.userId);

    return res.redirect(
      `/project-manager/project/${id}?success=Member+added+successfully`,
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      `/project-manager/project/${id}?error=Could+not+assign+the+user`,
    );
  }
};

exports.postRemoveUser = async (req, res) => {
  const { id, id_user } = req.params;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect("/project-manager/projects?error=Project+not+found");
    }

    await Project.removeUser(id, id_user);

    return res.redirect(
      `/project-manager/project/${id}?success=Member+removed+successfully`,
    );
  } catch (err) {
    console.error(err);
    return res.redirect(
      `/project-manager/project/${id}?error=Could+not+remove+the+user`,
    );
  }
};

// CU 4.10 — bloqueos
exports.getBlockers = async (req, res) => {
  try {
    const { id_project } = req.query;
    let blockers;

    if (id_project) {
      const [filtered] = await Blocker.fetchByProject(id_project);
      blockers = filtered;
    } else {
      const [all] = await Blocker.fetchAllOrganizational();
      blockers = all;
    }

    const [projects] = await Project.fetchAll();

    res.render("project-manager/blockers", {
      title: "Organizational Blockers",
      role: "project-manager",
      currentPage: "blockers",
      blockers,
      projects,
      filters: { id_project: id_project || "" },
      error: req.query.error || "",
      success: req.query.success || "",
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
};

// CU 4.9 — Progress report PDF export
exports.exportProjectReportPDF = async (req, res) => {
  const { id } = req.params;

  let data;
  try {
    data = await getProjectReportData(id);
  } catch (err) {
    console.error("Error fetching project report data:", err);
    return res.redirect(
      `/project-manager/project/${id}?error=Error+fetching+report+data`,
    );
  }

  if (!data.proyecto) {
    return res.redirect(
      `/project-manager/project/${id}?error=Project+not+found`,
    );
  }

  if (!data.bitacoras.length && !data.bloqueos.length) {
    return res.redirect(
      `/project-manager/project/${id}?error=Not+enough+data+to+generate+the+report`,
    );
  }

  try {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-${data.proyecto.project_name.replace(/\s+/g, "-")}-${Date.now()}.pdf"`,
    );

    doc.pipe(res);

    // Header
    doc.roundedRect(40, 35, 515, 95, 10).fillAndStroke("#FFF4ED", "#E84C1E");

    doc
      .fillColor("#E84C1E")
      .fontSize(20)
      .text("Project Progress Report", 60, 50, { align: "center", width: 475 });

    doc
      .fillColor("#444444")
      .fontSize(10)
      .text("Mufasa — Project Management Platform", 60, 80, {
        align: "center",
        width: 475,
      });

    doc.fillColor("#000000").fontSize(10);
    doc.text(`Project: ${data.proyecto.project_name}`, 60, 108, { width: 160 });
    doc.text(`Status: ${data.proyecto.status}`, 240, 108, { width: 120 });
    doc.text(`Progress: ${data.proyecto.progress_percentage || 0}%`, 380, 108, {
      width: 140,
    });

    // Reset x to left margin before body content
    doc.x = 50;
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#E6E6E6");
    doc.moveDown(0.8);

    // Description
    if (data.proyecto.description) {
      doc.fontSize(13).fillColor("#E84C1E").text("Description", 50, doc.y);
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#333333").text(data.proyecto.description, 50, doc.y, { width: 500 });
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#E6E6E6");
      doc.moveDown(0.8);
    }

    // Assigned Teams
    doc.fontSize(13).fillColor("#E84C1E").text("Assigned Teams", 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10);

    if (data.equipos.length === 0) {
      doc.fillColor("#94a3b8").text("No teams assigned.", 50, doc.y);
    } else {
      data.equipos.forEach((team) => {
        doc.fillColor("#333333").text(`• ${team.team_name}  —  Lead: ${team.leader_name || "—"}`, 50, doc.y, { width: 500 });
      });
    }

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#E6E6E6");
    doc.moveDown(0.8);

    // Team Members
    doc.fontSize(13).fillColor("#E84C1E").text("Team Members", 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10);

    if (data.miembros.length === 0) {
      doc.fillColor("#94a3b8").text("No members assigned.", 50, doc.y);
    } else {
      data.miembros.forEach((member) => {
        doc.fillColor("#333333").text(`• ${member.full_name}  —  ${member.email}  |  ${member.team_name || "No team"}`, 50, doc.y, { width: 500 });
      });
    }

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#E6E6E6");
    doc.moveDown(0.8);

    // Blockers
    doc.fontSize(13).fillColor("#E84C1E").text("Organizational Blockers", 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10);

    if (data.bloqueos.length === 0) {
      doc.fillColor("#94a3b8").text("No blockers recorded.", 50, doc.y);
    } else {
      data.bloqueos.forEach((blocker) => {
        doc.fillColor("#333333").text(`• ${blocker.reporter_name}: ${blocker.description}`, 50, doc.y, { width: 500 });
        doc.fontSize(9).fillColor("#444444").text(
          `  Severity: ${blocker.severity || "—"}   |   Status: ${blocker.resolution_status}   |   ${new Date(blocker.detected_at).toLocaleDateString("en-US")}`,
          60, doc.y, { width: 490 },
        );
        doc.fontSize(10);
        doc.moveDown(0.3);
      });
    }

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#E6E6E6");
    doc.moveDown(0.8);

    // Goals
    doc.fontSize(13).fillColor("#E84C1E").text("Project Goals", 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10);

    if (data.metas.length === 0) {
      doc.fillColor("#94a3b8").text("No goals defined for this project.", 50, doc.y);
    } else {
      data.metas.forEach((goal) => {
        doc.fillColor("#333333").text(`• ${goal.title}`, 50, doc.y, { width: 500 });
        if (goal.description) {
          doc.fontSize(9).fillColor("#444444").text(`  ${goal.description}`, 60, doc.y, { width: 490 });
          doc.fontSize(10);
        }
        doc.moveDown(0.2);
      });
    }

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#E6E6E6");
    doc.moveDown(0.8);

    // Recent Activity
    doc.fontSize(13).fillColor("#E84C1E").text("Recent Activity", 50, doc.y);
    doc.moveDown(0.3);
    doc.fontSize(10);

    if (data.bitacoras.length === 0) {
      doc.fillColor("#94a3b8").text("No activity recorded.", 50, doc.y);
    } else {
      data.bitacoras.slice(0, 30).forEach((log) => {
        doc.fillColor("#333333").text(
          `• [${new Date(log.created_at).toLocaleDateString("en-US")}] ${log.full_name}`,
          50, doc.y, { width: 500 },
        );
        if (log.completed) {
          doc.fontSize(9).fillColor("#333333").text(`  Completed: ${log.completed}`, 60, doc.y, { width: 490 });
        }
        if (log.planned) {
          doc.fontSize(9).fillColor("#444444").text(`  Planned: ${log.planned}`, 60, doc.y, { width: 490 });
        }
        doc.fontSize(10);
        doc.moveDown(0.3);
      });

      if (data.bitacoras.length > 30) {
        doc.fontSize(9).fillColor("#94a3b8").text(`Showing 30 of ${data.bitacoras.length} entries.`, 50, doc.y);
      }
    }

    // Footer
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke("#E84C1E");
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor("#94a3b8").text(
      `Report generated on ${new Date().toLocaleDateString("en-US")}`,
      50, doc.y, { align: "center", width: 500 },
    );

    doc.end();
  } catch (err) {
    console.error("Error generating PDF:", err);
    if (!res.headersSent) {
      return res.redirect(
        `/project-manager/project/${id}?error=Could+not+generate+the+report`,
      );
    }
  }
};

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
      role: 'project-manager',
      achievementsBase: '/project-manager',
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