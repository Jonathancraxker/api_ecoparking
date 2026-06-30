import * as Cajon from '../models/cajones.model.js'

export async function listar(req, res) {
    const data = await Cajon.getAllCajones()
    res.json(data)
}

export async function crear(req, res) {
    const id = await Cajon.createCajon(req.body)
    res.json({ id })
}
export async function listarDisponibles(req, res) {
    try {
        const data = await Cajon.getCajonesDisponibles() // <--- ¿Existe esta función en el modelo?
        res.json(data)
    } catch (error) {
        console.error("DETALLE DEL ERROR:", error); // Esto te dirá en la consola qué falló exactamente
        res.status(500).json({ message: "Error al obtener cajones" })
    }
}