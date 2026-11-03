# Superkanes · Frontend web

React, TypeScript y Vite. Requiere Node.js 24 y npm. El alcance de integración está documentado en [spec.md](spec.md), conforme a la [constitución](../CONSTITUCION.md).

## Desarrollo

```sh
npm ci
npm run dev -- --host localhost --port 5173 --strictPort
```

Abrir http://localhost:5173. `VITE_API_URL` apunta por defecto a `http://localhost:3000/api/v1`; para cambiarla se puede usar `.env.local`. Las variables `VITE_` son públicas: nunca contienen secretos.

La API y PostgreSQL deben estar disponibles. CORS debe admitir el origen del frontend y ambas aplicaciones deben usar el mismo hostname para la cookie `SameSite=Strict`. En producción se requieren HTTPS y los orígenes correspondientes. Swagger no es una dependencia de ejecución del frontend.

## Integración

- Login, restauración y renovación de sesión por cookie HttpOnly; token de acceso únicamente en memoria. Logout revoca la sesión.
- Selección de organización según `/auth/me`, con limpieza de las vistas al cambiarla.
- Catálogo autorizado `/resources` para campos, relaciones, estados y permisos efectivos.
- Las 47 colecciones se distribuyen entre agenda, mascotas y tutores, historia clínica, peluquería, vacunación, reportes y configuración.
- Listas reales, paginación por cursor, búsqueda dentro de la página, filtro de estado, detalle y formularios según permisos. Las altas usan `Idempotency-Key`; las modificaciones y bajas usan `If-Match`.
- Los resúmenes muestran registros accesibles. `25+` indica que existen páginas adicionales, no un total exacto.
- El alta de mascotas exige tutor principal; su transferencia utiliza el endpoint específico y conserva los vínculos históricos.
- Las bajas solicitan confirmación y distinguen eliminación, cancelación y desactivación.
- La navegación mantiene la sección en memoria y regresa al resumen al recargar. No se almacenan datos clínicos ni tokens en localStorage.

Los reportes emitidos, auditoría y eventos de salida se consultan en modo de solo lectura. La emisión de reportes, envío de recordatorios, carga/análisis binario de archivos y captura de firmas siguen requiriendo sus procesos específicos. El listado de usuarios no sustituye el alta de cuentas y credenciales. La UI indica estos límites y no simula resultados.

Los formularios usan las reglas del catálogo y el backend verifica reglas clínicas, autoría, relaciones y estados en cada escritura. Los formularios de plantillas y contenido estructurado admiten JSON según el esquema clínico; no constituyen un editor visual de plantillas.

## Organización

- `src/App.tsx`: ciclo de sesión.
- `src/features/auth`: acceso y contrato de autenticación.
- `src/features/workspace`: navegación, catálogo, listas, detalle y formularios.
- `src/shared/api/http.ts`: transporte HTTP y errores.
- `src/shared/layout`: estructura adaptable.
- `src/shared/ui`: componentes compartidos.

## Verificación

```sh
npm run build
npm run lint
npm run preview
```

`build` verifica TypeScript y compila. `preview` permite inspección local de la compilación; su origen también debe estar permitido en CORS.

## Fotos y editor de historias clínicas

En **Mascotas y tutores → Mascotas**, abre **Nuevo registro** o **Editar**: la ficha permite cargar una foto JPEG/PNG/WebP, verla junto al nombre y guardarla como foto principal. El permiso de archivos y MinIO deben estar configurados. No se exponen claves S3 en el navegador.

En **Historia clínica → Revisiones clínicas**, usa **Documento de historia clínica** para redactar texto extenso con títulos, formato, listas y alineación. **Usar estructura clínica** agrega apartados a un documento vacío. **Guardar** conserva el documento; cerrar con cambios solicita descartarlos. Los documentos cerrados se muestran en modo lectura; las correcciones se registran en una revisión nueva. No hay autoguardado ni colaboración en tiempo real.

El editor presenta una cinta de herramientas similar a Word y una hoja con márgenes. Permite elegir fuente, tamaño, color, resaltado, interlineado y estilos de título; incluye deshacer/rehacer, quitar formato, recuento de palabras y zoom. En móvil, desplaza horizontalmente la cinta para acceder a todas las herramientas. El formato se conserva al guardar y volver a abrir la ficha.

El frontend se puede ejecutar con `npm run dev` o mediante el Compose del backend. La imagen Docker usa Nginx, sirve el SPA y envía `/api/` al backend; el límite de carga admite fotos de 10 MiB. Consulta las instrucciones de MinIO, migraciones y bases existentes en [el README del backend](../superkanes_backend/README.md).

Verificación: `npm run build`, `npm run lint`. La prueba de Chromium `test/clinical-browser.cjs` se invoca desde la suite integrada del backend con `TEST_STORAGE=true TEST_BROWSER=true`; requiere `npx playwright install chromium` y el frontend en `http://localhost:5174`. Comprueba foto real, nombre del paciente, descarte de cambios, edición de documento extenso, guardado y reapertura.

El editor también está disponible directamente en **Atenciones clínicas → Nuevo registro**. El formulario selecciona el profesional vinculado a tu sesión, muestra una estructura clínica inicial y guarda atención e historia juntas con **Guardar atención e historia**. Usa **Ir al documento** para saltar al área de redacción. Desde el detalle de la atención puedes leer y editar sus historias en borrador.

Al registrar o editar una mascota, selecciona primero la especie. Las razas se consultan filtradas por esa especie, incluso al cargar más opciones; cambiar de especie limpia la raza anterior. Puedes guardar sin raza si no está registrada. Si una solicitud contiene una combinación incompatible, se muestra una explicación específica en lugar de indicar que el registro desapareció.
