// controllers/report.controller.js
const PDFDocument = require('pdfkit');
const { generateText, Output } = require('ai');
const { openai } = require('@ai-sdk/openai');
const { z } = require('zod');
const { getAiSummaryData, getReportData } = require('../models/report.model');

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
1. A one-paragraph overall assessment
2. Exactly 3 highlights
3. Critical risks
4. 2-3 recommendations
  `.trim();

  const summarySchema = z.object({
    overallAssessment: z.string(),
    highlights: z.array(z.string()).length(3),
    risks: z.array(z.string()),
    recommendations: z.array(z.string()).min(2).max(3),
  });

  const { output } = await generateText({
    model: openai('gpt-4o-mini'),
    output: Output.object({ schema: summarySchema }),
    prompt,
  });

  return output;
}

// ================= EXPORT PDF =================
const exportPDF = async (req, res) => {
  const { idEquipo, idProyecto, fechaInicio, fechaFin } = req.query;

  if (!idEquipo || !idProyecto || !fechaInicio || !fechaFin) {
    return res.status(400).json({
      error: 'Missing parameters'
    });
  }

  let data;
  try {
    data = await getReportData(idEquipo, idProyecto, fechaInicio, fechaFin);
  } catch (err) {
    console.error('Error fetching report data:', err);
    return res.status(500).json({ error: 'Error fetching data' });
  }

  if (!data.equipo || !data.proyecto) {
    return res.status(404).json({
      error: 'No data available'
    });
  }

  let aiSummary;
  try {
    aiSummary = await buildAiSummary(data, fechaInicio, fechaFin);
  } catch (err) {
    console.error('Error generating AI summary:', err);
    aiSummary = {
      overallAssessment: 'AI summary unavailable.',
      highlights: ['No data'],
      risks: ['No data'],
      recommendations: ['Try again later'],
    };
  }

  try {
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="report_${data.equipo.team_name}.pdf"`
    );

    doc.pipe(res);

    doc.fontSize(18).text('AI Executive Summary', { align: 'center' });
    doc.moveDown();

    doc.fontSize(10).text(aiSummary.overallAssessment);
    doc.moveDown();

    doc.text('Highlights');
    aiSummary.highlights.forEach((h) => doc.text(`• ${h}`));

    doc.moveDown();
    doc.text('Risks');
    aiSummary.risks.forEach((r) => doc.text(`• ${r}`));

    doc.moveDown();
    doc.text('Recommendations');
    aiSummary.recommendations.forEach((rec) => doc.text(`• ${rec}`));

    doc.end();
  } catch (err) {
    console.error('Error generating PDF:', err);
    return res.status(500).json({ error: 'Error generating PDF' });
  }
};

// ================= AI SUMMARY =================
const generateAiSummary = async (req, res) => {
  const { idEquipo, idProyecto, fechaInicio, fechaFin } = req.query;

  if (!idEquipo || !idProyecto || !fechaInicio || !fechaFin) {
    return res.status(400).json({
      error: 'Missing parameters',
    });
  }

  let data;
  try {
    data = await getAiSummaryData(idEquipo, idProyecto, fechaInicio, fechaFin);
  } catch (err) {
    console.error('Error fetching data:', err);
    return res.status(500).json({ error: 'Error fetching data' });
  }

  let summary;
  try {
    summary = await buildAiSummary(data, fechaInicio, fechaFin);
  } catch (err) {
    console.error('AI error:', err);
    return res.status(500).json({ error: 'AI error' });
  }

  return res.json({ summary });
};

module.exports = { exportPDF, generateAiSummary };