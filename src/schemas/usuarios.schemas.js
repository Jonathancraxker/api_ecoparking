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
    }),
    codigo: z.string({
        required_error:'El codigo es requerido'
    }).nonempty('El codigo no puede estar vacío')
})


export const loginSchema = z.object({
    correo: z.string ({
        required_error: 'El correo es requerido'
    }).nonempty('El email no puede estar vacio')
    .email({
        message: 'correo no valido'
    }),
    codigo: z.string({
        required_error:'El código es requerido'
    }).nonempty('El código no puede estar vacío'),
    contrasena: z.string({
        required_error:'La contraseña es requerida'
    }).min(3,{
        message:'La contraseña debe tener minimo 3 caracteres'
    }).nonempty('La contraseña no puede estar vacía')
})


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
    tipo_usuario: z.string ({
        required_error: 'El tipo_usuario es requerido'
    }),
    codigo: z.string ({
        required_error: 'El codigo es requerido'
    }).nonempty('El codigo no puede estar vacío')
})

export const updatePasswordSchema = z.object({
    contrasena: z.string({
        required_error:'La contraseña es requerida'
    }).min(8,{
        message:'La contraseña debe tener minimo 8 caracteres'
    })
})