/**
 * Admin views controller.
 * Handles system administration: users, teams, roles, integrations and profile.
 */

const db = require('../util/database');

exports.getDashboard = (req, res) => {
  res.render('admin/dashboard', {
    currentPage: 'dashboard',
    role: 'admin',
  });
};

exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      `SELECT
        id_user AS id,
        full_name,
        email,
        role,
        is_active
      FROM user
      ORDER BY id_user DESC`
    );
    res.render('admin/users', {
      currentPage: 'users',
      role: 'admin',
      users,
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
      'SELECT id_user AS id, is_active FROM user WHERE id_user = ?', [id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newStatus = user.is_active ? 0 : 1;

    await db.query(
      'UPDATE user SET is_active = ? WHERE id_user = ?', [newStatus, id]
    );

    res.json({ success: true, is_active: newStatus });

  } catch (err) {
    console.error('toggleUserStatus error:', err);
    res.status(500).json({ success: false, message: 'Could not update user status' });
  }
};

exports.getTeams = (req, res) => {
  res.render('admin/teams', {
    currentPage: 'teams',
    role: 'admin',
  });
};

exports.getRoles = (req, res) => {
  res.render('admin/roles', {
    currentPage: 'roles',
    role: 'admin',
  });
};

exports.getIntegrations = (req, res) => {
  res.render('admin/integrations', {
    currentPage: 'integrations',
    role: 'admin',
  });
};

exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    currentPage: 'profile',
    role: 'admin',
  });
};