import { pool } from '../config/db.js'
import { randomUUID } from "crypto"

export const getRegistrosCitas = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [citas] = await connection.query(`
            SELECT rc.*, 
                   GROUP_CONCAT(DISTINCT c.numero_cajon SEPARATOR ', ') AS cajones_asignados
            FROM registro_citas rc
            LEFT JOIN invitados i ON rc.id = i.id_cita
            LEFT JOIN cajones c ON i.id_cajon = c.id
            GROUP BY rc.id
            ORDER BY rc.id DESC
        `);

        if (citas.length === 0) {
            return res.status(200).json([]); 
        }

        const citaIds = citas.map(cita => cita.id);

        const [tokens] = await connection.query(
            "SELECT id_cita, token FROM codigo_qr WHERE id_cita IN (?)",
            [citaIds] 
        );

        const citasConQr = citas.map(cita => {
            const qrRecord = tokens.find(t => t.id_cita === cita.id);
            const qrToken = qrRecord ? qrRecord.token : null;

            const url_validacion = qrToken
                ? `http://localhost:4000/ecoparking/qr/validar/${qrToken}`
                : null; 

            return {
                ...cita,
                url_validacion: url_validacion 
            };
        });

        res.status(200).json(citasConQr);

    } catch (error) {
        console.error("Error al obtener las citas:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const getCitasId = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        const [rows] = await connection.query(`
            SELECT rc.*, 
                   GROUP_CONCAT(DISTINCT c.numero_cajon SEPARATOR ', ') AS cajones_asignados
            FROM registro_citas rc
            LEFT JOIN invitados i ON rc.id = i.id_cita
            LEFT JOIN cajones c ON i.id_cajon = c.id
            WHERE rc.id = ?
            GROUP BY rc.id
        `, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error al obtener cita:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const getMisCitas = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const id_usuario = req.user.id; 

        const [citas] = await connection.query(`
            SELECT rc.*, 
                   GROUP_CONCAT(DISTINCT c.numero_cajon SEPARATOR ', ') AS cajones_asignados
            FROM registro_citas rc
            LEFT JOIN invitados i ON rc.id = i.id_cita
            LEFT JOIN cajones c ON i.id_cajon = c.id
            WHERE rc.id_usuario = ?
            GROUP BY rc.id
            ORDER BY rc.id DESC
        `, [id_usuario]);

        if (citas.length === 0) {
            return res.json([]); 
        }

        const citaIds = citas.map(c => c.id);
        const [tokens] = await connection.query(
            "SELECT id_cita, token FROM codigo_qr WHERE id_cita IN (?)",
            [citaIds]
        );
        
        const citasConQr = citas.map(cita => {
            const qrToken = tokens.find(t => t.id_cita === cita.id)?.token;
            return {
                ...cita,
                url_validacion: qrToken 
                    ? `http://localhost:4000/ecoparking/qr/validar/${qrToken}`
                    : null
            };
        });

        res.status(200).json(citasConQr);

    } catch (error) {
        console.error("Error al obtener mis citas:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const registrarCita = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const id_usuario = req.user.id;
        const { fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, invitados } = req.body;

        if (fecha_inicio !== fecha_fin) {
            return res.status(400).json({ 
                message: "La universidad no cuenta con estacionamiento 24/7. La cita debe iniciar y terminar el mismo día." 
            });
        }

        await connection.beginTransaction();

        // 1. Insertar Cita
        const sqlCita = "INSERT INTO registro_citas (fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        const [resultCita] = await connection.query(sqlCita, [fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id_usuario]);
        const id_cita_nueva = resultCita.insertId;

        // 2. Generar QR
        const tokenQR = randomUUID(); 
        await connection.query("INSERT INTO codigo_qr (token, id_cita) VALUES (?, ?)", [tokenQR, id_cita_nueva]);

        // 3. Insertar Invitados y Ocupar sus Cajones
        if (invitados && invitados.length > 0) {
            const sqlInvitado = "INSERT INTO invitados (nombre, correo, empresa, tipo_visitante, matricula, id_cajon, id_cita, tipo_acompanante) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            
            for (const inv of invitados) {
                await connection.query(sqlInvitado, [
                    inv.nombre, 
                    inv.correo, 
                    inv.empresa, 
                    inv.tipo_visitante, 
                    inv.matricula, 
                    inv.id_cajon || null, 
                    id_cita_nueva, 
                    inv.tipo_acompanante
                ]);
                
                // Si el invitado trae un id_cajon, lo marcamos como ocupado
                if (inv.id_cajon) {
                    await connection.query("UPDATE cajones SET estado = 'Ocupado' WHERE id = ?", [inv.id_cajon]);
                }
            }
        }

        await connection.commit();
        res.status(201).json({ message: "Cita creada y cajones apartados", id_cita: id_cita_nueva });

    } catch (error) {
        await connection.rollback();
        console.error("Error al registrar la cita:", error);
        res.status(500).json({ message: "Error al registrar la cita" });
    } finally {
        connection.release();
    }
};

export const updateCitaById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; 
        let { fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados } = req.body;

        if (!fecha_inicio || !fecha_fin || !hora_inicio || !hora_fin || !motivo || !estado_cita) {
            return res.status(400).json({ message: "Por favor, proporciona todos los campos necesarios" });
        }

        const numInvitados = Number(numero_invitados) || 0; 
        const citaId = Number(id);

        const [result] = await connection.query(
            `UPDATE registro_citas SET fecha_inicio = ?, fecha_fin = ?, hora_inicio = ?, hora_fin = ?, motivo = ?, estado_cita = ?, numero_invitados = ? WHERE id = ?`,
            [fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numInvitados, citaId]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        res.status(200).json({ message: "Cita actualizada exitosamente" });

    } catch (error) {
        console.error("Error crítico en updateCitaById:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const deleteCitaById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        await connection.beginTransaction();

        // 1. Obtener TODOS los cajones ocupados por los INVITADOS de esta cita
        const [invitados] = await connection.query("SELECT id_cajon FROM invitados WHERE id_cita = ? AND id_cajon IS NOT NULL", [id]);
        
        // 2. Liberar todos los cajones iterando sobre ellos
        for (let inv of invitados) {
            await connection.query("UPDATE cajones SET estado = 'Disponible' WHERE id = ?", [inv.id_cajon]);
        }

        // 3. Borrar en orden para evitar errores de llaves foráneas
        await connection.query("DELETE FROM invitados WHERE id_cita = ?", [id]);
        await connection.query("DELETE FROM codigo_qr WHERE id_cita = ?", [id]);
        await connection.query("DELETE FROM registro_citas WHERE id = ?", [id]);

        await connection.commit();
        res.status(200).json({ message: "Cita eliminada y cajones liberados" });

    } catch (error) {
        await connection.rollback();
        console.error("Error al eliminar:", error);
        res.status(500).json({ message: "Error al eliminar" });
    } finally {
        connection.release();
    }
};