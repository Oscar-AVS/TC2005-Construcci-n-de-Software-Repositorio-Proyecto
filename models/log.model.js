// models/log.model.js
const db = require('../util/Db');

const registerAction = async (idProyecto, idUsuario, accion) => {
  await db.query(
    `INSERT INTO bitacora 
      (Id_Proyecto, Id_Usuario, Avance_Realizado, Fecha_Registro)
     VALUES (?, ?, ?, CURDATE())`,
    [idProyecto, idUsuario, accion]
  );
};

module.exports = { registerAction };