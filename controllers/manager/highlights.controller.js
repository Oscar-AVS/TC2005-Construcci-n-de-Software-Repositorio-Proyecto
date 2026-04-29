/**
 * Manager highlights controller.
 * Handles highlight listing, creation, update and deletion.
 */

const Highlight = require('../../models/highlight.model');
const Project = require('../../models/project.model');

exports.getHighlights = async (req, res) => {
  const activeUserId = req.session.userId;

  try {
    const [[highlights], [projects]] = await Promise.all([
      Highlight.fetchAllByManager(activeUserId),
      Project.fetchAvailableForGoalLink(),
    ]);

    res.render('manager/highlights', {
      currentPage: 'highlights',
      role: 'manager',
      highlights,
      availableProjects: projects,
      csrfToken: req.csrfToken(),
    });
  } catch (err) {
    console.log(err);
    res.status(500).send('Internal Server Error');
  }
};

exports.createHighlight = async (req, res) => {
  const activeUserId = req.session.userId;

  const {
    title,
    description,
    impact,
    highlight_type: highlightType,
    highlight_date: highlightDate,
    id_project: idProject,
    id_team: idTeam,
  } = req.body;

  const validHighlightTypes = ['technical', 'business', 'team', 'product'];
  const verificationStatus = 'pending';

  try {
    if (
      !title || !title.trim()
      || !description || !description.trim()
      || !highlightType
      || !highlightDate
    ) {
      await Highlight.createAuditLog({
        idUser: activeUserId,
        action: 'create',
        entityType: 'highlight',
        entityId: null,
        success: 0,
        detail: 'Highlight creation failed: missing required fields.',
      });

      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    if (!validHighlightTypes.includes(highlightType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid highlight type.',
      });
    }

    const normalizedProjectId = idProject && idProject !== '' ? Number(idProject) : null;
    const normalizedTeamId = idTeam && idTeam !== '' ? Number(idTeam) : null;

    const [result] = await Highlight.create({
      idUser: activeUserId,
      idProject: normalizedProjectId,
      idTeam: normalizedTeamId,
      title: title.trim(),
      description: description.trim(),
      impact: impact && impact.trim() ? impact.trim() : null,
      highlightType,
      verificationStatus,
      highlightDate,
    });

    await Highlight.createAuditLog({
      idUser: activeUserId,
      action: 'create',
      entityType: 'highlight',
      entityId: result.insertId,
      success: 1,
      detail: 'Highlight created successfully.',
    });

    const [createdRows] = await Highlight.fetchOneById(result.insertId, activeUserId);

    return res.status(201).json({
      success: true,
      message: 'Highlight registered successfully.',
      highlight: createdRows[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Error while registering the highlight.',
    });
  }
};

exports.updateHighlight = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  const {
    title,
    description,
    impact,
    highlight_type: highlightType,
    highlight_date: highlightDate,
    id_project: idProject,
    id_team: idTeam,
  } = req.body;

  const validHighlightTypes = ['technical', 'business', 'team', 'product'];

  try {
    if (
      !title || !title.trim()
      || !description || !description.trim()
      || !highlightType
      || !highlightDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please complete all required fields.',
      });
    }

    if (!validHighlightTypes.includes(highlightType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid highlight type.',
      });
    }

    const [existingRows] = await Highlight.fetchOneById(id, activeUserId);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found.',
      });
    }

    const normalizedProjectId = idProject && idProject !== '' ? Number(idProject) : null;
    const normalizedTeamId = idTeam && idTeam !== '' ? Number(idTeam) : null;

    const [result] = await Highlight.update({
      idHighlight: id,
      idUser: activeUserId,
      idProject: normalizedProjectId,
      idTeam: normalizedTeamId,
      title: title.trim(),
      description: description.trim(),
      impact: impact && impact.trim() ? impact.trim() : null,
      highlightType,
      highlightDate,
    });

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Highlight could not be updated.',
      });
    }

    await Highlight.createAuditLog({
      idUser: activeUserId,
      action: 'update',
      entityType: 'highlight',
      entityId: id,
      success: 1,
      detail: 'Highlight updated successfully.',
    });

    const [updatedRows] = await Highlight.fetchOneById(id, activeUserId);

    return res.status(200).json({
      success: true,
      message: 'Highlight updated successfully.',
      highlight: updatedRows[0],
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};

exports.deleteHighlight = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  try {
    const [existingRows] = await Highlight.fetchOneById(id, activeUserId);

    if (existingRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Highlight not found.',
      });
    }

    const [result] = await Highlight.delete(id, activeUserId);

    if (result.affectedRows === 0) {
      return res.status(400).json({
        success: false,
        message: 'Highlight could not be deleted.',
      });
    }

    await Highlight.createAuditLog({
      idUser: activeUserId,
      action: 'delete',
      entityType: 'highlight',
      entityId: id,
      success: 1,
      detail: 'Highlight deleted successfully.',
    });

    return res.status(200).json({
      success: true,
      message: 'Highlight deleted successfully.',
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};