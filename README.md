# Superkanes · Frontend web

Proyecto independiente con React, TypeScript y Vite. Requiere Node.js 24 y npm.

## Desarrollo

Desde la carpeta frontend:

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

Abrir http://localhost:5173. Copiar la plantilla solo la primera vez; no sobrescribir una configuración existente.

VITE_API_URL apunta por defecto a http://localhost:3000/api/v1. Las variables VITE_ son públicas y se incorporan durante la compilación: nunca guardar secretos. Si cambias .env, reinicia Vite; en producción vuelve a compilar.

El backend se inicia por separado siguiendo su README. CORS debe permitir http://localhost:5173, como indica backend/.env.example. El botón de conexión consulta GET /api/v1/health/ready y requiere backend y base de datos disponibles. La interfaz puede abrirse con el backend apagado.

## Verificación

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

build verifica TypeScript y genera dist/. preview permite revisar la compilación localmente; no es un servidor de producción. Para consultar la API desde preview, permite también su origen en CORS. En producción configura HTTPS y el origen real de la web en el backend.

## Alcance

Pantalla inicial adaptable y comprobación de disponibilidad con tiempo límite de ocho segundos. Los módulos se muestran como próximos; autenticación, CRUD y escritorio quedan pendientes.

App.tsx contiene la pantalla inicial; App.css e index.css contienen los estilos. Las dependencias quedan registradas en package-lock.json.

Base generada con la plantilla oficial react-ts de Vite: https://vite.dev/guide/
