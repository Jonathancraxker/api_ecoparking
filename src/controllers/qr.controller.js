import { pool } from '../config/db.js';

const FRONTEND_URL = 'http://localhost:5173/codigo';

export const validarTokenQR = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { token } = req.params;
        
        // 1. Busqueda el token
        const [qrResult] = await connection.query("SELECT id_cita FROM codigo_qr WHERE token = ?", [token]);
        if (qrResult.length === 0) return res.redirect(`${FRONTEND_URL}?status=denegado&reason=no_encontrada`);

        const idCita = qrResult[0].id_cita;
        
        // 2. busqueda de información de la cita
        const [citaResult] = await connection.query(
            `SELECT r.id, r.fecha_inicio, r.fecha_fin, r.hora_inicio, r.hora_fin, r.estado_cita, r.motivo, c.numero_cajon 
             FROM registro_citas r 
             LEFT JOIN cajones c ON r.id_cajon = c.id 
             WHERE r.id = ?`, 
            [idCita]
        );

        if (citaResult.length === 0) return res.redirect(`${FRONTEND_URL}?status=denegado&reason=no_tiene_cita`);

        // 3. Obtenemos TODOS los invitados
        const [invitadosResult] = await connection.query(
            "SELECT nombre, correo, empresa, tipo_visitante, matricula FROM invitados WHERE id_cita = ?", 
            [idCita]
        );

        const cita = citaResult[0];
        const ahora = new Date();

        // 4. Preparamos los parámetros
        const citaParams = new URLSearchParams({
            motivo: cita.motivo,
            fecha: cita.fecha_inicio,
            fecha_fin: cita.fecha_fin,
            horario: `${cita.hora_inicio} - ${cita.hora_fin}`,
            cajon: cita.numero_cajon || 'Sin asignar',
            // Convertimos la lista de invitados a JSON y luego a URI
            invitados: encodeURIComponent(JSON.stringify(invitadosResult)) 
        });

        // Validaciones de estado y tiempo
        if (cita.estado_cita !== 'Confirmada' && cita.estado_cita !== 'Pendiente') {
            return res.redirect(`${FRONTEND_URL}?status=denegado&reason=cancelada&${citaParams.toString()}`);
        }

        const TIMEZONE = '-06:00'; 
        const inicioCita = new Date(`${cita.fecha_inicio}T${cita.hora_inicio}${TIMEZONE}`);
        const finCita = new Date(`${cita.fecha_fin}T${cita.hora_fin}${TIMEZONE}`);

        if (ahora < inicioCita) return res.redirect(`${FRONTEND_URL}?status=denegado&reason=no_iniciada&${citaParams.toString()}`);
        if (ahora > finCita) return res.redirect(`${FRONTEND_URL}?status=denegado&reason=expired&${citaParams.toString()}`);

        // ¡ÉXITO!
        res.redirect(`${FRONTEND_URL}?status=valido&${citaParams.toString()}`);

    } catch (error) {
        console.error("Error al validar QR:", error);
        res.redirect(`${FRONTEND_URL}?status=denegado&reason=server_error`);
    } finally {
        connection.release();
    }
};