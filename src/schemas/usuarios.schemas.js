import z from 'zod'

export const registroSchema = z.object({
    nombre: z.string({
        required_error: 'El nombre es requerido'
    }).nonempty('El nombre es requerido'),
    correo: z.string ({
        required_error: 'El email es requerido'
    }).nonempty('El email no puede estar vacio')
    .email({
        message: 'correo no valido'
    }),
    contrasena: z.string({
        required_error:'La contraseña es requerida'
    }).nonempty('La contraseña no puede estar vacía')
    .min(3,{
        message:'La contraseña debe tener minimo 3 caracteres'
    })
})


export const loginSchema = z.object({
    correo: z.string ({
        required_error: 'El correo es requerido'
    }).nonempty('El email no puede estar vacio')
    .email({
        message: 'correo no valido'
    }),
    contrasena: z.string({
        required_error:'La contraseña es requerida'
    }).min(3,{
        message:'La contraseña debe tener minimo 3 caracteres'
    }).nonempty('La contraseña no puede estar vacía')
})

// {
//     "nombre": "eleme",
//     "correo": "eseleme@gmail.com",
//     "tipo": "3",
//     "estado": "activo"
// }

export const updateSchema = z.object({
    nombre: z.string ({
        required_error: 'El nombre es requerido'
    }).nonempty('El nombre no puede estar vacio'),
    correo: z.string ({
        required_error: 'El correo es requerido'
    }).nonempty('El email no puede estar vacio')
    .email({
        message: 'correo no valido'
    }),
    tipo: z.number ({
        required_error: 'El tipo es requerido'
    }),
    estado: z.string ({
        required_error: 'El estado es requerido'
    }).nonempty('El estado no puede estar acío')
})