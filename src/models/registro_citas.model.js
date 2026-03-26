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
                ? `http://localhost:4000/ecoparking/qr/validar/${qrToken}`
                : null; // Si no tiene token, la URL es null

                // Producción:
                // `https://ecoparking-api.onrender.com/ecoparking/qr/validar/${qrToken}`

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
                    ? `http://localhost:4000/ecoparking/qr/validar/${qrToken}` 
                    : null
                    // `https://ecoparking-api.onrender.com/ecoparking/qr/validar/${qrToken}`
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
        const { fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, invitados, id_cajon } = req.body;

        // Validamos que el id_cajon venga en la petición
        if (!id_cajon) return res.status(400).json({ message: "Debes seleccionar un cajón" });

        await connection.beginTransaction();

        // 1. Insertar Cita vinculada al cajón
        const sqlCita = `INSERT INTO registro_citas (fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id_usuario, id_cajon) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
        const [resultCita] = await connection.query(sqlCita, [fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id_usuario, id_cajon]);
        
        const id_cita_nueva = resultCita.insertId;

        // 2. Cambiar estado del cajón a 'Ocupado'
        // await connection.query("UPDATE cajones SET estado = 'Ocupado' WHERE id = ?", [id_cajon]);

        // 3. Generar QR
        const tokenQR = randomUUID(); 
        await connection.query("INSERT INTO codigo_qr (token, id_cita) VALUES (?, ?)", [tokenQR, id_cita_nueva]);

        // 4. Insertar Invitados
        if (invitados && invitados.length > 0) {
            const sqlInvitado = `INSERT INTO invitados (nombre, correo, empresa, tipo_visitante, id_cita) VALUES (?, ?, ?, ?, ?)`;
            for (const inv of invitados) {
                await connection.query(sqlInvitado, [inv.nombre, inv.correo, inv.empresa, inv.tipo_visitante, id_cita_nueva]);
            }
        }

        await connection.commit();
        res.status(201).json({ message: "Cita creada y cajón apartado", id_cita: id_cita_nueva });

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
        let { fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id_cajon } = req.body;

        // 1. Validar que no falten datos esenciales
        if (!fecha_inicio || !fecha_fin || !hora_inicio || !hora_fin || !motivo || !estado_cita || !id_cajon) {
            return res.status(400).json({ message: "Por favor, proporciona todos los campos necesarios" });
        }

        // 2. Limpieza defensiva de datos (evita que MySQL colapse con undefined o textos vacíos)
        const numInvitados = Number(numero_invitados) || 0; // Si viene vacío o undefined, se hace 0
        const cajonId = Number(id_cajon); 
        const citaId = Number(id);

        // 3. Ejecutar la actualización
        const [result] = await connection.query(
            `UPDATE registro_citas SET fecha_inicio = ?, fecha_fin = ?, hora_inicio = ?, hora_fin = ?, motivo = ?, estado_cita = ?, numero_invitados = ?, id_cajon = ? WHERE id = ?`,
            [fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numInvitados, cajonId, citaId]
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

        // 1. Obtener el id_cajon antes de borrar la cita para saber cuál liberar
        const [cita] = await connection.query("SELECT id_cajon FROM registro_citas WHERE id = ?", [id]);
        
        if (cita.length === 0) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        const id_cajon_a_liberar = cita[0].id_cajon;

        // 2. Borrar la cita (las tablas hijas como invitados o qr deben tener ON DELETE CASCADE o borrarlas manualmente aquí)
        await connection.query("DELETE FROM registro_citas WHERE id = ?", [id]);

        // 3. Poner el cajón en 'Disponible' nuevamente
        // if (id_cajon_a_liberar) {
        //     await connection.query("UPDATE cajones SET estado = 'Disponible' WHERE id = ?", [id_cajon_a_liberar]);
        // }

        await connection.commit();
        res.status(200).json({ message: "Cita eliminada y cajón liberado" });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ message: "Error al eliminar" });
    } finally {
        connection.release();
    }
};