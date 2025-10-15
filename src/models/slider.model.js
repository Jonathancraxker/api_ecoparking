import { pool } from '../config/db.js';
import fs from 'fs/promises';
import path from 'path';

// Obtener todas las imágenes del slider
export const getSliderImages = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT image FROM slider ORDER BY id');
    res.status(200).json(rows); // image será tipo: /uploads/Banners/archivo.jpg
  } catch (error) {
    console.error('Error al obtener imágenes del slider:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

// Subir nueva imagen
export const uploadSliderImage = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se recibió ningún archivo' });
    }

    const imagePath = `/uploads/Banners/${req.file.filename}`;

    await connection.query('INSERT INTO slider (image) VALUES (?)', [imagePath]);

    res.status(200).json({
      message: 'Imagen subida y registrada correctamente',
      image: imagePath,
    });
  } catch (error) {
    console.error('Error al subir imagen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

// Reemplazar imagen existente
export const updateSliderImage = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { oldImage } = req.body;

    if (!req.file || !oldImage) {
      return res.status(400).json({ error: 'Faltan datos: imagen nueva o ruta antigua' });
    }

    const newImagePath = `/uploads/Banners/${req.file.filename}`;
    const oldImageFullPath = path.join('uploads', 'Banners', path.basename(oldImage));

    await connection.query(
      'UPDATE slider SET image = ? WHERE image = ?',
      [newImagePath, oldImage]
    );

    try {
      await fs.unlink(oldImageFullPath);
    } catch (fsErr) {
      console.warn('Advertencia: no se pudo eliminar el archivo anterior:', fsErr.message);
    }

    res.status(200).json({
      message: 'Imagen actualizada correctamente',
      image: newImagePath,
    });
  } catch (error) {
    console.error('Error al actualizar imagen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};

// Eliminar imagen
export const deleteSliderImage = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const { image } = req.body;

    await connection.query('DELETE FROM slider WHERE image = ?', [image]);

    const filePath = path.join('uploads', 'Banners', path.basename(image));
    try {
      await fs.unlink(filePath);
    } catch (fsErr) {
      console.warn('Advertencia: no se pudo eliminar el archivo:', fsErr.message);
    }

    res.status(200).json({ message: 'Imagen eliminada correctamente' });
  } catch (error) {
    console.error('Error al eliminar imagen:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  } finally {
    connection.release();
  }
};