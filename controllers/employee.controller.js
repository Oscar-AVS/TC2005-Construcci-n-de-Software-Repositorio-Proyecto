/**
 * Employee views controller.
 * Handles dashboard, log, achievements, self-review, projects and profile.
 */

const User = require('../models/user.model.js');
const Project = require('../models/project.model.js');
const Log = require('../models/log.model.js');
const Blocker = require('../models/blocker.model.js');

exports.getDashboard = async (req, res) => {
  const activeUserId = 3;

  try {
    const [weekRows] = await Log.countByWeek(activeUserId);
    const [todayLogs] = await Log.fetchToday(activeUserId);
    const [weekLogs] = await Log.fetchByWeek(activeUserId);
    const [[blockerRow]] = await Blocker.countActiveByUser(activeUserId);

    const weeklyData = [0, 0, 0, 0, 0];
    weekRows.forEach((row) => {
      if (row.weekday <= 4) {
        weeklyData[row.weekday] = Number(row.count);
      }
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

    res.render('employee/dashboard', {
      currentPage: 'dashboard',
      role: 'employee',
      weeklyData,
      logsByDay,
      todayLogs,
      completedToday: todayLogs.length,
      weeklyTotal: weeklyData.reduce((a, b) => a + b, 0),
      activeBlockers: Number(blockerRow.count),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.getLog = (req, res) => {
  const activeUserId = 3;
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
          }))
        )
      ).then((logsWithBlockers) => {
        res.render('shared/log', {
          currentPage: 'log',
          role: 'employee',
          logs: logsWithBlockers,
          projects,
          filters,
        });
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.postLog = (req, res) => {
  const activeUserId = 3;
  const { completed, planned, blocker } = req.body;
  let id_projects = req.body.id_projects;

  if (!id_projects) return res.status(400).send('At least one project is required');
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
    .then(() => res.redirect('/employee/log'))
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.putLog = (req, res) => {
  const activeUserId = 3;
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
    .then(() => res.redirect('/employee/log'))
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.deleteLog = (req, res) => {
  const { id_log } = req.body;

  Log.delete(id_log)
    .then(() => res.redirect('/employee/log'))
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.getAchievements = (req, res) => {
  res.render('employee/achievements', {
    currentPage: 'achievements',
    role: 'employee',
  });
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'employee',
  });
};

exports.getProjects = (req, res) => {
  const activeUserId = 3;

  Project.fetchAllByEmployee(activeUserId)
    .then(([rows]) => {
      res.render('employee/projects', {
        currentPage: 'projects',
        role: 'employee',
        projects: rows,
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.getProfile = (req, res) => {
  const activeUserId = 1;

  User.fetchOne(activeUserId)
    .then(([rows]) => {
      if (rows.length > 0) {
        res.render('shared/profile', {
          currentPage: 'profile',
          role: 'employee',
          user: rows[0],
        });
      } else {
        res.status(404).send('User not found');
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};