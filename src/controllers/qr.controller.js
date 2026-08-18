import { pool } from '../config/db.js';

// const FRONTEND_URL = 'http://localhost:5173/codigo';
const FRONTEND_URL = 'https://ecoparking-web.vercel.app/codigo';

export const validarTokenQR = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { token } = req.params;
        
        // 1. Busqueda el token
        const [qrResult] = await connection.query("SELECT id_cita FROM codigo_qr WHERE token = ?", [token]);
        if (qrResult.length === 0) return res.redirect(`${FRONTEND_URL}?status=denegado&reason=no_encontrada`);

        const idCita = qrResult[0].id_cita;
        
        // 2. Búsqueda de información de la cita (Sin JOIN a cajones porque ya no están aquí)
        const [citaResult] = await connection.query(
            `SELECT id, fecha_inicio, fecha_fin, hora_inicio, hora_fin, estado_cita, motivo 
             FROM registro_citas 
             WHERE id = ?`, 
            [idCita]
        );

        if (citaResult.length === 0) return res.redirect(`${FRONTEND_URL}?status=denegado&reason=no_tiene_cita`);

        // 3. Obtenemos TODOS los invitados y sus respectivos cajones
        const [invitadosResult] = await connection.query(
            `SELECT i.nombre, i.correo, i.empresa, i.tipo_visitante, i.matricula, c.numero_cajon 
             FROM invitados i
             LEFT JOIN cajones c ON i.id_cajon = c.id
             WHERE i.id_cita = ?`, 
            [idCita]
        );

        const cita = citaResult[0];
        const ahora = new Date();

        // 🟢 EXTRAEMOS LOS CAJONES: Buscamos todos los cajones únicos de los invitados
        const cajonesAsignados = invitadosResult
            .map(inv => inv.numero_cajon)
            .filter(cajon => cajon !== null); // Filtramos por si alguien llegó a pie
        
        // Unimos los cajones sin repetir (Ej. "D-12, D-13") o dejamos "Sin asignar" si no hay ninguno
        const cajonesUnicos = [...new Set(cajonesAsignados)].join(', ');

        // 4. Preparamos los parámetros
        const citaParams = new URLSearchParams({
            motivo: cita.motivo,
            fecha: cita.fecha_inicio,
            fecha_fin: cita.fecha_fin,
            horario: `${cita.hora_inicio} - ${cita.hora_fin}`,
            cajon: cajonesUnicos || 'Sin asignar',
            // 🟢 CORRECCIÓN: Quitamos encodeURIComponent para evitar que el JSON se corrompa en el frontend
            invitados: JSON.stringify(invitadosResult) 
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