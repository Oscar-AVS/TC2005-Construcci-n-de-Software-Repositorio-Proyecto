/**
 * Project Manager Controller
 */

const PDFDocument = require('pdfkit');
const { getProjectReportData } = require('../models/report.model');
const User = require('../models/user.model');
const Project = require('../models/project.model');
const Team = require('../models/team.model');
const Blocker = require('../models/blocker.model');
const bcrypt = require('bcrypt');

const renderProjectDetailView = async (req, res, project, options = {}) => {
  const [teams] = await Project.fetchAssignedTeams(project.id_project);
  const [allTeamsRaw] = await Team.fetchAll();
  const [users] = await Project.fetchAssignedUsers(project.id_project);
  const [allUsers] = await User.fetchAll();
  const [activity] = await Project.fetchActivity(project.id_project);

  return res.render('project-manager/project-detail', {
    title: project.project_name,
    role: 'project-manager',
    currentPage: 'projects',
    project,
    teams,
    allTeams: allTeamsRaw,
    users,
    allUsers,
    activity,
    error: options.error || '',
    success: options.success || '',
    csrfToken: req.csrfToken(),
  });
};

exports.getDashboard = (req, res) => {
  res.render('project-manager/dashboard', {
    title: 'PM Dashboard',
    role: 'project-manager',
    currentPage: 'dashboard',
  });
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

    res.render('project-manager/reports', {
      title: 'Reports',
      role: 'project-manager',
      currentPage: 'reports',
      projects,
      teams: uniqueTeams,
      filters: {
        id_project: req.query.id_project || '',
        id_team: req.query.id_team || '',
        date_from: req.query.date_from || '',
        date_to: req.query.date_to || '',
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.getProjectTeamRange = async (req, res) => {
  const { id_project, id_team } = req.query;

  if (!id_project || !id_team) {
    return res.status(400).json({
      error: 'Missing parameters: id_project and id_team are required.',
    });
  }

  try {
    const [[project]] = await Project.fetchOne(id_project);

    if (!project) {
      return res.status(404).json({
        error: 'Project not found.',
      });
    }

    const [teamRows] = await Team.fetchAll();
    const team = teamRows.find((row) => String(row.id_team) === String(id_team));

    if (!team) {
      return res.status(404).json({
        error: 'Team not found.',
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
    console.error('Error fetching project/team range:', err);
    return res.status(500).json({
      error: 'Internal Server Error',
    });
  }
};

exports.getLog = (req, res) => {
  res.render('shared/log', {
    title: 'My Log',
    role: 'project-manager',
    currentPage: 'log',
    logs: [],
    projects: [],
    filters: {},
    csrfToken: req.csrfToken(),
  });
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    title: 'Self Review',
    role: 'project-manager',
    currentPage: 'self-review',
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

    if (!user) {
      return res.status(404).send('User not found');
    }

    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'project-manager',
      user,
      error: '',
      success: '',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
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
      role: 'project-manager',
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

    if (!user) {
      return res.status(404).send('User not found');
    }

    const match = await bcrypt.compare(current_password, user.password);

    if (!match) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'project-manager',
        user,
        error: 'Current password is incorrect.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    if (new_password !== confirm_password) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'project-manager',
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
      role: 'project-manager',
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

exports.getProjects = async (req, res) => {
  try {
    const [projects] = await Project.fetchAll();

    res.render('project-manager/projects', {
      title: 'Projects',
      role: 'project-manager',
      currentPage: 'projects',
      projects,
      error: req.query.error || '',
      success: req.query.success || '',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.getProjectDetail = async (req, res) => {
  try {
    const [[project]] = await Project.fetchOne(req.params.id);

    if (!project) {
      return res.redirect('/project-manager/projects?error=Project+not+found');
    }

    const [teams] = await Project.fetchAssignedTeams(req.params.id);
    const [allTeams] = await Team.fetchAll();
    const [users] = await Project.fetchAssignedUsers(req.params.id);
    const [allUsers] = await User.fetchAll();
    const [activity] = await Project.fetchActivity(req.params.id);

    res.render('project-manager/project-detail', {
      title: project.project_name,
      role: 'project-manager',
      currentPage: 'projects',
      project,
      teams,
      allTeams,
      users,
      allUsers,
      activity,
      error: req.query.error || '',
      success: req.query.success || '',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.postCreateProject = async (req, res) => {
  const {
    project_name,
    description,
    status,
    start_date,
    end_date,
  } = req.body;

  const renderWithError = async (error) => {
    const [projects] = await Project.fetchAll();

    return res.render('project-manager/projects', {
      title: 'Projects',
      role: 'project-manager',
      currentPage: 'projects',
      projects,
      error,
      success: '',
      csrfToken: req.csrfToken(),
    });
  };

  if (!project_name || !project_name.trim()) {
    return renderWithError('El nombre del proyecto es requerido.');
  }

  if (start_date && end_date && end_date < start_date) {
    return renderWithError('La fecha de fin no puede ser anterior a la fecha de inicio.');
  }

  try {
    const [[existing]] = await Project.findByName(project_name.trim());

    if (existing) {
      return renderWithError('Ya existe un proyecto registrado con ese nombre.');
    }

    await Project.create(
      project_name.trim(),
      description,
      status,
      start_date || null,
      end_date || null
    );

    return res.redirect('/project-manager/projects?success=Proyecto+registrado+correctamente');
  } catch (err) {
    console.error(err);
    return renderWithError('No fue posible completar el registro. Intenta nuevamente.');
  }
};

exports.postAssignTeam = async (req, res) => {
  const { id } = req.params;
  const { id_team } = req.body;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect('/project-manager/projects?error=Project+not+found');
    }

    if (!id_team) {
      return res.redirect(`/project-manager/project/${id}?error=Please+select+a+team`);
    }

    const [[already]] = await Project.isTeamAssigned(id, id_team);

    if (already) {
      return res.redirect(`/project-manager/project/${id}?error=This+team+is+already+assigned+to+the+project`);
    }

    await Project.assignTeam(id, id_team, req.session.userId);

    return res.redirect(`/project-manager/project/${id}?success=Team+assigned+successfully`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/project-manager/project/${id}?error=Could+not+assign+the+team`);
  }
};

exports.postRemoveTeam = async (req, res) => {
  const { id, id_team } = req.params;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect('/project-manager/projects?error=Project+not+found');
    }

    await Project.removeTeam(id, id_team);

    return res.redirect(`/project-manager/project/${id}?success=Team+removed+successfully`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/project-manager/project/${id}?error=Could+not+remove+the+team`);
  }
};

exports.postEditProject = async (req, res) => {
  const { id } = req.params;
  const {
    project_name,
    description,
    status,
    start_date,
    end_date,
  } = req.body;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect('/project-manager/projects?error=El+proyecto+no+está+disponible');
    }

    if (!project_name || !project_name.trim()) {
      return renderProjectDetailView(req, res, project, {
        error: 'El nombre del proyecto es requerido.',
      });
    }

    if (start_date && end_date && end_date < start_date) {
      return renderProjectDetailView(req, res, project, {
        error: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
      });
    }

    const [[duplicate]] = await Project.findByNameExcluding(project_name.trim(), id);

    if (duplicate) {
      return renderProjectDetailView(req, res, project, {
        error: 'Ya existe otro proyecto con ese nombre.',
      });
    }

    await Project.update(
      id,
      project_name.trim(),
      description,
      status,
      start_date || null,
      end_date || null
    );

    return res.redirect(`/project-manager/project/${id}?success=Proyecto+actualizado+correctamente`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/project-manager/project/${id}?error=No+fue+posible+actualizar+el+proyecto`);
  }
};

exports.postDeleteProject = async (req, res) => {
  const { id } = req.params;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect('/project-manager/projects?error=El+proyecto+no+está+disponible');
    }

    await Project.delete(id);

    return res.redirect('/project-manager/projects?success=Proyecto+eliminado+correctamente');
  } catch (err) {
    console.error(err);
    return res.redirect('/project-manager/projects?error=No+fue+posible+eliminar+el+proyecto');
  }
};

exports.postProjectDates = async (req, res) => {
  const { id } = req.params;
  const { start_date, end_date } = req.body;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect('/project-manager/projects?error=El+proyecto+no+fue+encontrado');
    }

    if (!start_date || !end_date) {
      return renderProjectDetailView(req, res, project, {
        error: 'Ambas fechas son requeridas.',
      });
    }

    if (end_date < start_date) {
      return renderProjectDetailView(req, res, project, {
        error: 'La fecha de fin no puede ser anterior a la fecha de inicio.',
      });
    }

    await Project.updateDates(id, start_date, end_date);

    return res.redirect(`/project-manager/project/${id}?success=Fechas+actualizadas+correctamente`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/project-manager/project/${id}?error=No+fue+posible+actualizar+las+fechas`);
  }
};

exports.postProjectProgressStatus = async (req, res) => {
  const { id } = req.params;
  const { progress_status, progress_percentage } = req.body;

  const VALID_STATUSES = [
    'not_started',
    'in_progress',
    'on_hold',
    'at_risk',
    'completed',
  ];

  const pct = parseInt(progress_percentage, 10);

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect('/project-manager/projects?error=Project+not+found');
    }

    if (!progress_status || !VALID_STATUSES.includes(progress_status)) {
      return res.redirect(`/project-manager/project/${id}?error=Invalid+progress+status+selected`);
    }

    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.redirect(`/project-manager/project/${id}?error=Percentage+must+be+between+0+and+100`);
    }

    await Project.updateProgressStatus(id, progress_status, pct);

    return res.redirect(`/project-manager/project/${id}?success=Progress+status+updated+successfully`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/project-manager/project/${id}?error=Could+not+update+progress+status`);
  }
};

exports.postAssignUser = async (req, res) => {
  const { id } = req.params;
  const { id_user, id_team } = req.body;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect('/project-manager/projects?error=Project+not+found');
    }

    if (!id_user) {
      return res.redirect(`/project-manager/project/${id}?error=Please+select+a+user`);
    }

    const [[already]] = await Project.isUserAssigned(id, id_user);

    if (already) {
      return res.redirect(`/project-manager/project/${id}?error=This+user+is+already+assigned+to+the+project`);
    }

    await Project.assignUser(id, id_user, id_team || null, req.session.userId);

    return res.redirect(`/project-manager/project/${id}?success=Member+added+successfully`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/project-manager/project/${id}?error=Could+not+assign+the+user`);
  }
};

exports.postRemoveUser = async (req, res) => {
  const { id, id_user } = req.params;

  try {
    const [[project]] = await Project.fetchOne(id);

    if (!project) {
      return res.redirect('/project-manager/projects?error=Project+not+found');
    }

    await Project.removeUser(id, id_user);

    return res.redirect(`/project-manager/project/${id}?success=Member+removed+successfully`);
  } catch (err) {
    console.error(err);
    return res.redirect(`/project-manager/project/${id}?error=Could+not+remove+the+user`);
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

    res.render('project-manager/blockers', {
      title: 'Organizational Blockers',
      role: 'project-manager',
      currentPage: 'blockers',
      blockers,
      projects,
      filters: { id_project: id_project || '' },
      error: req.query.error || '',
      success: req.query.success || '',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

// CU 4.9 — Progress report PDF export
exports.exportProjectReportPDF = async (req, res) => {
  const { id } = req.params;

  let data;
  try {
    data = await getProjectReportData(id);
  } catch (err) {
    console.error('Error fetching project report data:', err);
    return res.redirect(`/project-manager/project/${id}?error=Error+fetching+report+data`);
  }

  if (!data.proyecto) {
    return res.redirect(`/project-manager/project/${id}?error=Project+not+found`);
  }

  if (!data.bitacoras.length && !data.bloqueos.length) {
    return res.redirect(`/project-manager/project/${id}?error=Not+enough+data+to+generate+the+report`);
  }

  try {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report-${data.proyecto.project_name.replace(/\s+/g, '-')}-${Date.now()}.pdf"`
    );

    doc.pipe(res);

    // Header
    doc.roundedRect(40, 35, 515, 95, 10).fillAndStroke('#EFF6FF', '#3b82f6');

    doc.fillColor('#3b82f6')
      .fontSize(20)
      .text('Project Progress Report', 60, 50, { align: 'center', width: 475 });

    doc.fillColor('#64748b')
      .fontSize(10)
      .text('Mufasa — Project Management Platform', 60, 80, { align: 'center', width: 475 });

    doc.fillColor('#1e293b').fontSize(10);
    doc.text(`Project: ${data.proyecto.project_name}`, 60, 108, { width: 160 });
    doc.text(`Status: ${data.proyecto.status}`, 240, 108, { width: 120 });
    doc.text(`Progress: ${data.proyecto.progress_percentage || 0}%`, 380, 108, { width: 140 });

    doc.y = 150;
    doc.moveDown(1.2);

    // Progress bar
    const barX = 50;
    const barY = doc.y;
    const barWidth = 495;
    const barHeight = 12;
    const fillWidth = Math.round(((data.proyecto.progress_percentage || 0) / 100) * barWidth);

    doc.roundedRect(barX, barY, barWidth, barHeight, 6).fillAndStroke('#e2e8f0', '#e2e8f0');
    if (fillWidth > 0) {
      doc.roundedRect(barX, barY, fillWidth, barHeight, 6).fillAndStroke('#3b82f6', '#3b82f6');
    }

    doc.y = barY + barHeight + 6;

    const progressLabels = {
      not_started: 'Not Started',
      in_progress: 'In Progress',
      on_hold: 'On Hold',
      at_risk: 'At Risk',
      completed: 'Completed',
    };

    doc.fontSize(9).fillColor('#64748b').text(
      `Progress status: ${progressLabels[data.proyecto.progress_status] || '—'}   |   Start: ${
        data.proyecto.start_date
          ? new Date(data.proyecto.start_date).toLocaleDateString('en-US')
          : '—'
      }   |   Due: ${
        data.proyecto.end_date
          ? new Date(data.proyecto.end_date).toLocaleDateString('en-US')
          : '—'
      }`,
      { align: 'center' }
    );

    doc.moveDown(1);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e2e8f0');
    doc.moveDown(0.8);

    // Description
    if (data.proyecto.description) {
      doc.fontSize(13).fillColor('#3b82f6').text('Description');
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor('#475569').text(data.proyecto.description, { width: 470 });
      doc.moveDown(0.8);
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e2e8f0');
      doc.moveDown(0.8);
    }

    // Assigned Teams
    doc.fontSize(13).fillColor('#3b82f6').text('Assigned Teams');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#1e293b');

    if (data.equipos.length === 0) {
      doc.fillColor('#94a3b8').text('No teams assigned.');
    } else {
      data.equipos.forEach((team) => {
        doc.fillColor('#1e293b').text(`• ${team.team_name}`, { continued: true });
        doc.fillColor('#64748b').text(`  —  Lead: ${team.leader_name || '—'}`);
      });
    }

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e2e8f0');
    doc.moveDown(0.8);

    // Team Members
    doc.fontSize(13).fillColor('#3b82f6').text('Team Members');
    doc.moveDown(0.3);
    doc.fontSize(10);

    if (data.miembros.length === 0) {
      doc.fillColor('#94a3b8').text('No members assigned.');
    } else {
      data.miembros.forEach((member) => {
        doc.fillColor('#1e293b').text(`• ${member.full_name}`, { continued: true });
        doc.fillColor('#64748b').text(`  —  ${member.email}  |  ${member.team_name || 'No team'}`);
      });
    }

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e2e8f0');
    doc.moveDown(0.8);

    // Blockers
    doc.fontSize(13).fillColor('#3b82f6').text('Organizational Blockers');
    doc.moveDown(0.3);
    doc.fontSize(10);

    if (data.bloqueos.length === 0) {
      doc.fillColor('#94a3b8').text('No blockers recorded.');
    } else {
      data.bloqueos.forEach((blocker) => {
        doc.fillColor('#1e293b').text(`• ${blocker.reporter_name}:`, { continued: true });
        doc.fillColor('#475569').text(` ${blocker.description}`);
        doc.fontSize(9).fillColor('#94a3b8').text(
          `  Severity: ${blocker.severity || '—'}   |   Status: ${blocker.resolution_status}   |   ${new Date(blocker.detected_at).toLocaleDateString('en-US')}`,
          { indent: 10 }
        );
        doc.fontSize(10);
        doc.moveDown(0.3);
      });
    }

    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e2e8f0');
    doc.moveDown(0.8);

    // Goals
    doc.fontSize(13).fillColor('#3b82f6').text('Project Goals');
    doc.moveDown(0.3);
    doc.fontSize(10);

    if (data.metas.length === 0) {
      doc.fillColor('#94a3b8').text('No goals defined for this project.');
    } else {
      data.metas.forEach((goal) => {
        doc.fillColor('#1e293b').text(`• ${goal.title}`);
        if (goal.description) {
          doc.fontSize(9).fillColor('#64748b').text(`  ${goal.description}`, { indent: 10 });
          doc.fontSize(10);
        }
        doc.moveDown(0.2);
      });
    }

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#e2e8f0');
    doc.moveDown(0.8);

    // Recent Activity
    doc.fontSize(13).fillColor('#3b82f6').text('Recent Activity');
    doc.moveDown(0.3);
    doc.fontSize(10);

    if (data.bitacoras.length === 0) {
      doc.fillColor('#94a3b8').text('No activity recorded.');
    } else {
      data.bitacoras.slice(0, 30).forEach((log) => {
        doc.fillColor('#1e293b').text(
          `• [${new Date(log.created_at).toLocaleDateString('en-US')}] ${log.full_name}`
        );

        if (log.completed) {
          doc.fontSize(9).fillColor('#475569').text(
            `  Completed: ${log.completed}`,
            { indent: 10, width: 460 }
          );
        }

        if (log.planned) {
          doc.fontSize(9).fillColor('#94a3b8').text(
            `  Planned: ${log.planned}`,
            { indent: 10, width: 460 }
          );
        }

        doc.fontSize(10);
        doc.moveDown(0.3);
      });

      if (data.bitacoras.length > 30) {
        doc.fontSize(9).fillColor('#94a3b8').text(
          `Showing 30 of ${data.bitacoras.length} entries.`
        );
      }
    }

    // Footer
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#3b82f6');
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#94a3b8').text(
      `Report generated on ${new Date().toLocaleDateString('en-US')}`,
      { align: 'center' }
    );

    doc.end();
  } catch (err) {
    console.error('Error generating PDF:', err);
    if (!res.headersSent) {
      return res.redirect(`/project-manager/project/${id}?error=Could+not+generate+the+report`);
    }
  }
};