import { pool } from '../config/db.js';

<<<<<<< HEAD
//Cámbiar por url de producción cuando se tenga
// const FRONTEND_URL = 'https://ecoparking-web.vercel.app/codigo'; //Para vercel
// const FRONTEND_URL = 'https://cyan-grouse-718251.hostingersite.com/codigo'; //Para hostinger
=======
>>>>>>> 04bd35cfe7544b75be39c3613c56fbf020fb21b1
const FRONTEND_URL = 'http://localhost:5173/codigo'; //Para pruebas locales

export const validarTokenQR = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { token } = req.params;
<<<<<<< HEAD
=======
        
>>>>>>> 04bd35cfe7544b75be39c3613c56fbf020fb21b1
        // 1. Buscamos el token en la tabla de QR
        const [qrResult] = await connection.query(
            "SELECT id_cita FROM codigo_qr WHERE token = ?", 
            [token]
        );

<<<<<<< HEAD
        // CHEQUEO 1: ¿El token (la llave) existe?
=======
        // CHEQUEO 1: ¿El token existe? (Aquí no hay cita asociada aún)
>>>>>>> 04bd35cfe7544b75be39c3613c56fbf020fb21b1
        if (qrResult.length === 0) {
            return res.redirect(`${FRONTEND_URL}?status=denegado&reason=no_encontrada`);
        }

<<<<<<< HEAD
        // 2. Buscamos la cita (la puerta)
        const idCita = qrResult[0].id_cita;
        
        // --- AQUÍ ESTÁ EL PRIMER CAMBIO ---
        // Pedimos las nuevas columnas 'hora_inicio' y 'hora_fin'
        const [citaResult] = await connection.query(
            "SELECT fecha_inicio, fecha_fin, hora_inicio, hora_fin, estado_cita FROM registro_citas WHERE id = ?", 
=======
        const idCita = qrResult[0].id_cita;
        
        // 2. Buscamos la información completa de la cita
        const [citaResult] = await connection.query(
            "SELECT id, fecha_inicio, fecha_fin, hora_inicio, hora_fin, estado_cita, motivo FROM registro_citas WHERE id = ?", 
>>>>>>> 04bd35cfe7544b75be39c3613c56fbf020fb21b1
            [idCita]
        );

        if (citaResult.length === 0) {
            return res.redirect(`${FRONTEND_URL}?status=denegado&reason=no_tiene_cita`);
        }

        const cita = citaResult[0];
        const ahora = new Date();

<<<<<<< HEAD
        // INICIO DE VALIDACIONES DE LA CITA
        // VALIDACIÓN A: ¿El estatus es correcto?
        if (cita.estado_cita !== 'Confirmada' && cita.estado_cita !== 'Pendiente') {
            return res.redirect(`${FRONTEND_URL}?status=denegado&reason=cancelada`);
        }

        // --- AQUÍ ESTÁ EL SEGUNDO CAMBIO ---
        // VALIDACIÓN B: ¿El tiempo es correcto?
        
        // Asumimos que la fecha es 'YYYY-MM-DD' y la hora es 'HH:MM:SS' (o 'HH:MM')
        // Creamos una fecha y hora de inicio exacta
        const TIMEZONE = '-06:00'; //Se agrega TIMEZONE -6 horas por los horarios del servidor, buscas más información...

        // Construimos la fecha especificando la zona horaria al final
        const inicioCita = new Date(`${cita.fecha_inicio}T${cita.hora_inicio}${TIMEZONE}`);
        const finCita = new Date(`${cita.fecha_fin}T${cita.hora_fin}${TIMEZONE}`);

        // --- Y ELIMINAMOS ESTA LÍNEA ---
        // finCita.setHours(23, 59, 59); // <-- Esta línea fue borrada

        if (ahora < inicioCita) {
            return res.redirect(`${FRONTEND_URL}?status=denegado&reason=not_yet`);
        }

        if (ahora > finCita) {
            return res.redirect(`${FRONTEND_URL}?status=denegado&reason=expired`);
        }

        // ¡ÉXITO!
        // Si pasa todas las validaciones, redirige a la app de React con status 'valido'
        res.redirect(`${FRONTEND_URL}?status=valido`);
=======
        // Preparamos los datos de la cita para enviarlos en cualquier caso (éxito o error)
        const citaParams = new URLSearchParams({
            motivo: cita.motivo,
            fecha: cita.fecha_inicio,
            fecha_fin: cita.fecha_fin,
            horario: `${cita.hora_inicio} - ${cita.hora_fin}`
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
>>>>>>> 04bd35cfe7544b75be39c3613c56fbf020fb21b1

    } catch (error) {
        console.error("Error al validar QR:", error);
        res.redirect(`${FRONTEND_URL}?status=denegado&reason=server_error`);
    } finally {
        connection.release();
    }
};