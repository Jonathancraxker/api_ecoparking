import { pool } from '../config/db.js'
import { randomUUID } from "crypto"

export const getRegistrosCitas = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // 1. Obtener TODAS las citas (como ya lo hacías)
        const [citas] = await connection.query("SELECT * FROM registro_citas");

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
            "SELECT * FROM registro_citas WHERE id_usuario = ?", 
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
        // Obtenemos el ID del usuario de forma SEGURA (desde el token verificado)
        const id_usuario = req.user.id;

        // Obtenemos los datos de la cita Y el array de invitados desde el body
        const {fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, invitados} = req.body;
        if (!fecha_inicio || !fecha_fin || !hora_inicio || !hora_fin || !motivo || !estado_cita) {
            return res.status(400).json({ message: "Por favor, proporciona todos los campos necesarios" });
        }
        // --- 2. INICIAR LA TRANSACCIÓN ---
        // Esto asegura que si algo falla (ej: un invitado no se guarda),
        // se deshace todo, incluyendo el registro de la cita.
        await connection.beginTransaction();

        const sqlCita = `
            INSERT INTO registro_citas (fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id_usuario) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        const [resultCita] = await connection.query(sqlCita, [
            fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id_usuario
        ]);
        
        // Obtenemos el ID de la cita que acabamos de crear
        const id_cita_nueva = resultCita.insertId;

        // --- 4. INSERTAR EL TOKEN DEL CÓDIGO QR ---
        // Generamos un token aleatorio y único (UUID)
        const tokenQR = randomUUID(); 
        
        const sqlQR = "INSERT INTO codigo_qr (token, id_cita) VALUES (?, ?)";
        await connection.query(sqlQR, [tokenQR, id_cita_nueva]);

        // --- 5. INSERTAR LOS INVITADOS (SI EXISTEN) ---
        // Verificamos que el array 'invitados' exista y no esté vacío
        const invitadosArray = invitados || []; // Si es nulo o undefined, lo convierte en []
        
        if (invitadosArray.length > 0) {
            // Preparamos la consulta para los invitados
            const sqlInvitado = `
                INSERT INTO Invitados (nombre, correo, empresa, tipo_visitante, id_cita) VALUES (?, ?, ?, ?, ?)`;
            
            // Hacemos un bucle y ejecutamos una inserción por cada invitado
            for (const invitado of invitadosArray) {
                await connection.query(sqlInvitado, [
                    invitado.nombre,
                    invitado.correo,
                    invitado.empresa,
                    invitado.tipo_visitante,
                    id_cita_nueva // Usamos el ID de la cita nueva
                ]);
            }
        }

        // --- 6. FINALIZAR LA TRANSACCIÓN (COMMIT) ---
        // Si llegamos aquí sin errores, guardamos todos los cambios en la BD
        await connection.commit();
        res.status(201).json({
            message: "Cita creada exitosamente",
            id_cita: id_cita_nueva,
            token_qr: tokenQR // Devolvemos el token por si la app lo necesita
        }); 

    } catch (error) {
        await connection.rollback(); 
        console.error("Error al registrar la cita:", error);
        res.status(500).json({ message: "Error interno del servidor, se deshicieron los cambios." });
    } finally {
        connection.release();
    }
};

export const updateCitaById = async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params; 
        const {fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados} = req.body;

        if (!fecha_inicio || !fecha_fin || !hora_inicio || !hora_fin || !motivo || !estado_cita) {
            return res.status(400).json({ message: "Por favor, proporciona todos los campos necesarios" });
        }

        const [result] = await connection.query(
            `UPDATE registro_citas SET fecha_inicio = ?, fecha_fin = ?, hora_inicio = ?, hora_fin = ?, motivo = ?, estado_cita = ?, numero_invitados = ? WHERE id = ?`,
            [fecha_inicio, fecha_fin, hora_inicio, hora_fin, motivo, estado_cita, numero_invitados, id]
        );
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }

        res.status(200).json({ message: "Cita actualizada exitosamente" });

    } catch (error) {
        console.error("Error al actualizar la cita:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};

export const deleteCitaById = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params; // Se obtiene el id desde la URL
        const [result] = await connection.query("DELETE FROM registro_citas WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Cita no encontrada" });
        }
        res.status(200).json({ message: "Cita eliminada exitosamente" });
    } catch (error) {
        console.error("Error al eliminar cita:", error);
        res.status(500).json({ message: "Error interno del servidor" });
    } finally {
        connection.release();
    }
};