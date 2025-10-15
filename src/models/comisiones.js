// controllers/comisionesController.js
import { pool } from '../config/db.js';

// Obtener todas las comisiones
export const getComisiones = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query("SELECT * FROM comisiones ORDER BY id_comision ASC");
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener comisiones:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

// Agregar comisión
export const createComision = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { comision, descripcion } = req.body;
    if (!comision) return res.status(400).json({ message: "El nombre de la comisión es obligatorio" });

    await connection.query("INSERT INTO comisiones (comision, descripcion) VALUES (?, ?)", [comision, descripcion]);
    res.status(201).json({ message: "Comisión registrada correctamente" });
  } catch (error) {
    console.error("Error al agregar comisión:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

// Actualizar comisión
export const updateComision = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_comision } = req.params;
    const { comision, descripcion } = req.body;
    await connection.query(
      "UPDATE comisiones SET comision = ?, descripcion = ? WHERE id_comision = ?",
      [comision, descripcion, id_comision]
    );
    res.status(200).json({ message: "Comisión actualizada correctamente" });
  } catch (error) {
    console.error("Error al actualizar comisión:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

// Eliminar comisión
export const deleteComision = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id_comision } = req.params;
    await connection.query("DELETE FROM comisiones WHERE id_comision = ?", [id_comision]);
    res.status(200).json({ message: "Comisión eliminada correctamente" });
  } catch (error) {
    console.error("Error al eliminar comisión:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};
