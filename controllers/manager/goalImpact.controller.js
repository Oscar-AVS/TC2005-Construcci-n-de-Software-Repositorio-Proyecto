/**
 * Manager goal impact controller.
 * Generates AI summaries and PDF reports for goal impact.
 */

const { generateText, Output } = require('ai');
const PDFDocument = require('pdfkit');
const { openai } = require('@ai-sdk/openai');
const { z } = require('zod');

const Goal = require('../../models/goal.model');

const buildGoalImpactPrompt = ({
  goal,
  projectsText,
  teamsText,
  logsText,
  highlightsText,
}) => `
You are a senior product manager generating a structured impact summary.

Analyze the following goal data and return a structured JSON response.

GOAL: ${goal.title}
DESCRIPTION: ${goal.description || 'No description'}

PROJECTS: ${projectsText}
TEAMS: ${teamsText}

LOGS:
${logsText}

HIGHLIGHTS:
${highlightsText}

Instructions:

1. overallImpact:
Short executive summary of how strong the goal impact is.

2. projectsDrivingGoal:
List the most relevant projects contributing to this goal.

3. teamParticipation:
Describe how teams are contributing (strong, weak, missing collaboration, etc).

4. keyContributions:
List key contributions detected from logs.

5. relevantHighlights:
List important highlights related to the goal.

6. risksOrGaps:
List risks, missing contributions, or weak areas.

7. recommendations:
Give actionable recommendations for the manager.
`.trim();

const goalImpactSchema = z.object({
  overallImpact: z.string(),
  projectsDrivingGoal: z.array(z.string()),
  teamParticipation: z.string(),
  keyContributions: z.array(z.string()),
  relevantHighlights: z.array(z.string()),
  risksOrGaps: z.array(z.string()),
  recommendations: z.array(z.string()),
});

const getGoalImpactData = async (id, activeUserId) => {
  const [
    [goalRows],
    [projects],
    [teams],
    [logs],
    [highlights],
  ] = await Promise.all([
    Goal.fetchOneById(id, activeUserId),
    Goal.fetchGoalImpactProjectsByManager(activeUserId),
    Goal.fetchGoalImpactTeamsByManager(activeUserId),
    Goal.fetchGoalImpactLogsByManager(activeUserId),
    Goal.fetchGoalImpactHighlightsByManager(activeUserId),
  ]);

  if (goalRows.length === 0) {
    return null;
  }

  const goal = goalRows[0];

  const goalProjects = projects.filter((project) => project.id_goal == id);
  const goalTeams = teams.filter((team) => team.id_goal == id);
  const goalLogs = logs.filter((log) => log.id_goal == id);
  const goalHighlights = highlights.filter((highlight) => highlight.id_goal == id);

  const logsText = goalLogs.map((log) =>
    `- ${log.full_name}: completed "${log.completed}" planned "${log.planned}"`
  ).join('\n') || 'No logs';

  const highlightsText = goalHighlights.map((highlight) =>
    `- ${highlight.title}: ${highlight.impact || 'no impact'}`
  ).join('\n') || 'No highlights';

  const projectsText = goalProjects.map((project) => project.project_name).join(', ') || 'No projects';
  const teamsText = goalTeams.map((team) => team.team_name).join(', ') || 'No teams';

  return {
    goal,
    goalProjects,
    goalTeams,
    goalLogs,
    goalHighlights,
    logsText,
    highlightsText,
    projectsText,
    teamsText,
  };
};

const generateGoalImpactOutput = async (impactData) => {
  const prompt = buildGoalImpactPrompt(impactData);

  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({ schema: goalImpactSchema }),
    prompt,
  });

  return output;
};

exports.generateGoalImpactSummary = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  try {
    const impactData = await getGoalImpactData(id, activeUserId);

    if (!impactData) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    const output = await generateGoalImpactOutput(impactData);
    return res.status(200).json(output);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: 'Error generating summary.' });
  }
};

exports.exportGoalImpactPDF = async (req, res) => {
  const activeUserId = req.session.userId;
  const { id } = req.params;

  try {
    const impactData = await getGoalImpactData(id, activeUserId);

    if (!impactData) {
      return res.status(404).json({ error: 'Goal not found.' });
    }

    const {
      goal,
      goalProjects,
      goalTeams,
      goalLogs,
      goalHighlights,
    } = impactData;

    const output = await generateGoalImpactOutput(impactData);
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="goal_impact_${goal.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf"`
    );

    doc.pipe(res);

    doc.roundedRect(40, 35, 515, 95, 10).fillAndStroke('#FFF4ED', '#E84C1E');

    doc.fillColor('#E84C1E')
      .fontSize(20)
      .text('Goal Impact Report', 60, 50, { align: 'center', width: 475 });

    doc.fillColor('#444444')
      .fontSize(10)
      .text('Change.org Goal Impact Summary', 60, 80, { align: 'center', width: 475 });

    doc.fillColor('#000000').fontSize(10);
    doc.text(`Goal: ${goal.title}`, 60, 105, { width: 180 });
    doc.text(`Status: ${goal.status}`, 250, 105, { width: 120 });
    doc.text(
      `Period: ${goal.start_date ? new Date(goal.start_date).toLocaleDateString('en-US') : 'Not set'} — ${goal.end_date ? new Date(goal.end_date).toLocaleDateString('en-US') : 'Not set'}`,
      360,
      105,
      { width: 170 }
    );

    doc.y = 150;
    doc.moveDown(1.2);

    doc.fontSize(15).fillColor('#E84C1E').text('AI Goal Impact Summary', {
      align: 'center',
    });

    doc.moveDown(0.6);

    const summaryBoxY = doc.y;

    doc.roundedRect(50, summaryBoxY, 495, 85, 8).fillAndStroke('#FFF8F3', '#F1C6A8');

    doc.fillColor('#333333')
      .fontSize(10)
      .text(output.overallImpact, 65, summaryBoxY + 15, {
        width: 465,
        align: 'justify',
      });

    doc.y = summaryBoxY + 105;

    doc.fontSize(12).fillColor('#E84C1E').text('Projects Driving This Goal');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.projectsDrivingGoal.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });

    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Team Participation');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    doc.text(output.teamParticipation, { width: 470 });

    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Key Contributions');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.keyContributions.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });

    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Relevant Highlights');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.relevantHighlights.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });

    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Risks / Gaps');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.risksOrGaps.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });

    doc.moveDown(0.6);

    doc.fontSize(12).fillColor('#E84C1E').text('Recommendations');
    doc.moveDown(0.25);
    doc.fontSize(10).fillColor('#000000');
    output.recommendations.forEach((item) => {
      doc.text(`• ${item}`, { width: 470 });
    });

    doc.moveDown(0.8);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E84C1E');
    doc.moveDown(0.8);

    doc.fontSize(13).fillColor('#E84C1E').text('Goal Details');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    doc.text(`Description: ${goal.description || 'No description provided.'}`);
    doc.text(`Priority: ${goal.priority || 'Not set'}`);
    doc.text(`Status: ${goal.status || 'Not set'}`);
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Linked Projects');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');

    if (goalProjects.length === 0) {
      doc.text('No linked projects found.');
    } else {
      goalProjects.forEach((project) => {
        doc.text(`• ${project.project_name} — ${project.status}`);
      });
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Participating Teams');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');

    if (goalTeams.length === 0) {
      doc.text('No participating teams found.');
    } else {
      goalTeams.forEach((team) => {
        doc.text(`• ${team.team_name}`);
      });
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Related Highlights');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');

    if (goalHighlights.length === 0) {
      doc.text('No related highlights found.');
    } else {
      goalHighlights.forEach((highlight) => {
        doc.text(`• ${highlight.title}`);
        doc.fontSize(9).fillColor('#555555').text(
          `  ${highlight.description || 'No description provided.'}`,
          { indent: 10 }
        );
        doc.fontSize(10).fillColor('#000000');
      });
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E6E6E6');
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Contributions / Logs');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');

    if (goalLogs.length === 0) {
      doc.text('No contributions found.');
    } else {
      goalLogs.forEach((log) => {
        doc.text(`• [${new Date(log.created_at).toLocaleDateString('en-US')}] ${log.full_name}`);

        if (log.completed) {
          doc.fontSize(9).fillColor('#555555').text(
            `  Completed: ${log.completed}`,
            { indent: 10 }
          );
        }

        if (log.planned) {
          doc.fontSize(9).fillColor('#555555').text(
            `  Planned: ${log.planned}`,
            { indent: 10 }
          );
        }

        doc.fontSize(10).fillColor('#000000');
        doc.moveDown(0.3);
      });
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E84C1E');
    doc.moveDown(0.5);

    doc.fontSize(9).fillColor('#999999').text(
      `Report generated on ${new Date().toLocaleDateString('en-US')}`,
      { align: 'center' }
    );

    doc.end();
  } catch (err) {
    console.log(err);

    if (!res.headersSent) {
      return res.status(500).json({ error: 'Error generating PDF.' });
    }
  }
};