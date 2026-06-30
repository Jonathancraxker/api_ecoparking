import { pool } from '../config/db.js';

export const getDashboardStats = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        // 1. Tarjetas de Resumen (KPIs)
        const sqlKpis = `
            SELECT 
                (SELECT COUNT(*) FROM registro_citas) AS total_citas,
                (SELECT COUNT(*) FROM invitados) AS total_invitados,
                (SELECT COUNT(*) FROM usuarios) AS total_usuarios,
                (SELECT COUNT(*) FROM registro_citas WHERE fecha_inicio = DATE_FORMAT(CURDATE(), '%Y-%m-%d')) AS citas_hoy
        `;
        const [kpis] = await connection.query(sqlKpis);

        // 2. Gráfica 1: Estados de las citas
        const sqlEstados = `
            SELECT estado_cita AS name, COUNT(*) AS value 
            FROM registro_citas 
            GROUP BY estado_cita
        `;
        const [estadosCitas] = await connection.query(sqlEstados);

        // 3. Gráfica 2: Citas por Mes (Últimos meses)
        const sqlMeses = `
            SELECT SUBSTRING(fecha_inicio, 1, 7) AS name, COUNT(*) AS value 
            FROM registro_citas 
            GROUP BY SUBSTRING(fecha_inicio, 1, 7) 
            ORDER BY name ASC 
            LIMIT 6
        `;
        const [citasPorMes] = await connection.query(sqlMeses);

        // 4. Gráfica 3: Estado de los Cajones
        const sqlCajones = `
            SELECT estado AS name, COUNT(*) AS value 
            FROM cajones 
            GROUP BY estado
        `;
        const [estadoCajones] = await connection.query(sqlCajones);

        // 5. NUEVO - Gráfica 4: Citas por Tipo de Usuario
        const sqlTipoUsuario = `
            SELECT u.tipo_usuario AS name, COUNT(r.id) AS value 
            FROM registro_citas r 
            JOIN usuarios u ON r.id_usuario = u.id 
            GROUP BY u.tipo_usuario
        `;
        const [citasPorTipo] = await connection.query(sqlTipoUsuario);

        // 6. NUEVO - Gráfica 5: Top 5 Divisiones con más citas
        const sqlDivisiones = `
            SELECT u.division AS name, COUNT(r.id) AS value 
            FROM registro_citas r 
            JOIN usuarios u ON r.id_usuario = u.id 
            GROUP BY u.division 
            ORDER BY value DESC 
            LIMIT 5
        `;
        const [citasPorDivision] = await connection.query(sqlDivisiones);

        // Enviamos todo al frontend
        res.status(200).json({
            kpis: kpis[0],
            estadosCitas,
            citasPorMes,
            estadoCajones,
            citasPorTipo,
            citasPorDivision
        });

    } catch (error) {
        console.error("Error al obtener estadísticas del dashboard:", error);
        res.status(500).json({ message: "Error al cargar las estadísticas" });
    } finally {
        connection.release();
    }
};