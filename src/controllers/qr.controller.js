import { pool } from '../config/db.js';

const FRONTEND_URL = 'https://ecoparking-web-jade.vercel.app/codigo'; //Para pruebas locales

export const validarTokenQR = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { token } = req.params;
        
        // 1. Buscamos el token en la tabla de QR
        const [qrResult] = await connection.query(
            "SELECT id_cita FROM codigo_qr WHERE token = ?", 
            [token]
        );

        // CHEQUEO 1: ¿El token existe?
        if (qrResult.length === 0) {
            return res.redirect(`${FRONTEND_URL}?status=denegado&reason=no_encontrada`);
        }

        const idCita = qrResult[0].id_cita;
        
        // 2. Buscamos la información de la cita Y HACEMOS JOIN CON CAJONES
        const [citaResult] = await connection.query(
            `SELECT r.id, r.fecha_inicio, r.fecha_fin, r.hora_inicio, r.hora_fin, r.estado_cita, r.motivo, c.numero_cajon 
             FROM registro_citas r 
             LEFT JOIN cajones c ON r.id_cajon = c.id 
             WHERE r.id = ?`, 
            [idCita]
        );

        if (citaResult.length === 0) {
            return res.redirect(`${FRONTEND_URL}?status=denegado&reason=no_tiene_cita`);
        }

        const cita = citaResult[0];
        const ahora = new Date();

        // Preparamos los datos de la cita (agregamos el cajon)
        const citaParams = new URLSearchParams({
            motivo: cita.motivo,
            fecha: cita.fecha_inicio,
            fecha_fin: cita.fecha_fin,
            horario: `${cita.hora_inicio} - ${cita.hora_fin}`,
            cajon: cita.numero_cajon || 'Sin asignar' // <--- NUEVO: Mandamos el cajón
        });

        // VALIDACIÓN A: ¿El estatus es correcto?
        if (cita.estado_cita !== 'Confirmada' && cita.estado_cita !== 'Pendiente') {
            citaParams.append('status', 'denegado');
            citaParams.append('reason', 'cancelada');
            return res.redirect(`${FRONTEND_URL}?${citaParams.toString()}`);
        }

        // VALIDACIÓN B: ¿El tiempo es correcto?
        const TIMEZONE = '-06:00'; 
        const inicioCita = new Date(`${cita.fecha_inicio}T${cita.hora_inicio}${TIMEZONE}`);
        const finCita = new Date(`${cita.fecha_fin}T${cita.hora_fin}${TIMEZONE}`);

        if (ahora < inicioCita) {
            citaParams.append('status', 'denegado');
            citaParams.append('reason', 'no_iniciada');
            return res.redirect(`${FRONTEND_URL}?${citaParams.toString()}`);
        }

        if (ahora > finCita) {
            citaParams.append('status', 'denegado');
            citaParams.append('reason', 'expired');
            return res.redirect(`${FRONTEND_URL}?${citaParams.toString()}`);
        }

        // ¡ÉXITO!
        citaParams.append('status', 'valido');
        res.redirect(`${FRONTEND_URL}?${citaParams.toString()}`);

    } catch (error) {
        console.error("Error al validar QR:", error);
        res.redirect(`${FRONTEND_URL}?status=denegado&reason=server_error`);
    } finally {
        connection.release();
    }
};