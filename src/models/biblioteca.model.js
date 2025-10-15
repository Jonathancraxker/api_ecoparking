import { pool } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';

// Obtener registros (con filtro)
export const getBiblioteca = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const tipo = req.query.tipo;
    const query = tipo
      ? "SELECT * FROM biblioteca WHERE tipo = ? ORDER BY fecha ASC"
      : "SELECT * FROM biblioteca ORDER BY fecha ASC";
    const [rows] = await connection.query(query, tipo ? [tipo] : []);
    res.status(200).json(rows);
  } catch (error) {
    console.error("Error al obtener registros de biblioteca:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

// Registrar nuevo elemento
export const registrarLibro = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { nombre, autor, descripcion, tipo, categoria } = req.body;
    const archivo_pdf = req.files?.archivo_pdf?.[0]?.filename || null;
    const imagen = req.files?.imagen?.[0]?.filename || null;

    const [result] = await connection.query(
      "INSERT INTO biblioteca (nombre, autor, descripcion, tipo, categoria, archivo_pdf, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [nombre, autor, descripcion, tipo, tipo === 'pdf' ? categoria : null, archivo_pdf, imagen]
    );

    res.status(201).json({
      message: "Elemento registrado exitosamente",
      id: result.insertId
    });
  } catch (error) {
    console.error("Error al registrar elemento:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

// Actualizar elemento existente
export const updateLibro = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;
    const { nombre, autor, descripcion, tipo, categoria } = req.body;
    const archivo_pdf = req.files?.archivo_pdf?.[0]?.filename || null;
    const imagen = req.files?.imagen?.[0]?.filename || null;

    // Obtener los datos actuales para conservar archivos si no se actualizan
    const [prev] = await connection.query("SELECT * FROM biblioteca WHERE id = ?", [id]);
    if (prev.length === 0) return res.status(404).json({ message: "Elemento no encontrado" });

    const [result] = await connection.query(
      "UPDATE biblioteca SET nombre = ?, autor = ?, descripcion = ?, tipo = ?, categoria = ?, archivo_pdf = ?, imagen = ? WHERE id = ?",
      [
        nombre,
        autor,
        descripcion,
        tipo,
        tipo === 'pdf' ? categoria : null,
        archivo_pdf || prev[0].archivo_pdf,
        imagen || prev[0].imagen,
        id
      ]
    );

    res.status(200).json({ message: "Elemento actualizado exitosamente" });
  } catch (error) {
    console.error("Error al actualizar elemento:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};

// Eliminar elemento y archivos asociados
export const deleteLibro = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { id } = req.params;

    // Obtener los archivos para eliminarlos físicamente
    const [rows] = await connection.query("SELECT archivo_pdf, imagen FROM biblioteca WHERE id = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ message: "Elemento no encontrado" });
    }

    const { archivo_pdf, imagen } = rows[0];
    const uploadsDir = path.resolve("uploads/biblioteca");

    if (archivo_pdf) {
      const pdfPath = path.join(uploadsDir, archivo_pdf);
      try {
        await fs.unlink(pdfPath);
      } catch (err) {
        console.warn("No se pudo eliminar el archivo PDF:", pdfPath);
      }
    }

    if (imagen) {
      const imgPath = path.join(uploadsDir, imagen);
      try {
        await fs.unlink(imgPath);
      } catch (err) {
        console.warn("No se pudo eliminar la imagen:", imgPath);
      }
    }

    await connection.query("DELETE FROM biblioteca WHERE id = ?", [id]);

    res.status(200).json({ message: "Elemento eliminado exitosamente" });
  } catch (error) {
    console.error("Error al eliminar elemento:", error);
    res.status(500).json({ message: "Error interno del servidor" });
  } finally {
    connection.release();
  }
};
