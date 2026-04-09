/**
 * Admin views controller.
 * Handles system administration: users, teams, roles, integrations and profile.
 */

const User = require('../models/user.model');
const Team = require('../models/team.model');
const db = require('../util/database');
const bcrypt = require('bcrypt');

exports.getDashboard = (req, res) => {
  res.render('admin/dashboard', {
    currentPage: 'dashboard',
    role: 'admin',
  });
};

exports.getUsers = async (req, res) => {
  try {
    const [users] = await User.fetchAll();
    const [roles] = await db.query('SELECT * FROM role ORDER BY id_role ASC');
    res.render('admin/users', {
      currentPage: 'users',
      role: 'admin',
      users,
      roles,
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

exports.createUser = async (req, res) => {
  const { full_name, email, username, password, id_role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await User.create(full_name, email, username, hashedPassword);
    await User.assignRole(result.insertId, id_role);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('createUser error:', err);
    res.status(500).send('Error creating user');
  }
};

exports.editUser = async (req, res) => {
  const { id_user, full_name, email, username, id_role } = req.body;

  try {
    await User.update(id_user, full_name, email, username);
    await User.updateRole(id_user, id_role);
    res.redirect('/admin/users');
  } catch (err) {
    console.error('editUser error:', err);
    res.status(500).send('Error updating user');
  }
};

exports.getTeams = async (req, res) => {
  try {
    const [teams] = await Team.fetchAll();
    const [users] = await User.fetchAll();
    res.render('admin/teams', {
      currentPage: 'teams',
      role: 'admin',
      teams,
      users,
    });
  } catch (err) {
    console.error('getTeams error:', err);
    res.status(500).send('Error loading teams');
  }
};

exports.createTeam = async (req, res) => {
  const { team_name, description, id_leader } = req.body;

  try {
    await Team.create(team_name, description, id_leader);
    res.redirect('/admin/teams');
  } catch (err) {
    console.error('createTeam error:', err);
    res.status(500).send('Error creating team');
  }
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