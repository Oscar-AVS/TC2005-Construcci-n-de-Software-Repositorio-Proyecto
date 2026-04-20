const db = require('../util/database');

module.exports = async (req, res, next) => {
  if (req.session && req.session.userId) {
    try {
      await db.execute('SET @current_user_id = ?', [req.session.userId]);
    } catch (err) {
      console.error('Error setting audit context:', err);
    }
  }
  next();
};
