/**
 * Slack Integration controller.
 * Receives standup payloads from Slack workflows and creates log entries.
 */

const User = require('../models/user.model.js');
const Log = require('../models/log.model.js');
const Blocker = require('../models/blocker.model.js');
const Project = require('../models/project.model.js');

exports.receiveStandup = async (req, res) => {
  try {
    const { source, user: slackUser, standup, date } = req.body;

    if (source !== 'slack_workflow') {
      return res.status(400).json({
        success: false,
        error: 'Invalid source. Expected "slack_workflow".',
      });
    }

    if (!slackUser || !standup) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: user and standup.',
      });
    }

    const { displayName } = slackUser;
    const { didToday, doingTomorrow, blockers } = standup;

    if (!didToday) {
      return res.status(400).json({
        success: false,
        error: 'standup.didToday is required.',
      });
    }

    let dbUser = null;

    if (displayName) {
      const [rows] = await User.findBySlackUser(displayName);
      if (rows.length > 0) dbUser = rows[0];
    }

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        error: `No user found with slack_user="${displayName}". Make sure the employee has configured their Slack username in their profile.`,
      });
    }

    const completed = didToday;
    const planned = doingTomorrow || '';
    const [logResult] = await Log.create(dbUser.id_user, completed, planned);
    const newLogId = logResult.insertId;

    let linkedProjects = 0;
    try {
      const [projects] = await Project.fetchAllByEmployee(dbUser.id_user);
      if (projects.length > 0) {
        const projectsToLink = projects.map((p) => ({
          id_project: p.id_project,
          id_team: p.id_team,
        }));
        await Log.linkProjects(newLogId, projectsToLink);
        linkedProjects = projectsToLink.length;
      }
    } catch (linkErr) {
      console.log(linkErr);
    }

    let blockerCreated = false;
    const blockerText = (blockers || '').trim();
    const isNoBlocker = !blockerText ||
      blockerText.toLowerCase() === 'none' ||
      blockerText.toLowerCase() === 'n/a' ||
      blockerText.toLowerCase() === 'no';

    if (!isNoBlocker) {
      await Blocker.create(newLogId, blockerText);
      blockerCreated = true;
    }

    return res.status(201).json({
      success: true,
      message: 'Standup log created successfully.',
      data: {
        id_log: newLogId,
        user: dbUser.full_name,
        date: date || new Date().toISOString().split('T')[0],
        linkedProjects,
        blockerCreated,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
    });
  }
};
