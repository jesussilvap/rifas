# DevSoluciones Rifas

Aplicación web responsiva (*mobile-first*) para gestionar múltiples rifas con pagos manuales (Nequi y Bre-B), carga privada de comprobantes y verificación administrativa.

Consulta la especificación completa en [DevSoluciones_Rifas_Especificacion_Tecnica.md](./DevSoluciones_Rifas_Especificacion_Tecnica.md).

## Estructura del proyecto

- `backend/`: API Node.js + Express + MySQL (`mysql2/promise`), migraciones SQL, servicios transaccionales y job de expiración de reservas.
- `frontend/`: Aplicación React 19 + Vite + Tailwind CSS 4 (*mobile-first*, con *code splitting* del panel administrativo).

## Inicio rápido en desarrollo

### 1. Configurar variables de entorno del backend

```bash
cp backend/.env.example backend/.env
```

Edita `backend/.env` con tus credenciales locales de MySQL 8+.

### 2. Ejecutar migraciones y datos demo

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

### 3. Iniciar el frontend

```bash
cd frontend
npm install
npm run dev
```

- Portal público: `http://localhost:5173`
- Panel administrativo: `http://localhost:5173/admin/login`
- API Healthcheck: `http://localhost:3000/api/health`
