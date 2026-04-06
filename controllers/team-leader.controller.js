const db = require('../models/db');

/**
 * Team Leader views controller.
 * Handles dashboard, personal log, team log, team members, team report, self-review and profile.
 */

exports.getDashboard = async (req, res) => {
  try {
    const teamId = 1;

    const [pendingBlockers] = await db.query(
      `
      SELECT
        b.id_blocker,
        b.description,
        b.resolution_status,
        l.created_at,
        u.full_name,
        u.avatar,
        p.project_name
      FROM blocker b
      INNER JOIN log l ON b.id_log = l.id_log
      INNER JOIN user u ON l.id_user = u.id_user
      INNER JOIN log_project lp ON l.id_log = lp.id_log
      INNER JOIN project p ON lp.id_project = p.id_project
      WHERE lp.id_team = ?
        AND b.resolution_status = 'pending'
      ORDER BY l.created_at DESC
      `,
      [teamId]
    );

    const [pendingAchievements] = await db.query(
      `
      SELECT
        a.id_achievement,
        a.description,
        a.created_at,
        a.validation_status,
        u.id_user,
        u.full_name,
        u.avatar
      FROM achievement a
      INNER JOIN user u ON a.id_user = u.id_user
      INNER JOIN user_team ut ON u.id_user = ut.id_user
      WHERE ut.id_team = ?
        AND a.validation_status = 'pending'
      ORDER BY a.created_at DESC
      `,
      [teamId]
    );

    res.render('team-leader/dashboard', {
      currentPage: 'dashboard',
      role: 'team-leader',
      pendingBlockers,
      pendingAchievements,
    });
  } catch (error) {
    console.error(error);
    res.send('Error DB');
  }
};

exports.getLog = (req, res) => {
  res.render('shared/log', {
    currentPage: 'log',
    role: 'team-leader',
  });
};

exports.getTeamLog = async (req, res) => {
  try {
    const teamId = 1;
    const { from, to } = req.query;

    let query = `
      SELECT
        l.id_log,
        l.completed,
        l.planned,
        l.created_at,
        u.full_name,
        u.email,
        u.avatar,
        u.role,
        p.project_name,
        b.description AS blocker_description
      FROM log l
      INNER JOIN user u ON l.id_user = u.id_user
      INNER JOIN log_project lp ON l.id_log = lp.id_log
      INNER JOIN project p ON lp.id_project = p.id_project
      LEFT JOIN blocker b ON l.id_log = b.id_log AND b.resolution_status = 'pending'
      WHERE lp.id_team = ?
    `;

    const params = [teamId];

    if (from) {
      query += ' AND DATE(l.created_at) >= ?';
      params.push(from);
    }

    if (to) {
      query += ' AND DATE(l.created_at) <= ?';
      params.push(to);
    }

    query += ' ORDER BY l.created_at DESC';

    const [entries] = await db.query(query, params);

    res.render('team-leader/team-log', {
      currentPage: 'team-log',
      role: 'team-leader',
      entries,
      filters: { from: from || '', to: to || '' },
    });
  } catch (error) {
    console.error(error);
    res.send('Error DB');
  }
};

exports.getTeamMembers = async (req, res) => {
  try {
    const teamId = 1;

    const [members] = await db.query(
      `
      SELECT 
        u.id_user,
        u.full_name,
        u.email,
        u.avatar,
        u.role,
        t.team_name
      FROM user_team ut
      INNER JOIN user u ON ut.id_user = u.id_user
      INNER JOIN team t ON ut.id_team = t.id_team
      WHERE ut.id_team = ?
      `,
      [teamId]
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
      [teamId]
    );

    res.render('team-leader/team-members', {
      currentPage: 'team-members',
      role: 'team-leader',
      members,
      availableUsers,
      teamName: members.length > 0 ? members[0].team_name : 'Team',
    });
  } catch (error) {
    console.error(error);
    res.send('Error DB');
  }
};

exports.getTeamReport = (req, res) => {
  res.render('team-leader/team-report', {
    currentPage: 'team-report',
    role: 'team-leader',
  });
};

exports.getSelfReview = (req, res) => {
  res.render('shared/self-review', {
    currentPage: 'self-review',
    role: 'team-leader',
  });
};

exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    currentPage: 'profile',
    role: 'team-leader',
  });
};

exports.addTeamMember = async (req, res) => {
  try {
    const teamId = 1;
    const { id_user } = req.body;

    await db.query(
      'INSERT INTO user_team (id_user, id_team) VALUES (?, ?)',
      [id_user, teamId]
    );

    res.redirect('/team-leader/team-members');
  } catch (error) {
    console.error(error);
    res.send('Error DB');
  }
};

exports.removeTeamMember = async (req, res) => {
  try {
    const teamId = 1;
    const { id_user } = req.body;

    await db.query(
      'DELETE FROM user_team WHERE id_user = ? AND id_team = ?',
      [id_user, teamId]
    );

    res.redirect('/team-leader/team-members');
  } catch (error) {
    console.error(error);
    res.send('Error DB');
  }
};

exports.resolveBlocker = async (req, res) => {
  try {
    const { id_blocker } = req.body;

    await db.query(
      'UPDATE blocker SET resolution_status = ? WHERE id_blocker = ?',
      ['resolved', id_blocker]
    );

    res.redirect('/team-leader/dashboard');
  } catch (error) {
    console.error(error);
    res.send('Error DB');
  }
};

exports.approveAchievement = async (req, res) => {
  try {
    const leaderId = 1;
    const { id_achievement } = req.body;

    await db.query(
      `
      UPDATE achievement
      SET validation_status = 'approved',
          validated_by = ?,
          validated_at = NOW()
      WHERE id_achievement = ?
      `,
      [leaderId, id_achievement]
    );

    res.redirect('/team-leader/dashboard');
  } catch (error) {
    console.error(error);
    res.send('Error DB');
  }
};

exports.rejectAchievement = async (req, res) => {
  try {
    const leaderId = 1;
    const { id_achievement } = req.body;

    await db.query(
      `
      UPDATE achievement
      SET validation_status = 'rejected',
          validated_by = ?,
          validated_at = NOW()
      WHERE id_achievement = ?
      `,
      [leaderId, id_achievement]
    );

    res.redirect('/team-leader/dashboard');
  } catch (error) {
    console.error(error);
    res.send('Error DB');
  }
};
  