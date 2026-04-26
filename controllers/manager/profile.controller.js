/**
 * Manager profile controller.
 * Handles profile view, Slack username and password updates.
 */

const bcrypt = require('bcrypt');
const User = require('../../models/user.model');

exports.getProfile = (req, res) => {
  const activeUserId = req.session.userId;

  User.fetchOne(activeUserId)
    .then(([rows]) => {
      if (rows.length > 0) {
        res.render('shared/profile', {
          currentPage: 'profile',
          role: 'manager',
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

exports.postSlack = async (req, res) => {
  const { slack_user: slackUser } = req.body;

  try {
    await User.updateSlack(req.session.userId, slackUser);
    const [[user]] = await User.fetchOne(req.session.userId);

    res.render('shared/profile', {
      currentPage: 'profile',
      role: 'manager',
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
  const {
    current_password: currentPassword,
    new_password: newPassword,
    confirm_password: confirmPassword,
  } = req.body;

  try {
    const [[user]] = await User.fetchOne(req.session.userId);
    const match = await bcrypt.compare(currentPassword, user.password);

    if (!match) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'manager',
        user,
        error: 'Current password is incorrect.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    if (newPassword !== confirmPassword) {
      return res.render('shared/profile', {
        currentPage: 'profile',
        role: 'manager',
        user,
        error: 'New passwords do not match.',
        success: '',
        csrfToken: req.csrfToken(),
      });
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.updatePassword(req.session.userId, hashed);

    const [[updatedUser]] = await User.fetchOne(req.session.userId);

    return res.render('shared/profile', {
      currentPage: 'profile',
      role: 'manager',
      user: updatedUser,
      error: '',
      success: 'Password updated successfully.',
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send('Internal Server Error');
  }
};