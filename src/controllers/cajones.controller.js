import * as Cajon from '../models/cajones.model.js'

export async function listar(req, res) {
    const data = await Cajon.getAllCajones()
    res.json(data)
}

export async function crear(req, res) {
    try {
        const id = await Cajon.createCajon(req.body);
        res.json({ id });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: "El número de cajón ya existe, intenta con otro." });
        }
        res.status(500).json({ message: "Error interno al crear el cajón" });
    }
}

export async function actualizar(req, res) {
    try {
        await Cajon.updateCajon(req.params.id, req.body);
        res.json({ message: "Cajón actualizado" });
    } catch (error) {
        res.status(500).json({ message: "Error al actualizar" });
    }
}

export async function eliminar(req, res) {
    try {
        await Cajon.deleteCajon(req.params.id);
        res.json({ message: "Cajón eliminado" });
    } catch (error) {
        res.status(500).json({ message: "Error al eliminar" });
    }
}

export async function listarDisponibles(req, res) {
    try {
        const data = await Cajon.getCajonesDisponibles()
        res.json(data)
    } catch (error) {
        console.error("DETALLE DEL ERROR:", error);
        res.status(500).json({ message: "Error al obtener cajones" })
    }
}

export async function listarDisponiblesFiltrados(req, res) {
    try {
        const { fecha_inicio, fecha_fin, hora_inicio, hora_fin, id_cita } = req.body;

        if (!fecha_inicio || !fecha_fin || !hora_inicio || !hora_fin) {
            return res.status(400).json({ 
                message: "Faltan datos. Se requiere fecha_inicio, fecha_fin, hora_inicio y hora_fin" 
            });
        }

        const data = await Cajon.getCajonesDisponiblesPorFechaHora(fecha_inicio, fecha_fin, hora_inicio, hora_fin, id_cita);
        
        res.json(data);
    } catch (error) {
        console.error("Error al filtrar cajones:", error);
        res.status(500).json({ message: "Error al obtener cajones disponibles para esa fecha" });
    }
}