import { pool } from '../config/db.js'

export const getRegistrosInvitados = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const [rows] = await connection.query("SELECT * FROM invitados");
        res.status(200).json(rows);
    } catch (error) {
        console.error("Error al obtener los invitados:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const getInvitadosId = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // Verifica los parámetros que llegan en la solicitud
        console.log("Parametros recibidos:", req.params);

        const { id } = req.params; // se obtiene el id desde la URL
        console.log("ID recibido:", id);  // Esto imprimirá solo el id

        const [rows] = await connection.query("SELECT id, nombre, correo, empresa, tipo_visitante, matricula, id_cita FROM invitados WHERE id = ?",  [id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }
        res.status(200).json(rows[0]);
    } catch (error) {
        console.error("Error al obtener invitado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

// Obtiene todos los invitados de una cita específica
export const getInvitadosPorCita = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; // ID de la CITA

        // Buscamos solo los invitados de esa cita
        const [rows] = await connection.query(
            "SELECT * FROM invitados WHERE id_cita = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.json([]); // Devuelve array vacío si no tiene
        }
        res.status(200).json(rows);

    } catch (error) {
        console.error("Error al obtener invitados por cita:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

//Registrar un invitado y sumarlo en el numero de invitados +1 en la tabla registro_citas
export const registrarInvitado = async (req, res) => {
    const connection = await pool.getConnection();
    console.log("=== BODY RECIBIDO EN BACKEND ===");
    console.log(req.body);  // ← VER EL BODY COMPLETO
    console.log("matricula:", req.body.matricula);  // ← VER ESPECÍFICAMENTE
    console.log("==================================");
    
    try {
        const { nombre, correo, empresa, tipo_visitante, matricula, id_cita } = req.body;
        
        if (!nombre || !correo || !id_cita) {return res.status(400).json({ message: "Todos los campos son requeridos" });}
        await connection.beginTransaction();
        const sqlInvitado = "INSERT INTO invitados (nombre, correo, empresa, tipo_visitante, matricula, id_cita) VALUES (?, ?, ?, ?, ?, ?)";
        const [result] = await connection.query(sqlInvitado, [nombre, correo, empresa, tipo_visitante, matricula, id_cita]);
        
        // 2. Actualizamos el contador en la tabla de citas
        const sqlCita = "UPDATE registro_citas SET numero_invitados = numero_invitados + 1 WHERE id = ?";
        await connection.query(sqlCita, [id_cita]);
        // 3. Confirmamos la transacción
        await connection.commit();
        res.status(201).json({
            message: "Invitado agregado exitosamente",
            id_invitado: result.insertId,
            correo
        });

    } catch (error) {
        await connection.rollback();
        console.error("Error al registrar invitado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const updateInvitadoById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        // 🟢 1. Ahora sí extraemos el id_cajon
        const { nombre, correo, empresa, tipo_visitante, matricula, id_cajon } = req.body;

        await connection.beginTransaction();

        // 🟢 2. Antes de actualizar, revisamos qué cajón tenía este invitado
        const [oldGuest] = await connection.query("SELECT id_cajon FROM invitados WHERE id = ?", [id]);
        if (oldGuest.length === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }
        const cajonViejo = oldGuest[0].id_cajon;
        const cajonNuevo = id_cajon ? Number(id_cajon) : null;

        // 🟢 3. Actualizamos todos los datos del invitado, INCLUYENDO id_cajon
        const [result] = await connection.query(
            "UPDATE invitados SET nombre = ?, correo = ?, empresa = ?, tipo_visitante = ?, matricula = ?, id_cajon = ? WHERE id = ?",
            [nombre, correo, empresa, tipo_visitante, matricula, cajonNuevo, id]
        );

        // 🟢 4. Magia de Cajones: Si el cajón cambió, actualizamos los estados
        if (cajonViejo !== cajonNuevo) {
            // A) Ponemos el NUEVO cajón como Ocupado
            if (cajonNuevo) {
                await connection.query("UPDATE cajones SET estado = 'Ocupado' WHERE id = ?", [cajonNuevo]);
            }
            
            // B) Revisamos si el cajón VIEJO se quedó vacío
            if (cajonViejo) {
                const [otrosInvitados] = await connection.query("SELECT id FROM invitados WHERE id_cajon = ?", [cajonViejo]);
                // Si ya no hay nadie más usando ese cajón viejo, lo liberamos
                if (otrosInvitados.length === 0) {
                    await connection.query("UPDATE cajones SET estado = 'Disponible' WHERE id = ?", [cajonViejo]);
                }
            }
        }

        await connection.commit();
        res.status(200).json({ message: "Invitado actualizado exitosamente" });

    } catch (error) {
        await connection.rollback();
        console.error("Error al actualizar invitado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const deleteInvitadoById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        await connection.beginTransaction();

        // 1. Necesitamos saber la cita y el CAJÓN que usaba antes de borrarlo
        const [rows] = await connection.query("SELECT id_cita, id_cajon FROM invitados WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }
        const id_cita = rows[0].id_cita;
        const cajon_usado = rows[0].id_cajon;

        // 2. Eliminamos al invitado
        await connection.query("DELETE FROM invitados WHERE id = ?", [id]);
        
        // 3. Actualizamos el contador en la tabla de citas
        const sqlCita = "UPDATE registro_citas SET numero_invitados = numero_invitados - 1 WHERE id = ?";
        await connection.query(sqlCita, [id_cita]);

        // 🟢 4. Magia de Cajones: Revisamos si era el último en usar ese cajón
        if (cajon_usado) {
            const [otrosInvitados] = await connection.query("SELECT id FROM invitados WHERE id_cajon = ?", [cajon_usado]);
            // Si ya no hay nadie más usando ese cajón, lo liberamos
            if (otrosInvitados.length === 0) {
                await connection.query("UPDATE cajones SET estado = 'Disponible' WHERE id = ?", [cajon_usado]);
            }
        }

        await connection.commit();
        res.status(200).json({ message: "Invitado eliminado exitosamente" });

    } catch (error) {
        await connection.rollback();
        console.error("Error al eliminar invitado:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};