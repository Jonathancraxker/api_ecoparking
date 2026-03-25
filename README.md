# API EcoParking (Backend)

Este repositorio contiene el servidor y la lógica de negocio para el sistema EcoParking. Está construido con node.js y express.

---

## Instalación y Ejecución

Sigue estos pasos uno por uno para ejecutar el proyecto en tu entorno local.

### 1. Clonar el repositorio
Copia el proyecto a tu máquina local:
```bash
git clone https://github.com/Jonathancraxker/api_ecoparking.git
```

### 2. Entrar a la carpeta del proyecto
```bash
cd nombre_proyecto
```
### 3. Instalar dependencias
```bash
npm install
```
### 4. Iniciar servidor (desarrollo local)
```bash
npm run dev
```

### Dependencias utilizadas:
- bcrypt / bcryptjs: Para encriptar contraseñas de manera segura antes de guardarlas.
- cookie-parser: Permite leer y gestionar las cookies del navegador.
- cors: Permite la comunicación de la API con aplicaciones alojadas en otros dominios.
- dotenv: Carga las configuraciones sensibles desde el archivo .env.
- express: Framework de Node.js para manejar el servidor y las rutas de forma ágil.
- jsonwebtoken: Permite la creación y validación de tokens JWT para autenticación.
- mysql2: Librería para establecer conexiones y consultas con bases de datos MySQL.
- multer: Middleware para manejar la subida de archivos (imágenes, documentos).
- zod: Manejo de validaciones estrictas de datos y esquemas.
- nodemon: Inicializa automáticamente el puerto y reinicia el servidor al detectar cambios.
