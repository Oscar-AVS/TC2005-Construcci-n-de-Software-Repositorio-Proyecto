/**
 * Admin views controller.
 * Handles system administration: users, teams, roles, integrations and profile.
 */

const db = require('../util/db'); 

/**
 * Renders the admin dashboard with system overview metrics.
 */
exports.getDashboard = (req, res) => {
  res.render('admin/dashboard', {
    currentPage: 'dashboard',
    role: 'admin',
  });
};

/**
 * Renders the users management view pulling real data from DB.
 */
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT * FROM users ORDER BY created_at DESC'
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

/**
 * Toggles a user's active status (activate / deactivate).
 * Covers basic flow steps 7-9 and alternate flows 4.1, 7.1
 * PATCH /admin/users/:id/toggle-status
 */
exports.toggleUserStatus = async (req, res) => {
  const { id } = req.params;

  // Flujo alterno 4.1 — id inválido antes de tocar la DB
  if (!id || isNaN(id)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  try {
    // Flujo básico 7 — buscamos el usuario
    const [[user]] = await db.query(
      'SELECT id, is_active FROM users WHERE id = ?', [id]
    );

    // Flujo alterno 4.1 — el usuario no existe
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const newStatus = user.is_active ? 0 : 1;

    // Flujo básico 8 — actualizamos el estado
    await db.query(
      'UPDATE users SET is_active = ? WHERE id = ?', [newStatus, id]
    );

    // Flujo básico 9 — confirmamos la operación
    res.json({ success: true, is_active: newStatus });

  } catch (err) {
    // Flujo alterno 7.1 — error al procesar
    console.error('toggleUserStatus error:', err);
    res.status(500).json({ success: false, message: 'Could not update user status' });
  }
};

/**
 * Renders the teams management view for CRUD and member assignment.
 */
exports.getTeams = (req, res) => {
  res.render('admin/teams', {
    currentPage: 'teams',
    role: 'admin',
  });
};

/**
 * Renders the roles and permissions management view (RBAC).
 */
exports.getRoles = (req, res) => {
  res.render('admin/roles', {
    currentPage: 'roles',
    role: 'admin',
  });
};

/**
 * Renders the integrations configuration view.
 */
exports.getIntegrations = (req, res) => {
  res.render('admin/integrations', {
    currentPage: 'integrations',
    role: 'admin',
  });
};

/**
 * Renders the admin's profile using shared view.
 */
exports.getProfile = (req, res) => {
  res.render('shared/profile', {
    currentPage: 'profile',
    role: 'admin',
  });
};