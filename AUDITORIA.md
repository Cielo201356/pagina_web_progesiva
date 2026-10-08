# Título

**Auditoría funcional, técnica y de experiencia de usuario de la aplicación web progresiva Cuaderno**

**Fecha:** 7 de octubre de 2026

**Versión revisada:** commit `5f88411`

**Sitio evaluado:** <https://cielo201356.github.io/pagina_web_progesiva/>

---

# Resumen

Se realizó una revisión del código fuente y una prueba funcional del sitio desplegado en GitHub Pages. La aplicación cargó correctamente **100 publicaciones, 10 autores y 500 comentarios**. Se verificaron la búsqueda, el filtro por autor, la lectura de comentarios, la creación de una publicación de demostración y la carga de contenido previamente almacenado cuando no hay conexión.

La revisión encontró **un hallazgo de prioridad media** en el service worker: durante la activación elimina todas las cachés del origen que no tengan dos nombres concretos de Cuaderno. Como Cache Storage se comparte por origen, esto podría borrar las cachés de otras aplicaciones alojadas bajo el mismo dominio de GitHub Pages. También se identificó **una mejora de prioridad baja**: las respuestas HTTP fallidas de la API no activan el uso de una respuesta previamente guardada; el respaldo solo se utiliza cuando la solicitud de red falla.

No se observó una vulnerabilidad crítica o alta en el alcance revisado. La aplicación escapa los textos recibidos antes de insertarlos en el HTML y comunica que las publicaciones creadas con JSONPlaceholder son simuladas y no persisten. Esta revisión no equivale a una prueba de penetración ni a una certificación completa de accesibilidad.

# Introducción

Cuaderno es una aplicación estática en español que presenta contenido de JSONPlaceholder. Utiliza las rutas `/posts`, `/users` y `/comments`, permite explorar publicaciones y enviar nuevas entradas mediante `POST /posts`. Un manifiesto describe la experiencia instalable y un service worker almacena los recursos de la interfaz y las respuestas de la API.

JSONPlaceholder es un servicio de demostración: simula las respuestas de escritura, pero no conserva las publicaciones creadas. Esta característica está informada en la interfaz y en la documentación del proyecto. La auditoría se enfoca en el comportamiento observable, el código entregado y las limitaciones propias de este servicio de prueba.

## Objetivo General

Evaluar el funcionamiento y la calidad técnica de Cuaderno, una aplicación web progresiva que consume JSONPlaceholder, para identificar fortalezas, riesgos y mejoras que ayuden a mantener una experiencia segura, accesible y confiable.

## Objetivos Específicos

1. Comprobar que la aplicación publicada carga y presenta publicaciones, autores y comentarios desde JSONPlaceholder.
2. Revisar las interacciones principales: búsqueda, filtro, paginación, consulta de comentarios y envío de una publicación.
3. Examinar el manifiesto y el service worker, incluida la estrategia de caché y el funcionamiento sin conexión.
4. Revisar prácticas de seguridad visibles en el manejo y presentación de los datos recibidos.
5. Identificar limitaciones y proponer medidas concretas para los hallazgos observados.

# Metodología

La revisión se llevó a cabo el 7 de octubre de 2026 con las siguientes actividades:

1. Inspección del HTML, JavaScript, estilos, manifiesto, service worker y flujo de GitHub Actions.
2. Apertura del sitio publicado y comprobación de que el documento, los recursos y el service worker están disponibles.
3. Verificación de los datos mostrados: 100 publicaciones, 10 autores y 500 comentarios.
4. Prueba de búsqueda, filtro por autor, paginación, diálogo de lectura y envío de una publicación.
5. Prueba de carga desde caché con el navegador sin conexión, después de visitar el sitio con conexión.
6. Validación sintáctica con `node --check` para los archivos JavaScript, análisis del manifiesto como JSON y revisión de espacios con `git diff --check`.
7. Contraste del uso de la API, el almacenamiento mediante service workers y el despliegue con la documentación oficial citada en la bibliografía.

La revisión fue manual y exploratoria. No se ejecutaron escáneres de vulnerabilidades, una prueba de carga, una matriz completa entre navegadores/dispositivos ni una evaluación formal WCAG.

# Resultados

### Funcionalidad comprobada

| Área | Resultado |
|---|---|
| Carga de datos | Correcta; se muestran 100 publicaciones, 10 autores y 500 comentarios. |
| Búsqueda y filtro | Funcionan y actualizan la lista de resultados. |
| Paginación | Permite recorrer las publicaciones filtradas. |
| Detalle y comentarios | El diálogo muestra el autor, el texto y los comentarios asociados. |
| Creación de publicaciones | La solicitud de demostración se completa y la entrada aparece en la lista actual. |
| Modo sin conexión | Los datos consultados se recuperan de la caché cuando la API no está disponible. |
| Publicación | El sitio se sirve desde GitHub Pages y el despliegue automático terminó correctamente. |
| Validación estática | La sintaxis JavaScript y el manifiesto JSON son válidos. |

### Hallazgos

#### H-01 — Limpieza de cachés ajenas al proyecto

- **Prioridad:** Media.
- **Componente:** `sw.js`, evento `activate`.
- **Evidencia:** La activación enumera las cachés disponibles y elimina toda caché cuyo nombre no sea `cuaderno-static-v1` o `cuaderno-api-v1`.
- **Impacto:** Cache Storage pertenece al origen, no exclusivamente a la ruta de esta aplicación. En `cielo201356.github.io`, una activación podría borrar cachés utilizadas por otros sitios o aplicaciones del mismo origen y afectar su funcionamiento sin conexión.
- **Recomendación:** Usar nombres versionados con un prefijo exclusivo, por ejemplo `cuaderno-static-` y `cuaderno-api-`, y eliminar solamente versiones antiguas de ese prefijo. Conservar las cachés que pertenezcan a otros proyectos.
- **Estado:** Pendiente de corrección; se documenta como resultado de auditoría.

#### H-02 — Las respuestas HTTP fallidas no recurren a la caché

- **Prioridad:** Baja.
- **Componente:** `sw.js`, función `networkFirstApi`.
- **Evidencia:** El respaldo en caché se consulta si `fetch` lanza un error de red. Si el servidor responde con un estado HTTP no exitoso, el service worker devuelve esa respuesta sin intentar servir la versión almacenada.
- **Impacto:** Ante una respuesta temporal `5xx` del servicio, la aplicación puede mostrar un error aunque existan datos anteriores en caché.
- **Recomendación:** Considerar el uso de la respuesta guardada ante errores de servidor, manteniendo un comportamiento explícito para solicitudes del cliente fallidas y señalando que se presentan datos almacenados.
- **Estado:** Mejora sugerida.

### Observaciones positivas y alcance

- Los textos provenientes de la API se escapan mediante `escapeText` antes de insertarse en el HTML; esto reduce el riesgo de inyección de marcado a través de esos campos.
- Los errores de carga y envío se comunican en pantalla, en lugar de presentarse como operaciones exitosas.
- La interfaz informa que JSONPlaceholder no conserva permanentemente las publicaciones creadas.
- El proyecto incluye estados accesibles para carga, error y resultados, etiquetas para controles y estilos de foco visible. No se certificó su conformidad integral con WCAG.
- La estrategia sin conexión depende de haber cargado previamente la interfaz y los datos mientras había conexión; no representa almacenamiento permanente del contenido creado.
- El informe no encontró defectos en las interacciones probadas; las conclusiones se limitan a las rutas y condiciones ensayadas.

# Conclusiones

Cuaderno cumple el objetivo de ofrecer una interfaz estática, funcional y conectada a JSONPlaceholder. Las funciones principales se ejecutaron correctamente tanto en el sitio publicado como en las pruebas de disponibilidad sin conexión. El contenido se muestra de forma segura respecto de los campos de texto revisados y las limitaciones de persistencia de la API están comunicadas con claridad.

La mejora prioritaria es acotar la eliminación de cachés del service worker a las cachés que pertenecen a Cuaderno. Luego se recomienda tratar las respuestas de servidor no exitosas como una oportunidad para mostrar datos previamente guardados. Antes de considerar el proyecto plenamente verificado para producción, convendría ejecutar pruebas automatizadas de regresión y una evaluación de accesibilidad con tecnologías de asistencia y navegadores adicionales.

# Bibliografía

1. JSONPlaceholder. “Guide”. <https://jsonplaceholder.typicode.com/guide/>. Consultado el 7 de octubre de 2026.
2. Mozilla Developer Network (MDN). “Service Worker API”. <https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API>. Consultado el 7 de octubre de 2026.
3. Mozilla Developer Network (MDN). “Web application manifest”. <https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest>. Consultado el 7 de octubre de 2026.
4. GitHub Docs. “Using custom workflows with GitHub Pages”. <https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages>. Consultado el 7 de octubre de 2026.
5. World Wide Web Consortium (W3C). “Web Content Accessibility Guidelines (WCAG) 2.2”. <https://www.w3.org/TR/WCAG22/>. Consultado el 7 de octubre de 2026.
