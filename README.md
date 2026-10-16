# Cuaderno

Aplicación web progresiva en español para descubrir, buscar y filtrar publicaciones de JSONPlaceholder, leer sus comentarios y enviar publicaciones de prueba.

## Ejecutar

El service worker y la instalación requieren `localhost` o HTTPS. Desde esta carpeta, inicia un servidor estático, por ejemplo:

```bash
python -m http.server 8000
```

Abre <http://localhost:8000>. La aplicación consulta `/posts`, `/users` y `/comments` en JSONPlaceholder. Las historias nuevas se guardan directamente en el almacenamiento local del navegador, por lo que se pueden crear y conservar sin conexión después de abrir la aplicación. Solo están disponibles en ese navegador y dispositivo; borrar los datos del sitio las elimina.

El service worker precarga la interfaz y conserva en caché las respuestas de la API para que el contenido consultado siga disponible sin conexión.

## Publicación en GitHub Pages

Cada cambio que se suba a `main` se publica automáticamente con GitHub Actions. Cuando termine correctamente el flujo **Deploy to GitHub Pages**, la aplicación estará disponible en <https://cielo201356.github.io/pagina_web_progesiva/>.

Si Pages aún no está habilitado en el repositorio, en **Settings → Pages → Build and deployment** selecciona **GitHub Actions** como origen de publicación.
