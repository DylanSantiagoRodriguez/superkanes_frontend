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

Los reportes emitidos, auditoría y eventos de salida se consultan en modo de solo lectura. La ficha clínica incorpora carga de adjuntos, emisión de PDF y registro de consentimiento con evidencia documental. El envío de recordatorios sigue sin proveedor conectado. El listado de usuarios no sustituye el alta de cuentas y credenciales. La UI indica estos límites y no simula resultados.

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

## Flujo centrado en el paciente

1. En **Mascotas y tutores**, abre el detalle del paciente y pulsa **Abrir ficha clínica**. La cabecera muestra identidad, tutor, edad, peso y alertas accesibles. Las secciones permiten consultar antecedentes, historia, consultas, mediciones, diagnósticos, tratamientos, exámenes, vacunas y documentos.
2. **Iniciar consulta** precarga el paciente. Selecciona sede y registra el motivo; el profesional se obtiene de la sesión. También se puede iniciar desde una cita de la agenda.
3. Completa las notas SOAP y el examen físico; añade mediciones, diagnósticos y prescripciones desde la misma consulta. Cada registro estructurado es su fuente de verdad; el texto libre lo complementa.
4. Adjunta informes PDF o imágenes, registra consentimientos con evidencia y solicita exámenes. El laboratorio conserva muestra, resultado, interpretación y contacto documentado. Registrar un contacto no envía mensajes.
5. **Guardar consulta** conserva el borrador. **Revisar y cerrar consulta** muestra el resumen y pide confirmar; exige motivo, evaluación y plan. Si está vinculada con una cita, actualiza su estado coordinadamente.
6. Descarga historia de esa consulta, receta o indicaciones PDF. Para aclarar una historia cerrada, escribe el motivo y crea una corrección vinculada; el original sigue disponible para comparar.
7. **Programar control** reutiliza citas. En **Agenda**, registra llegada, abre al paciente y gestiona la reserva. Un solape del responsable muestra un mensaje específico.

Los cambios pendientes bloquean navegación y advierten al cerrar la pestaña. Las notas sobreviven a una renovación normal de sesión y a un error de red; un conflicto de versiones requiere revisar y recargar explícitamente. No hay guardado automático ni almacenamiento clínico en localStorage. Guardar antes de cerrar el navegador.

La historia tiene filtros y paginación; los puntos de la gráfica de peso son mediciones reales cargadas. Una sección sin permiso se distingue de una sección sin registros. Los diagnósticos y tratamientos se presentan como históricos hasta disponer de estados clínicos explícitos.

Implementación en `src/features/clinical`: `PatientChart`, `Consultation`, `ClinicalFiles`, `ClinicalConsents`, `ClinicalLaboratory`, `Agenda`, `WeightHistory` y el guardado de navegación compartido. Se reutilizan `RecordEditor`, el catálogo de recursos, el editor documental y los controles visuales existentes. No se añadió un framework de UI.

Consulta la [especificación y matriz de estado](../document-management/specs/002-flujo-clinico/spec.md) y los [contratos y migraciones del backend](../superkanes_backend/README.md#consulta-veterinaria-integrada). Las migraciones deben estar aplicadas antes de usar estas pantallas. Los botones dependen de los permisos del catálogo; la API vuelve a autorizar cada operación.

La prueba `test/patient-chart-browser.cjs` usa una API y PostgreSQL efímeros con datos sintéticos. Cubre consulta, medición, renovación de sesión con notas pendientes, reintento tras pérdida de respuesta, adjunto, consentimiento, laboratorio, cierre, PDF, corrección y ancho móvil. Se ejecuta desde la suite CRUD del backend. El build conserva un aviso de tamaño del paquete principal; queda pendiente dividir la carga del editor para optimizar el arranque.


## Documento del editor ligado al paciente

**Guardar atención e historia** archiva el documento editable en MinIO y lo vincula con el ID del paciente, la atención y la revisión. Los formatos compatibles pegados desde el navegador se normalizan al guardar, conservando el texto. Un error mantiene el formulario abierto; si MinIO no está disponible, no se confirma la consulta.

En **Ficha clínica → Documentos del editor** se muestran las versiones archivadas. **Ver documento guardado** recupera el archivo de MinIO y lo presenta con formato, en modo lectura. **Descargar original editable (JSON)** entrega ese mismo contenido. Las versiones de la revisión también están accesibles desde la consulta. Los PDF de historia, receta e indicaciones se siguen emitiendo al cerrar la revisión.

Los documentos guardados antes de esta función permanecen accesibles en sus consultas; no se archivan retroactivamente historias cerradas. Para esta función se necesita aplicar la migración `1794321000000-clinical-document-archive` y tener permisos clínicos y de archivos. Ver [contrato y persistencia](../superkanes_backend/README.md#archivo-automático-del-documento-del-editor-en-minio).

## Incremento SDD 007: búsqueda documental

En Documentos del editor se puede buscar por el identificador UUID existente de una
versión, completo o parcial (3–36 caracteres hexadecimales o guiones, sin distinguir
mayúsculas). La búsqueda se ejecuta en servidor y conserva paciente, revisión, permisos
y paginación. Limpiar restaura el listado; abrir y descargar mantienen su contrato.
El GET documental admite `codigo` opcional; no hay migraciones ni dependencias nuevas.
Desplegar backend antes de frontend. [Especificación](../document-management/specs/007-busqueda-documentos/spec.md)
y [flujo Codex/SDD](../README.md).
