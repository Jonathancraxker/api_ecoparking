import { pool } from '../config/db.js'
import { randomUUID } from "crypto"

export const getRegistrosCitas = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // 1. Obtener TODAS las citas (como ya lo hacías)
        const [citas] = await connection.query("SELECT * FROM registro_citas ORDER BY id DESC");

        if (citas.length === 0) {
            return res.status(200).json([]); // No hay citas, devuelve array vacío
        }

        // 2. Obtener los IDs de todas esas citas
        const citaIds = citas.map(cita => cita.id);

        // 3. Obtener TODOS los tokens de QR que coincidan con esos IDs
        //    Usamos 'IN (?)' para buscar en un array de IDs
        const [tokens] = await connection.query(
            "SELECT id_cita, token FROM codigo_qr WHERE id_cita IN (?)",
            [citaIds] 
        );

        // 4. Mapear y combinar los datos
        const citasConQr = citas.map(cita => {
            // Encontrar el token para esta cita específica
            const qrRecord = tokens.find(t => t.id_cita === cita.id);
            const qrToken = qrRecord ? qrRecord.token : null;

            // Construir la URL de validación completa
            const url_validacion = qrToken
                ? `https://ecoparking-api-prod.onrender.com/ecoparking/qr/validar/${qrToken}`
                : null; // Si no tiene token, la URL es null

                // Producción:
                // `https://ecoparking-api-prod.onrender.com/ecoparking/qr/validar/${qrToken}`

            // Devolver el objeto de la cita original, más el nuevo campo
            return {
                ...cita,
                url_validacion: url_validacion 
            };
        });

        // 5. Devolver el nuevo array de citas combinadas
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
        console.log("Parametros recibidos:", req.params);

        const { id } = req.params;
        console.log("ID recibido:", id);

        const [rows] = await connection.query("SELECT * FROM Registro_citas WHERE id = ?",  [id]);
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
        // 1. Obtenemos el ID del usuario del token (gracias a authToken)
        const id_usuario = req.user.id; 

        // 2. Buscamos solo las citas de ESE usuario
        const [citas] = await connection.query(
            "SELECT * FROM registro_citas WHERE id_usuario = ? ORDER BY id DESC", 
            [id_usuario]
        );

        if (citas.length === 0) {
            return res.json([]); // Devuelve array vacío si no tiene citas
        }

        // 3. Buscamos los tokens de QR para esas citas
        const citaIds = citas.map(c => c.id);
        const [tokens] = await connection.query(
            "SELECT id_cita, token FROM codigo_qr WHERE id_cita IN (?)",
            [citaIds]
        );
        
        // 4. Unimos los datos
        const citasConQr = citas.map(cita => {
            const qrToken = tokens.find(t => t.id_cita === cita.id)?.token;
            return {
                ...cita,
                // Construimos la URL de validación que el frontend necesita
                url_validacion: qrToken 
                    ? `https://ecoparking-api-prod.onrender.com/ecoparking/qr/validar/${qrToken}`
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
            // NOTA: Ya no extraemos 'id_cajon' de req.body, ahora viene dentro de cada invitado
            const { fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, invitados } = req.body;

            if (fecha_inicio !== fecha_fin) {
                return res.status(400).json({ 
                    message: "La universidad no cuenta con estacionamiento 24/7. La cita debe iniciar y terminar el mismo día." 
                });
            }

            await connection.beginTransaction();

            // 1. Insertar Cita (sin cajón)
            const sqlCita = "INSERT INTO registro_citas (fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
            const [resultCita] = await connection.query(sqlCita, [fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id_usuario]);
            const id_cita_nueva = resultCita.insertId;

            // 2. Generar QR
            const tokenQR = randomUUID(); 
            await connection.query("INSERT INTO codigo_qr (token, id_cita) VALUES (?, ?)", [tokenQR, id_cita_nueva]);

            // 3. Insertar Invitados y Ocupar sus Cajones
            if (invitados && invitados.length > 0) {
                const sqlInvitado = "INSERT INTO invitados (nombre, correo, empresa, tipo_visitante, matricula, id_cajon, id_cita) VALUES (?, ?, ?, ?, ?, ?, ?)";
                
                for (const inv of invitados) {
                    // Si el invitado trae cajón, se lo asignamos. Si no (llegó a pie), pasamos null
                    const cajonAsignado = inv.id_cajon ? inv.id_cajon : null;
                    
                    await connection.query(sqlInvitado, [inv.nombre, inv.correo, inv.empresa, inv.tipo_visitante, inv.matricula, cajonAsignado, id_cita_nueva]);
                    
                    // Cambiamos el estado de ese cajón específico a 'Ocupado'
                    if (cajonAsignado) {
                        await connection.query("UPDATE cajones SET estado = 'Ocupado' WHERE id = ?", [cajonAsignado]);
                    }
                }
            }

            await connection.commit();
            res.status(201).json({ message: "Cita creada y cajones apartados", id_cita: id_cita_nueva });

        } catch (error) {
            await connection.rollback();
            res.status(500).json({ message: "Error al registrar la cita" });
        } finally {
            connection.release();
        }
    };

    export const updateCitaById = async (req, res) => {
        const connection = await pool.getConnection();

        try {
            const { id } = req.params; 
            // 🟢 1. Ya no extraemos id_cajon de req.body
            let { fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados } = req.body;

            // 🟢 2. Quitamos !id_cajon de la validación
            if (!fecha_inicio || !fecha_fin || !hora_inicio || !hora_fin || !motivo || !estado_cita) {
                return res.status(400).json({ message: "Por favor, proporciona todos los campos necesarios" });
            }

            const numInvitados = Number(numero_invitados) || 0; 
            const citaId = Number(id);

            // 🟢 3. Quitamos id_cajon = ? de la consulta SQL
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

            // 🟢 1. Obtener TODOS los cajones ocupados por los INVITADOS de esta cita
            const [invitados] = await connection.query("SELECT id_cajon FROM invitados WHERE id_cita = ? AND id_cajon IS NOT NULL", [id]);
            
            // 🟢 2. Liberar todos los cajones iterando sobre ellos
            for (let inv of invitados) {
                await connection.query("UPDATE cajones SET estado = 'Disponible' WHERE id = ?", [inv.id_cajon]);
            }

            // 🟢 3. Borrar en orden para evitar errores de llaves foráneas (Relaciones)
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