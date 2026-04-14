// controllers/report.controller.js
const PDFDocument = require('pdfkit');
console.log('API KEY:', process.env.OPENAI_API_KEY);
const { generateText, Output } = require('ai');
const { openai } = require('@ai-sdk/openai');
const { z } = require('zod');
const { getAiSummaryData } = require('../models/Report.model');
const { getReportData } = require('../models/Report.model');

const HARDCODED_MANAGER = {
  Id_Usuario: 1,
  Nombre_Completo: 'Francisco Rafael Arreola Corona',
  rol: 'manager'
};

async function buildAiSummary(data, fechaInicio, fechaFin) {
  const logsText = data.bitacoras
    .map((b) => `- [${new Date(b.created_at).toLocaleDateString('en-US')}] ${b.full_name}: completed "${b.completed}" / planned "${b.planned}"`)
    .join('\n') || 'No log entries.';

  const achievementsText = data.logros
    .map((l) => `- [${l.created_at}] ${l.full_name}: ${l.description}`)
    .join('\n') || 'No achievements.';

  const blockersText = data.bloqueos
    .map((b) => `- ${b.full_name}: ${b.description} [${b.resolution_status || 'unresolved'}]`)
    .join('\n') || 'No blockers.';

  const goalsText = data.metas
    .map((g) => `- ${g.goal_name}: ${g.description || 'no description'}`)
    .join('\n') || 'No goals defined.';

  const prompt = `
You are a senior product manager assistant at Change.org.
Analyze the following team data and generate a concise executive summary.

TEAM: ${data.equipo.team_name}
PROJECT: ${data.proyecto.project_name}
PERIOD: ${fechaInicio} to ${fechaFin}
MEMBERS: ${data.miembros.map((m) => m.full_name).join(', ') || 'none'}

LOG ENTRIES:
${logsText}

ACHIEVEMENTS:
${achievementsText}

BLOCKERS:
${blockersText}

PROJECT GOALS:
${goalsText}

Generate a structured summary with:
1. A one-paragraph overall assessment of the team progress
2. Exactly 3 highlights from this period
3. The most critical risks or blockers found
4. Between 2 and 3 concrete recommendations for the manager
Keep each section concise and actionable.
  `.trim();

  const summarySchema = z.object({
    overallAssessment: z.string().describe('One paragraph summary of overall team progress'),
    highlights: z.array(z.string()).length(3).describe('Top 3 highlights of the period'),
    risks: z.array(z.string()).describe('Critical risks or unresolved blockers'),
    recommendations: z.array(z.string()).min(2).max(3).describe('Actionable recommendations for the manager'),
  });

  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({ schema: summarySchema }),
    prompt,
  });

  return output;
}


const exportPDF = async (req, res) => {
  const { idEquipo, idProyecto, fechaInicio, fechaFin } = req.query;

  if (!idEquipo || !idProyecto || !fechaInicio || !fechaFin) {
    return res.status(400).json({
      error: 'Missing parameters: idEquipo, idProyecto, fechaInicio, fechaFin'
    });
  }

  let data;
  try {
    data = await getReportData(idEquipo, idProyecto, fechaInicio, fechaFin);
  } catch (err) {
    console.error('Error fetching report data:', err);
    return res.status(500).json({ error: 'Error fetching report data.' });
  }

  if (!data.equipo || !data.proyecto) {
    return res.status(404).json({
      error: 'No data available to generate the report.'
    });
  }
    let aiSummary;
  try {
    aiSummary = await buildAiSummary(data, fechaInicio, fechaFin);
  } catch (err) {
    console.error('Error generating AI summary for PDF:', err);
    aiSummary = {
      overallAssessment: 'AI summary could not be generated for this report.',
      highlights: ['No summary available.'],
      risks: ['No summary available.'],
      recommendations: ['Please try again later.'],
    };
  }

  try {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report_${data.equipo.team_name}_${fechaInicio}_${fechaFin}.pdf"`
    );

    doc.pipe(res);

        doc.roundedRect(40, 35, 515, 95, 10).fillAndStroke('#FFF4ED', '#E84C1E');

    doc.fillColor('#E84C1E')
      .fontSize(22)
      .text('Weekly Report', 60, 50, { align: 'center', width: 475 });

    doc.fillColor('#444444')
      .fontSize(11)
      .text('Change.org Team Performance Report', 60, 80, { align: 'center', width: 475 });

    doc.fillColor('#000000')
      .fontSize(10)
      .text(`Team: ${data.equipo.team_name}`, 60, 105)
      .text(`Project: ${data.proyecto.project_name}`, 220, 105)
      .text(`Period: ${fechaInicio} — ${fechaFin}`, 380, 105);

    doc.moveDown(4.5);
    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E84C1E');
    doc.moveDown();

        doc.fontSize(15).fillColor('#E84C1E').text('AI Executive Summary');
    doc.moveDown(0.4);

    doc.roundedRect(50, doc.y, 495, 90, 8).fillAndStroke('#FFF4ED', '#F4B183');
    doc.fillColor('#333333')
      .fontSize(10)
      .text(aiSummary.overallAssessment, 65, doc.y - 82, {
        width: 465,
        align: 'justify',
      });

    doc.moveDown(5.5);

    doc.fontSize(12).fillColor('#E84C1E').text('Key Highlights');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    aiSummary.highlights.forEach((item) => {
      doc.text(`• ${item}`);
    });
    doc.moveDown();

    doc.fontSize(12).fillColor('#E84C1E').text('Critical Risks');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    aiSummary.risks.forEach((item) => {
      doc.text(`• ${item}`);
    });
    doc.moveDown();

    doc.fontSize(12).fillColor('#E84C1E').text('Recommendations');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    aiSummary.recommendations.forEach((item) => {
      doc.text(`• ${item}`);
    });
    doc.moveDown();

    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E84C1E');
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('General Metrics');
    doc.moveDown(0.4);

    doc.fontSize(10).fillColor('#000000');
    doc.text(`Total active members: ${data.miembros.length}`);
    doc.text(`Total log entries: ${data.bitacoras.length}`);
    doc.text(`Total achievements recorded: ${data.logros.length}`);
    doc.text(`Total active blockers: ${data.bloqueos.length}`);
    doc.text(`Total project goals: ${data.metas.length}`);
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Team Members');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    if (data.miembros.length === 0) {
      doc.text('No members registered in this team.');
    } else {
      data.miembros.forEach((m) => {
        doc.text(`• ${m.full_name} — ${m.email}`);
      });
    }
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Achievements');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    if (data.logros.length === 0) {
      doc.text('No achievements recorded in this period.');
    } else {
      data.logros.forEach((l) => {
        doc.text(`• [${l.created_at}] ${l.full_name}: ${l.description}`);
      });
    }
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Current Blockers');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    if (data.bloqueos.length === 0) {
      doc.text('No blockers recorded in this period.');
    } else {
      data.bloqueos.forEach((b) => {
        doc.text(`• ${b.full_name} — ${b.description} [${b.resolution_status || 'No status'}]`);
      });
    }
    doc.moveDown(); 

    doc.fontSize(13).fillColor('#E84C1E').text('Project Goals');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    if (data.metas.length === 0) {
      doc.text('No goals registered for this project.');
    } else {
      data.metas.forEach((m) => {
        doc.text(`• ${m.goal_name}`);
        if (m.description) {
          doc.fontSize(9).fillColor('#555555').text(`  ${m.description}`, { indent: 10 });
          doc.fontSize(10).fillColor('#000000');
        }
      });
    }
    doc.moveDown();

    doc.fontSize(13).fillColor('#E84C1E').text('Log Entries');
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#000000');
    if (data.bitacoras.length === 0) {
      doc.text('No log entries in this period.');
    } else {
      data.bitacoras.forEach((b) => {
        doc.text(`• [${new Date(b.created_at).toLocaleDateString('en-US')}] ${b.full_name}`);
        if (b.completed) {
          doc.fontSize(9).fillColor('#555555').text(`  Completed: ${b.completed}`, { indent: 10 });
        }
        if (b.planned) {
          doc.fontSize(9).fillColor('#555555').text(`  Planned: ${b.planned}`, { indent: 10 });
        }
        doc.fontSize(10).fillColor('#000000');
        doc.moveDown(0.3);
      });
    }

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke('#E84C1E');
    doc.moveDown(0.5);
    doc.fontSize(9).fillColor('#999999').text(`Report generated on ${new Date().toLocaleDateString('en-US')}`, { align: 'center' });

    doc.end();

  } catch (err) {
    console.error('Error generating PDF:', err);
    if (!res.headersSent) {
      return res.status(500).json({ error: 'Error generating PDF file.' });
    }
  }
};

/* Generates an AI-powered summary for a given team and period. */
const generateAiSummary = async (req, res) => {
  const { idEquipo, idProyecto, fechaInicio, fechaFin } = req.query;

  if (!idEquipo || !idProyecto || !fechaInicio || !fechaFin) {
    return res.status(400).json({
      error: 'Missing parameters: idEquipo, idProyecto, fechaInicio, fechaFin',
    });
  }

  let data;
  try {
    data = await getAiSummaryData(idEquipo, idProyecto, fechaInicio, fechaFin);
  } catch (err) {
    console.error('Error fetching data for AI summary:', err);
    return res.status(500).json({ error: 'Error fetching report data.' });
  }

  if (!data.equipo || !data.proyecto) {
    return res.status(404).json({ error: 'No data available to generate the summary.' });
  }

  let summary;
  try {
    summary = await buildAiSummary(data, fechaInicio, fechaFin);
  } catch (err) {
    console.error('Error calling AI model:', err);
    return res.status(500).json({ error: 'Error generating AI summary.' });
  }

  return res.status(200).json({
    team: data.equipo.team_name,
    project: data.proyecto.project_name,
    period: { from: fechaInicio, to: fechaFin },
    generatedBy: HARDCODED_MANAGER.Nombre_Completo,
    generatedAt: new Date().toISOString(),
    summary,
  });
};
module.exports = { exportPDF, generateAiSummary };