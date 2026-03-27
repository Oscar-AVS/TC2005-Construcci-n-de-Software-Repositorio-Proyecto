// models/report.model.js
const db = require('../util/Db');

const getReportData = async (idEquipo, idProyecto, fechaInicio, fechaFin) => {
  // Team info
  const [team] = await db.query(
    `SELECT * FROM equipo WHERE Id_Equipo = ?`,
    [idEquipo]
  );

  // Project info
  const [project] = await db.query(
    `SELECT * FROM proyecto WHERE Id_Proyecto = ?`,
    [idProyecto]
  );

  // Team members
  const [members] = await db.query(
    `SELECT u.Id_Usuario, u.Nombre_Completo, u.Correo_Institucional
     FROM usuario u
     INNER JOIN usuario_pertenece_equipo upe ON u.Id_Usuario = upe.Id_Usuario
     WHERE upe.Id_Equipo = ?
     AND u.Estado_Activo = 1
     AND upe.Fecha_salida IS NULL`,
    [idEquipo]
  );

  // Log entries for the period
  const [logs] = await db.query(
    `SELECT b.*, u.Nombre_Completo
     FROM bitacora b
     INNER JOIN usuario u ON b.Id_Usuario = u.Id_Usuario
     WHERE b.Id_Proyecto = ?
     AND b.Fecha_Registro BETWEEN ? AND ?
     ORDER BY b.Fecha_Registro DESC`,
    [idProyecto, fechaInicio, fechaFin]
  );

  // Achievements for the period
  const [achievements] = await db.query(
    `SELECT l.*, u.Nombre_Completo
     FROM logro l
     INNER JOIN usuario u ON l.Id_Usuario = u.Id_Usuario
     INNER JOIN usuario_pertenece_equipo upe ON u.Id_Usuario = upe.Id_Usuario
     WHERE upe.Id_Equipo = ?
     AND l.Fecha_Creacion BETWEEN ? AND ?
     ORDER BY l.Fecha_Creacion DESC`,
    [idEquipo, fechaInicio, fechaFin]
  );

  // Blockers for the period
  const [blockers] = await db.query(
    `SELECT bl.*, u.Nombre_Completo
     FROM bloqueo bl
     INNER JOIN bitacora b ON bl.Id_Bitacora = b.Id_Bitacora
     INNER JOIN usuario u ON b.Id_Usuario = u.Id_Usuario
     WHERE b.Id_Proyecto = ?
     AND b.Fecha_Registro BETWEEN ? AND ?
     ORDER BY b.Fecha_Registro DESC`,
    [idProyecto, fechaInicio, fechaFin]
  );

  // Project goals
  const [goals] = await db.query(
    `SELECT m.*
     FROM meta m
     INNER JOIN proyecto p ON m.Id_Proyecto = p.Id_Proyecto
     WHERE m.Id_Proyecto = ?`,
    [idProyecto]
  );

  return {
    equipo: team[0] || null,
    proyecto: project[0] || null,
    miembros: members,
    bitacoras: logs,
    logros: achievements,
    bloqueos: blockers,
    metas: goals
  };
};

module.exports = { getReportData };