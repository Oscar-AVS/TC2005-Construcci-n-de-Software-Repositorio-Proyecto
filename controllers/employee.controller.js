/**
 * Employee views controller.
 * Handles dashboard, log, achievements, self-review, projects and profile.
 */

const User = require('../models/user.model.js');
const Project = require('../models/project.model.js');
const Log = require('../models/log.model.js');
const Blocker = require('../models/blocker.model.js');
const Achievement = require('../models/achievement.model.js');
const bcrypt = require('bcrypt');

exports.getDashboard = async (req, res) => {
  const activeUserId = req.session.userId;
  const weekOffset = parseInt(req.query.weekOffset) || 0;
  const orgWeekOffset = parseInt(req.query.orgWeekOffset) || 0;
  const activeView = req.query.view || 'personal';

  try {
    const [weekRows] = await Log.countByWeek(activeUserId, weekOffset);
    const [todayLogs] = await Log.fetchToday(activeUserId);
    const [weekLogs] = await Log.fetchByWeek(activeUserId, weekOffset);
    const [[blockerRow]] = await Blocker.countActiveByUser(activeUserId);

    // Organization data
    const [[orgActiveUsers]] = await User.countActive();
    const [[orgTodayLogsCount]] = await Log.countTodayAll();
    const [[orgActiveBlockers]] = await Blocker.countAllActive();
    const [orgWeekRows] = await Log.countByWeekAll(orgWeekOffset);
    const [orgWeekLogs] = await Log.fetchByWeekAll(orgWeekOffset);
    
    // Fetch unique teams for the filter dropdown
    const Team = require('../models/team.model');
    const [allTeamsRaw] = await Team.fetchAll();
    
    // Deduplicate teams since fetchAll has joins that might cause duplicate rows
    const uniqueTeamsMap = new Map();
    allTeamsRaw.forEach(team => {
      if (!uniqueTeamsMap.has(team.id_team)) {
        uniqueTeamsMap.set(team.id_team, {
          id_team: team.id_team,
          team_name: team.team_name,
          description: team.description
        });
      }
    });
    const teams = Array.from(uniqueTeamsMap.values());

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

    res.render('employee/dashboard', {
      currentPage: 'dashboard',
      role: 'employee',
      weeklyData,
      logsByDay,
      todayLogs,
      completedToday: todayLogs.length,
      weeklyTotal: weeklyData.reduce((a, b) => a + b, 0),
      activeBlockers: Number(blockerRow.count),
      weekOffset,
      orgWeekOffset,
      activeView,
      // Org vars
      orgActiveUsers: Number(orgActiveUsers.count),
      orgTodayLogsCount: Number(orgTodayLogsCount.count),
      orgActiveBlockers: Number(orgActiveBlockers.count),
      orgWeeklyData,
      orgLogsByDay,
      teams,
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
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
      role: 'employee',
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
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postLog = (req, res) => {
  const activeUserId = req.session.userId;
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
    .then(() => res.redirect('/employee/log?success=true'))
    .catch((err) => {
      console.log(err);
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

exports.getAchievements = async (req, res) => {
  const activeUserId = req.session.userId;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const [[countResult]] = await Achievement.countAllByUser(activeUserId);
    const totalRecords = countResult.total;
    const totalPages = Math.ceil(totalRecords / limit) || 1;

    const [achievements] = await Achievement.fetchAllByUser(activeUserId, limit, offset);
    const [projects] = await Project.fetchAllByEmployee(activeUserId);

    res.render('employee/achievements', {
      currentPage: 'achievements',
      role: 'employee',
      achievements,
      projects,
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
  const activeUserId = req.session.userId;
  const { title, description, created_at } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ success: false, message: 'Title is required.' });
  }
  if (!created_at) {
    return res.status(400).json({ success: false, message: 'Date is required.' });
  }

  try {
    await Achievement.create(activeUserId, title.trim(), description ? description.trim() : '', created_at);
    return res.status(201).json({ success: true, message: 'Achievement saved successfully.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.deleteAchievement = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id_achievement } = req.body;

  try {
    const [result] = await Achievement.delete(id_achievement, activeUserId);
    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, message: 'Cannot delete this achievement.' });
    }
    return res.status(200).json({ success: true, message: 'Achievement deleted.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.editAchievement = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id_achievement, title, description, created_at } = req.body;

  if (!title || !created_at) {
    return res.status(400).json({ success: false, message: 'Title and date are required.' });
  }

  try {
    const [result] = await Achievement.update(id_achievement, activeUserId, title, description, created_at);
    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, message: 'Cannot edit this achievement.' });
    }
    return res.status(200).json({ success: true, message: 'Achievement updated.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'employee',
    csrfToken: req.csrfToken(),
  });
};

exports.generateSelfReview = async (req, res) => {
  const activeUserId = req.session.userId;
  const fullName = req.session.fullName;
  const { fechaInicio, fechaFin } = req.query;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).json({ error: 'Please select a valid period (From and To).' });
  }

  if (fechaInicio > fechaFin) {
    return res.status(400).json({ error: 'Start date cannot be later than end date.' });
  }

  const { getSelfReviewData } = require('../models/self-review.model');
  const { generateText, Output } = require('ai');
  const { openai } = require('@ai-sdk/openai');
  const { z } = require('zod');

  let data;
  try {
    data = await getSelfReviewData(activeUserId, fechaInicio, fechaFin);
  } catch (err) {
    console.error('Error fetching self-review data:', err);
    return res.status(500).json({ error: 'Error fetching your data.' });
  }

  const logsText = data.logs
    .map(l => `- [${new Date(l.created_at).toLocaleDateString('en-US')}] Completed: "${l.completed}" / Planned: "${l.planned}" (${l.projects || 'no project'})`)
    .join('\n') || 'No log entries in this period.';

  const achievementsText = data.achievements
    .map(a => `- ${a.description}`)
    .join('\n') || 'No achievements registered.';

  const blockersText = data.blockers
    .map(b => `- ${b.description} [${b.resolution_status}]`)
    .join('\n') || 'No blockers in this period.';

  const prompt = `
You are a career development assistant helping an employee write their self-review.
Analyze the following data about the employee and generate thoughtful, first-person self-review sections.

EMPLOYEE: ${fullName}
PERIOD: ${fechaInicio} to ${fechaFin}

LOG ENTRIES (what they worked on daily):
${logsText}

ACHIEVEMENTS:
${achievementsText}

BLOCKERS/CHALLENGES FACED:
${blockersText}

Generate the following sections in first person ("I"), written in a professional but natural tone:
1. "What I Did Well" — 2-3 sentences highlighting strengths based on the logs and achievements
2. "My Contributions" — 2-3 sentences about the impact of their work on the team/project
3. "Challenges I Overcame" — 2-3 sentences about obstacles they faced (from blockers) and how they dealt with them
4. "Areas for Growth" — 2-3 sentences suggesting areas for improvement based on patterns in their work

Keep each section concise and actionable. Write in English.
  `.trim();

  const selfReviewSchema = z.object({
    whatIDidWell: z.string().describe('2-3 sentences about what the employee did well'),
    myContributions: z.string().describe('2-3 sentences about their contributions'),
    challengesOvercome: z.string().describe('2-3 sentences about challenges they overcame'),
    areasForGrowth: z.string().describe('2-3 sentences about areas for improvement'),
  });

  let aiOutput;
  try {
    const { output } = await generateText({
      model: openai('gpt-4o-mini'),
      output: Output.object({ schema: selfReviewSchema }),
      prompt,
    });
    aiOutput = output;
  } catch (err) {
    console.error('Error calling AI model:', err);
    return res.status(500).json({ error: 'Error generating AI self-review.' });
  }

  return res.status(200).json({
    employee: fullName,
    period: { from: fechaInicio, to: fechaFin },
    achievements: data.achievements,
    projectBreakdown: data.projectBreakdown,
    totalLogs: data.logs.length,
    ai: aiOutput,
  });
};

exports.getProjects = (req, res) => {
  const activeUserId = req.session.userId;

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

exports.getProfile = async (req, res) => {
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    if (!user) return res.status(404).send('User not found');
    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'employee',
      user,
      error: '',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postSlack = async (req, res) => {
  const { slack_user } = req.body;
  try {
    await User.updateSlack(req.session.userId, slack_user);
    const [[user]] = await User.fetchOne(req.session.userId);
    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'employee',
      user,
      error: '',
      success: 'Slack username updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
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
        role: 'employee',
        user,
        error: 'Current password is incorrect.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    if (new_password !== confirm_password) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'employee',
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
      role: 'employee',
      user: updatedUser,
      error: '',
      success: 'Password updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.exportSelfReviewPDF = (req, res) => {
  const PDFDocument = require('pdfkit');
  const activeUserId = req.session.userId;
  const fullName = req.session.fullName;
  const { fechaInicio, fechaFin, doneWell, contributions, challenges, growth } = req.body;

  if (!fechaInicio || !fechaFin) {
    return res.status(400).send('Missing period data.');
  }

  const doc = new PDFDocument({ margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="self_review_${fullName.replace(/\s+/g, '_')}_${fechaInicio}_${fechaFin}.pdf"`
  );

  doc.pipe(res);

  // Header Box
  doc.roundedRect(40, 35, 515, 95, 10).fillAndStroke('#FFF4ED', '#E84C1E');

  doc.fillColor('#E84C1E')
    .fontSize(20)
    .text('Self-Review Report', 60, 50, { align: 'center', width: 475 });

  doc.fillColor('#444444')
    .fontSize(10)
    .text('Change.org Employee Development', 60, 80, { align: 'center', width: 475 });

  doc.fillColor('#000000').fontSize(10);
  doc.text(`Employee: ${fullName}`, 60, 105, { width: 250 });
  doc.text(`Period: ${fechaInicio} — ${fechaFin}`, 350, 105, { width: 150 });

  let parsedAchievements = [];
  let parsedProjects = [];
  if (req.body.achievements) {
    try { parsedAchievements = JSON.parse(req.body.achievements); } catch(e) {}
  }
  if (req.body.projects) {
    try { parsedProjects = JSON.parse(req.body.projects); } catch(e) {}
  }

  doc.y = 150;
  doc.moveDown(1.5);

  const writeSection = (title, content) => {
    doc.fontSize(13).fillColor('#E84C1E').text(title, 50, doc.y);
    doc.moveDown(0.4);
    doc.fontSize(10).fillColor('#333333');
    doc.text(content || 'No content provided.', 50, doc.y, { align: 'justify', width: 495 });
    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
    doc.moveDown(1);
  };

  // Render Achievements
  doc.fontSize(13).fillColor('#E84C1E').text('My Achievements', 50, doc.y);
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#333333');
  if (parsedAchievements.length === 0) {
    doc.text('No achievements in this period.', 50, doc.y);
  } else {
    parsedAchievements.forEach(a => {
      doc.text(`• ${a.description}`, 50, doc.y, { width: 495 });
    });
  }
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
  doc.moveDown(1);

  // Render Projects
  doc.fontSize(13).fillColor('#E84C1E').text('What I Worked On', 50, doc.y);
  doc.moveDown(0.4);
  doc.fontSize(10).fillColor('#333333');
  if (parsedProjects.length === 0) {
    doc.text('No log entries in this period.', 50, doc.y);
  } else {
    parsedProjects.forEach(p => {
      doc.text(`• ${p.project_name} (${p.log_count} entries)`, 50, doc.y, { width: 495 });
    });
  }
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
  doc.moveDown(1);

  writeSection('What I Did Well', doneWell);
  writeSection('My Contributions', contributions);
  writeSection('Challenges I Overcame', challenges);
  writeSection('Areas for Growth', growth);

  doc.end();
};