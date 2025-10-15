import { pool } from '../config/db.js';

/**
 * GET /usuarios-comisiones
 * Devuelve todos los usuarios con sus comisiones asignadas.
 */
export const getUsuariosConComisiones = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query(`
      SELECT
        u.id,
        u.correo,
        u.nombre,
        u.apellidos,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'id_comision', c.id_comision,
            'comision', c.comision,
            'descripcion', c.descripcion
          )
        ) AS comisiones
      FROM usuarios u
      LEFT JOIN comisiones_usuarios cu ON cu.id_usuario = u.id
      LEFT JOIN comisiones c ON c.id_comision = cu.id_comision
      GROUP BY u.id
    `);

    const result = rows.map(row => {
      if (typeof row.comisiones === 'string') {
        try {
          row.comisiones = JSON.parse(row.comisiones);
        } catch {
          row.comisiones = [];
        }
      }
      return {
        ...row,
        comisiones: Array.isArray(row.comisiones)
          ? row.comisiones.filter(c => c.id_comision !== null)
          : []
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error("Error al obtener usuarios con comisiones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

/**
 * PUT /usuarios/:idUsuario/comisiones
 * Asigna un arreglo de comisiones a un usuario
 * Body: { comisiones: [1, 2, 3] }
 */
export const setComisionesUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { idUsuario } = req.params;
    const { comisiones } = req.body;

    if (!Array.isArray(comisiones)) {
      return res.status(400).json({ message: "El cuerpo de la solicitud debe ser un arreglo de comisiones." });
    }

    await connection.beginTransaction();

    // Limpiar comisiones anteriores
    await connection.query(
      "DELETE FROM comisiones_usuarios WHERE id_usuario = ?",
      [idUsuario]
    );

    // Insertar nuevas comisiones
    for (const id_comision of comisiones) {
      await connection.query(
        "INSERT INTO comisiones_usuarios (id_usuario, id_comision) VALUES (?, ?)",
        [idUsuario, id_comision]
      );
    }

    await connection.commit();
    res.status(200).json({ message: "Comisiones asignadas correctamente" });
  } catch (error) {
    await connection.rollback();
    console.error("Error al asignar comisiones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};
