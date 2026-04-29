/**
 * Manager reports controller.
 * Handles reports view and period comparison metrics.
 */

const Log = require('../../models/log.model');
const Team = require('../../models/team.model');

exports.getReports = (req, res) => {
  Team.fetchAllForSelect()
    .then(([teams]) => {
      res.render('manager/reports', {
        currentPage: 'reports',
        role: 'manager',
        teams,
        csrfToken: req.csrfToken(),
      });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).send('Internal Server Error');
    });
};

exports.comparePeriods = async (req, res) => {
  try {
    const {
      periodAFrom,
      periodATo,
      periodBFrom,
      periodBTo,
    } = req.query;

    if (!periodAFrom || !periodATo || !periodBFrom || !periodBTo) {
      return res.status(400).json({
        success: false,
        message: 'Please select valid dates for both periods.',
      });
    }

    if (periodAFrom > periodATo || periodBFrom > periodBTo) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be later than end date.',
      });
    }

    const periodsOverlap = periodAFrom <= periodBTo && periodBFrom <= periodATo;

    if (periodsOverlap) {
      return res.status(400).json({
        success: false,
        message: 'Periods cannot overlap. Please select separate date ranges.',
      });
    }

    const periodA = {
      date_from: periodAFrom,
      date_to: periodATo,
    };

    const periodB = {
      date_from: periodBFrom,
      date_to: periodBTo,
    };

    const [
      [[periodALogMetrics]],
      [[periodBLogMetrics]],
      [[periodABlockerMetrics]],
      [[periodBBlockerMetrics]],
      [[periodAHighlightMetrics]],
      [[periodBHighlightMetrics]],
    ] = await Promise.all([
      Log.fetchMetricsByPeriod(periodA),
      Log.fetchMetricsByPeriod(periodB),
      Log.fetchBlockersByPeriod(periodA),
      Log.fetchBlockersByPeriod(periodB),
      Log.fetchHighlightsByPeriod(periodA),
      Log.fetchHighlightsByPeriod(periodB),
    ]);

    return res.status(200).json({
      success: true,
      periodA: {
        from: periodAFrom,
        to: periodATo,
        totalLogs: periodALogMetrics.total_logs || 0,
        totalActivities: periodALogMetrics.total_activities || 0,
        totalBlockers: periodABlockerMetrics.total_blockers || 0,
        totalHighlights: periodAHighlightMetrics.total_highlights || 0,
      },
      periodB: {
        from: periodBFrom,
        to: periodBTo,
        totalLogs: periodBLogMetrics.total_logs || 0,
        totalActivities: periodBLogMetrics.total_activities || 0,
        totalBlockers: periodBBlockerMetrics.total_blockers || 0,
        totalHighlights: periodBHighlightMetrics.total_highlights || 0,
      },
    });
  } catch (err) {
    console.log(err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};