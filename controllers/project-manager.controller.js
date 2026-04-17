/**
 * Project Manager Controller
 */
const User    = require('../models/user.model');
const Project = require('../models/project.model');
const bcrypt  = require('bcrypt');

exports.getDashboard = (req, res) => {
  res.render('project-manager/dashboard', {
    title: 'PM Dashboard',
    role: 'project-manager',
    currentPage: 'dashboard',
  });
};

exports.getReports = (req, res) => {
  res.render('project-manager/reports', {
    title: 'Reports',
    role: 'project-manager',
    currentPage: 'reports',
  });
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
  });
};

exports.getProfile = async (req, res) => {
  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    if (!user) return res.status(404).send('User not found');

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
    if (!project) return res.redirect('/project-manager/projects?error=Project+not+found');

    res.render('project-manager/project-detail', {
      title: project.project_name,
      role: 'project-manager',
      currentPage: 'projects',
      project,
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
  const { project_name, description, status, start_date, end_date } = req.body;

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
    if (existing) return renderWithError('Ya existe un proyecto registrado con ese nombre.');

    await Project.create(project_name.trim(), description, status, start_date || null, end_date || null);
    res.redirect('/project-manager/projects?success=Proyecto+registrado+correctamente');
  } catch (err) {
    console.error(err);
    return renderWithError('No fue posible completar el registro. Intenta nuevamente.');
  }
};