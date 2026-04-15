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
      'SELECT id_user AS id, is_active FROM user WHERE id_user = ?', [id]
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newIsActive = user.is_active ? 0 : 1;
    const newStatus = newIsActive ? 'active' : 'inactive';

    await db.query(
      'UPDATE user SET is_active = ?, status = ? WHERE id_user = ?',
      [newIsActive, newStatus, id]
    );

    res.json({ success: true, is_active: newIsActive });
  } catch (err) {
    console.error('toggleUserStatus error:', err);
    res.status(500).json({ success: false, message: 'Could not update user status' });
  }
};

exports.createUser = async (req, res) => {
  const { full_name, email, password, id_role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 12);
    const [result] = await User.create(full_name, email, email, hashedPassword);
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
    await User.update(id_user, full_name, email, email);
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