import { pool } from '../config/db.js';


/**
 * GET /usuarios-especialidades
 * Devuelve todos los usuarios con sus especialidades asignadas.
 * Se usa del lado del frontend.
 */
export const getUsuariosConEspecialidades = async (req, res) => {
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
            'id_especialidad', te.id,
            'especialidad', te.especialidad,
            'descripcion', te.descripcion
          )
        ) AS especialidades
      FROM usuarios u
      LEFT JOIN especialidades_usuario eu   ON eu.id_usuario = u.id
      LEFT JOIN tipos_especialidades te     ON te.id = eu.id_tipo_especialidad
      GROUP BY u.id
    `);

    // Limpieza del campo JSON en cada fila
    const result = rows.map(row => {
      if (typeof row.especialidades === 'string') {
        try {
          row.especialidades = JSON.parse(row.especialidades);
        } catch {
          row.especialidades = [];
        }
      }
      return {
        ...row,
        // Filtra nulos (cuando el usuario aún no tiene especialidad)
        especialidades: Array.isArray(row.especialidades)
          ? row.especialidades.filter(e => e.id_especialidad !== null)
          : []
      };
    });

    res.status(200).json(result);
  } catch (error) {
    console.error('Error al obtener usuarios con especialidades:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

/**
 * PUT /usuarios/:idUsuario/especialidades
 * Body: { especialidad: 1 }
 * Asigna o actualiza **UNA** sola especialidad a un usuario.
 */
export const setEspecialidadesUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { idUsuario } = req.params;
    const { especialidad } = req.body;

    // Validar parámetro
    if (!especialidad || isNaN(especialidad)) {
      return res.status(400).json({ message: 'Especialidad inválida.' });
    }

    await connection.beginTransaction();

    // Limpiar cualquier especialidad previa del usuario
    await connection.query(
      'DELETE FROM especialidades_usuario WHERE id_usuario = ?',
      [idUsuario]
    );

    // Insertar la nueva especialidad
    await connection.query(
      'INSERT INTO especialidades_usuario (id_usuario, id_tipo_especialidad) VALUES (?, ?)',
      [idUsuario, especialidad]
    );

    await connection.commit();
    res.status(200).json({ message: 'Especialidad asignada correctamente' });
  } catch (error) {
    await connection.rollback();
    console.error('Error al asignar especialidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

/**
 * DELETE /usuarios/:idUsuario/especialidades/:idEspecialidad
 * Elimina una especialidad concreta de un usuario.
 */
export const deleteEspecialidadDeUsuario = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { idUsuario, idEspecialidad } = req.params;

    const [result] = await connection.query(
      'DELETE FROM especialidades_usuario WHERE id_usuario = ? AND id_tipo_especialidad = ?',
      [idUsuario, idEspecialidad]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Especialidad no encontrada para este usuario' });
    }

    res.status(200).json({ message: 'Especialidad eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar especialidad:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};
