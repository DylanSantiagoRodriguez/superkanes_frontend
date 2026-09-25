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

El backend se inicia por separado siguiendo su README. CORS debe permitir http://localhost:5173, como indica backend/.env.example. Usa el mismo hostname en frontend y API para que la cookie de sesión funcione con SameSite=strict. La interfaz puede abrirse con el backend apagado, pero el acceso requiere backend y base de datos disponibles.

## Verificación

```powershell
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

build verifica TypeScript y genera dist/. preview permite revisar la compilación localmente; no es un servidor de producción. Para consultar la API desde preview, permite también su origen en CORS. En producción configura HTTPS y el origen real de la web en el backend.

## Alcance

Pantalla de inicio de sesión adaptable para clínica veterinaria y peluquería, con validación nativa de campos, mostrar/ocultar contraseña, prevención de envíos duplicados y mensajes de error. Utiliza POST /api/v1/auth/login con client=web, credenciales de cookie y cabecera X-CSRF-Protection.

El token de acceso se conserva ?nicamente en memoria; el backend administra la cookie HttpOnly de renovaci?n. Al autenticar se muestra el dashboard de demostraci?n. El cierre de sesi?n usa POST /api/v1/auth/logout y la expiraci?n regresa al formulario de acceso. La restauraci?n y renovaci?n autom?tica de sesi?n siguen pendientes: recargar la p?gina requiere volver a iniciar sesi?n. No hay registro p?blico.

## Dashboard de demostraci?n

La autenticaci?n es real; los pacientes, profesionales, citas, sede e indicadores del dashboard son ficticios. El escenario est? fechado expl?citamente el 24 de septiembre de 2026 para no presentar datos est?ticos como informaci?n actual. Ninguna interacci?n del dashboard modifica registros del backend.

- Resumen con indicadores derivados de las citas y pendientes de ejemplo.
- Agenda con filtro de servicio, b?squeda por mascota o tutor y detalle en di?logo (Escape para cerrar).
- Navegaci?n a vistas de alcance para mascotas y tutores, historia cl?nica, peluquer?a, vacunaci?n, reportes y configuraci?n.
- Navegaci?n adaptable, foco de entrada a cada vista, etiquetas accesibles y estado vac?o de b?squeda.

### Organizaci?n y componentes reutilizables

- `src/App.tsx`: coordina la sesi?n y selecciona login o dashboard. Ning?n token se entrega a componentes de demostraci?n.
- `src/features/auth`: formulario y API de autenticaci?n.
- `src/features/dashboard/pages/DashboardPage.tsx`: composici?n de la pantalla.
- `src/features/dashboard/components/AppointmentList.tsx`: filtros, tabla y detalle de citas.
- `src/features/dashboard/data/mockDashboard.ts`: escenario de ejemplo y alcance de los m?dulos.
- `src/features/dashboard/types.ts`: tipos del escenario.
- `src/shared/layout/AppShell.tsx`: estructura de navegaci?n, cabecera y espacio de trabajo, configurable mediante props.
- `src/shared/ui`: `Panel`, `Badge` y `StatCard`, independientes de los m?dulos de negocio.
- `src/shared/api/http.ts`: cliente HTTP compartido.
- `src/index.css`: estilos globales y variables de dise?o; cada componente usa CSS Modules.

Los m?dulos del men? son vistas previas, no CRUD terminados ni permisos efectivos. La selecci?n es local y vuelve al resumen al iniciar una sesi?n. Al desarrollar cada m?dulo, mover su pantalla a su propia funcionalidad, incorporar rutas y estados de carga/error, y sustituir sus datos de ejemplo con una API tipada que respete organizaci?n y permisos del backend.

Base generada con la plantilla oficial react-ts de Vite: https://vite.dev/guide/
