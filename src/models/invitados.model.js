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
        console.log("Parametros recibidos:", req.params);

        const { id } = req.params;
        console.log("ID recibido:", id);

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

export const getInvitadosPorCita = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;

        const [rows] = await connection.query(
            "SELECT * FROM invitados WHERE id_cita = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.json([]);
        }
        res.status(200).json(rows);

    } catch (error) {
        console.error("Error al obtener invitados por cita:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const registrarInvitado = async (req, res) => {
    const connection = await pool.getConnection();
    
    try {
        const { nombre, correo, empresa, tipo_visitante, matricula, id_cita, id_cajon, tipo_acompanante } = req.body;
        
        if (!nombre || !correo || !id_cita) {return res.status(400).json({ message: "Todos los campos son requeridos" });}
        await connection.beginTransaction();

        const sqlInvitado = "INSERT INTO invitados (nombre, correo, empresa, tipo_visitante, matricula, id_cajon, id_cita, tipo_acompanante) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        const [result] = await connection.query(sqlInvitado, [
            nombre, 
            correo, 
            empresa, 
            tipo_visitante, 
            matricula, 
            id_cajon || null, 
            id_cita, 
            tipo_acompanante || 'Conductor'
        ]);
        
        const sqlCita = "UPDATE registro_citas SET numero_invitados = numero_invitados + 1 WHERE id = ?";
        await connection.query(sqlCita, [id_cita]);

        if (id_cajon) {
            await connection.query("UPDATE cajones SET estado = 'Ocupado' WHERE id = ?", [id_cajon]);
        }

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
        const { nombre, correo, empresa, tipo_visitante, matricula, id_cajon, tipo_acompanante } = req.body;

        await connection.beginTransaction();

        const [oldGuest] = await connection.query("SELECT id_cita, id_cajon, tipo_acompanante, matricula FROM invitados WHERE id = ?", [id]);
        if (oldGuest.length === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }
        
        const { 
            id_cita, 
            id_cajon: cajonViejo, 
            tipo_acompanante: tipoViejo, 
            matricula: matriculaVieja 
        } = oldGuest[0];
        
        const cajonNuevo = id_cajon ? Number(id_cajon) : null;

        await connection.query(
            "UPDATE invitados SET nombre = ?, correo = ?, empresa = ?, tipo_visitante = ?, matricula = ?, id_cajon = ?, tipo_acompanante = ? WHERE id = ?",
            [nombre, correo, empresa, tipo_visitante, matricula, cajonNuevo, tipo_acompanante, id]
        );

        if (tipoViejo === 'Conductor' || tipo_acompanante === 'Conductor') {
            if (cajonViejo) {
                await connection.query(
                    "UPDATE invitados SET matricula = ?, id_cajon = ? WHERE id_cita = ? AND id_cajon = ? AND tipo_acompanante = 'Acompañante'",
                    [matricula, cajonNuevo, id_cita, cajonViejo]
                );
            } else if (matriculaVieja) {
                await connection.query(
                    "UPDATE invitados SET matricula = ?, id_cajon = ? WHERE id_cita = ? AND matricula = ? AND tipo_acompanante = 'Acompañante'",
                    [matricula, cajonNuevo, id_cita, matriculaVieja]
                );
            }
        }

        if (cajonViejo !== cajonNuevo) {
            if (cajonNuevo) {
                await connection.query("UPDATE cajones SET estado = 'Ocupado' WHERE id = ?", [cajonNuevo]);
            }
            if (cajonViejo) {
                const [otrosInvitados] = await connection.query("SELECT id FROM invitados WHERE id_cajon = ?", [cajonViejo]);
                if (otrosInvitados.length === 0) {
                    await connection.query("UPDATE cajones SET estado = 'Disponible' WHERE id = ?", [cajonViejo]);
                }
            }
        }

        await connection.commit();
        res.status(200).json({ message: "Invitado y sus acompañantes actualizados exitosamente" });

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

        const [rows] = await connection.query("SELECT id_cita, id_cajon FROM invitados WHERE id = ?", [id]);

        if (rows.length === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }
        const id_cita = rows[0].id_cita;
        const cajon_usado = rows[0].id_cajon;

        await connection.query("DELETE FROM invitados WHERE id = ?", [id]);
        
        const sqlCita = "UPDATE registro_citas SET numero_invitados = numero_invitados - 1 WHERE id = ?";
        await connection.query(sqlCita, [id_cita]);

        if (cajon_usado) {
            const [otrosInvitados] = await connection.query("SELECT id FROM invitados WHERE id_cajon = ?", [cajon_usado]);
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

export const registrarEntradaInvitado = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; 
        await connection.beginTransaction();

        const [invitadoDb] = await connection.query(
            "SELECT id_cita, id_cajon FROM invitados WHERE id = ?",
            [id]
        );

        if (invitadoDb.length === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }

        const { id_cita, id_cajon } = invitadoDb[0];

        if (id_cajon) {
            await connection.query(
                "UPDATE invitados SET estado_visita = 'Dentro', hora_entrada = NOW() WHERE id_cita = ? AND id_cajon = ?",
                [id_cita, id_cajon]
            );

            await connection.query(
                "UPDATE cajones SET estado = 'Ocupado' WHERE id = ?",
                [id_cajon]
            );
        } else {
            await connection.query(
                "UPDATE invitados SET estado_visita = 'Dentro', hora_entrada = NOW() WHERE id = ?",
                [id]
            );
        }

        await connection.commit();
        res.status(200).json({ message: "Entrada registrada exitosamente para el vehículo y sus ocupantes." });

    } catch (error) {
        await connection.rollback();
        console.error("Error al registrar entrada:", error);
        res.status(500).json({ message: "Error interno del servidor al procesar la entrada." });
    } finally {
        connection.release();
    }
};

export const registrarSalidaInvitado = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; 
        await connection.beginTransaction();

        const [invitadoDb] = await connection.query(
            "SELECT id_cita, id_cajon FROM invitados WHERE id = ?",
            [id]
        );

        if (invitadoDb.length === 0) {
            return res.status(404).json({ message: "Invitado no encontrado" });
        }

        const { id_cita, id_cajon } = invitadoDb[0];

        if (id_cajon) {
            await connection.query(
                "UPDATE invitados SET estado_visita = 'Finalizado', hora_salida = NOW() WHERE id_cita = ? AND id_cajon = ?",
                [id_cita, id_cajon]
            );
            await connection.query(
                "UPDATE cajones SET estado = 'Disponible' WHERE id = ?",
                [id_cajon]
            );
        } else {
            await connection.query(
                "UPDATE invitados SET estado_visita = 'Finalizado', hora_salida = NOW() WHERE id = ?",
                [id]
            );
        }

        const [invitadosActivos] = await connection.query(
            "SELECT id FROM invitados WHERE id_cita = ? AND estado_visita != 'Finalizado'",
            [id_cita]
        );

        if (invitadosActivos.length === 0) {
            await connection.query(
                "UPDATE registro_citas SET estado_cita = 'Finalizada' WHERE id = ?",
                [id_cita]
            );
        }

        await connection.commit();
        res.status(200).json({ message: "Salida registrada exitosamente." });

    } catch (error) {
        await connection.rollback();
        console.error("Error al registrar salida:", error);
        res.status(500).json({ message: "Error interno del servidor al procesar la salida." });
    } finally {
        connection.release();
    }
};