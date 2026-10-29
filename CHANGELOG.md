# Changelog - LaGochaGaming

Formato basado en Keep a Changelog. Versionado SemVer (`MAJOR.MINOR.PATCH`).
El historial anterior a 1.5.0 está en los commits `v1.4.x`.

## [1.5.0] - 2026-10-29

### Seguridad e integridad

- Likes por usuario: nueva tabla `galeria_likes` con PK `(image_id, usuario_id)`.
  `incrementar_likes` ahora hace toggle real por cuenta (no acepta incrementos
  arbitrarios desde el cliente). Nuevo RPC `obtener_likes_galeria` para cargar
  el estado "me gusta" desde el servidor; se eliminó el estado de likes en
  `localStorage`.
- Puntos: el cooldown de 5 minutos pasa a ser por cuenta (`usuarios_comunidad.ultimo_punto`)
  con `FOR UPDATE`. Ya no se puede multiplicar abriendo varias sesiones.
- Chat: el rate limit de 2.5 s se valida contra todas las sesiones de la cuenta
  y se serializa con `FOR UPDATE` sobre el usuario.
- Reacciones: whitelist de emojis en el servidor y escapado del emoji en el
  tooltip (evita inyección de HTML).
- Sorteo: registro limitado a 30 intentos por IP cada 10 minutos; índice único
  `lower(username)`; `sortear_ganador_sorteo` y `registrar_ganador_sorteo`
  quedan solo para `authenticated`. El cliente ya no inserta ganadores.
- Galería: el login de moderación valida `app_metadata.role = "admin"` antes de
  activar el panel. Se corrigió el clic de like/borrar que abría el lightbox.
  El clic en acciones ya no se detiene antes del listener delegado.
- `_headers`: CSP con `wss://*.supabase.co` (Realtime) y `https://www.youtube.com`
  (IFrame API). Se documentó que GitHub Pages ignora este archivo.

### Correcciones

- Galería: `aria-label` de las tarjetas usaba `{{ }}` dentro de un atributo
  Alpine; ahora usa una expresión válida.
- Galería: el realtime de likes ya no recarga toda la galería en cada like.
- Galería: miniaturas (`thumb_url`) cuando existen; validación de bytes AVIF
  más estricta; límite de título alineado a 60 caracteres.
- Comunidad: la lista de presencia muestra "Nadie en línea" al suscribirse sin
  usuarios (antes quedaba en "Cargando usuarios...").
- Comunidad: se limpian cachés de reacciones/likes al cerrar sesión o invalidar
  el token para no heredar estado entre cuentas.
- Sorteo: los errores al abrir/cerrar o vaciar ya no se ocultan; si el servidor
  no puede sortear no se inventa un ganador local.
- Cine: la sincronización MP4 ya no depende de la YouTube IFrame API; se añadió
  botón "Unirme a la reproducción" para sortear el bloqueo de autoplay.
- Home: límite del muro alineado a 280 caracteres; typo "mis redes".
- Confeti respeta `prefers-reduced-motion`.

### Herramientas y documentación

- `AGENTS.md` con reglas de stack, Supabase, seguridad, despliegue, SemVer y
  checklist de pruebas.
- `scripts/check.js`: validación estática sin dependencias (sintaxis JS inline,
  IDs duplicados, recursos locales, SemVer, CSP, mustaches Alpine).
- Migraciones en `supabase/migrations/` para todos los cambios de base de datos.

### Notas de migración

- Los contadores de likes existentes se conservan. El historial por usuario
  empieza a registrarse desde 1.5.0; no se puede reconstruir el like de cada
  usuario anterior.
- Aplicar las migraciones en orden:
  `20261029213000`, `20261029213100`, `20261029214500`, `20261029215000`,
  `20261029215500`.
- Tras desplegar, probar Realtime (chat, galería, sorteo y cine) y los RPCs con
  una cuenta de comunidad temporal; limpiar los datos de prueba.
