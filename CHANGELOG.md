# Changelog - LaGochaGaming

Formato basado en Keep a Changelog. Versionado SemVer (`MAJOR.MINOR.PATCH`).
El historial anterior a 1.5.0 está en los commits `v1.4.x`.

## [1.10.0] - 2026-10-30

### Línea de tiempo cósmica de rangos

- Sustituida la escalera Semilla / Gota / Flor / Estrella / Leyenda por seis
  niveles: Polvo Cósmico (0-49), Protoestrella (50-199), Secuencia Principal
  (200-499), Gigante Roja (500-749), Supernova (750-999) y Agujero Negro
  (1000+), cada uno con icono, descripción y multiplicador x1…x6.
- El rango se calcula con los puntos (tabla canónica en `main.js`), así la UI es
  correcta aunque la base de datos aún guarde claves antiguas; se aceptan los
  alias `semilla`, `gota`, `flor`, `estrella` y `leyenda`.
- Nuevo relieve del nombre según el rango en chat, ranking, usuarios en línea,
  muro de saludos, navbar y modal de perfil: más resplandor cuanto más alto el
  rango, con pulso suave en el máximo y respeto de `prefers-reduced-motion`.
- Badges y fila del rango máximo rediseñados en tonos cósmico/violeta; la
  escalera muestra ahora la descripción de cada nivel.
- Se mantienen actualizados el badge, el progreso, el multiplicador y el
  navbar al subir de rango, incluso al gastar puntos en la tienda.
- Migración SQL para Supabase (`calcular_rango`, `multiplicador_rango`, trigger
  de sincronización y recálculo de usuarios existentes).

## [1.9.2] - 2026-10-30

### Reacciones del chat al recargar

- Corregido: las reacciones guardadas en el servidor no se cargaban al abrir
  Comunidad. `cargarMensajesChat` pintaba los mensajes pero nunca pedía los
  chips a Supabase ni marcaba el chat como inicializado, así que solo se veían
  las reacciones que quedaban en `localStorage`.
- Como cerrar sesión limpia esa caché local, al volver a entrar la reacción
  seguía guardada en la base de datos pero desaparecía de la interfaz. Ahora la
  carga inicial (y la de mensajes antiguos) pide las reacciones al servidor.
- El reconciliador de reacciones cada 30 s ahora sí se activa tras la carga
  inicial (antes dependía de que llegara un mensaje nuevo).
- La comparación de `user_id` es tolerante a string/número al marcar la
  reacción como propia, y al restaurar o crear la sesión se refrescan los chips
  para marcar las reacciones que ya existen en el servidor.

## [1.9.1] - 2026-10-30

### Footer sin hueco inferior

- Corregido el hueco (negro en modo OLED) que quedaba bajo el footer en
  Comunidad: `body.comunidad-page` añadía 80px de `padding-bottom` después del
  footer.
- Nuevo layout de página con `.page-shell` y `body` en columna flexible: si el
  contenido es más corto que la pantalla, el footer queda pegado al borde
  inferior (Cine, Sorteo y Comunidad en pantallas altas) en vez de dejar una
  banda vacía debajo.
- Sin cambios en el espaciado interno de las páginas largas ni en las páginas
  que ya hacían scroll.

## [1.9.0] - 2026-10-30

### Tienda en carrusel

- El catálogo de la tienda de comunidad pasa de rejilla vertical a carrusel
  horizontal: se navega deslizando con el dedo, la rueda/trackpad o las flechas
  anterior/siguiente.
- Flechas circulares superpuestas en los laterales del carrusel, centradas
  verticalmente, que se ocultan al llegar al extremo correspondiente. Un clic
  avanza exactamente una tarjeta; los clics rápidos se acumulan.
- Scroll con snap por tarjeta, foco accesible del carrusel y respeto de
  `prefers-reduced-motion` (sin desplazamiento animado).
- Ancho de tarjeta adaptable: una tarjeta completa en el sidebar estrecho de
  escritorio y ~78% del ancho en móvil para ver parte de la siguiente y evitar
  el scroll vertical largo.
- Corregido: el catálogo no se ocultaba al abrir “Mis canjes” porque
  `.tienda-grid` sobreescribía el atributo `hidden`.

## [1.8.1] - 2026-10-30

### Perfil y tienda

- Perfil minimalista: avatar a la izquierda, nombre/rango/bio/redes a la
  derecha; acciones abajo a la derecha.
- Sin placeholders vacíos de “Sin bio” ni “Sin enlaces”.
- Redes principales: X, Instagram, YouTube y Discord. TikTok, Kick, Twitch y
  Web quedan en “Más redes” plegable.
- Enlaces del perfil como iconos compactos con tooltip/aria-label.
- Tienda móvil en 2 columnas con tarjetas compactas, descripción a 2 líneas y
  botones reducidos; menos scroll.
- Botón de cerrar sesión alineado a la derecha en el modal móvil.

## [1.8.0] - 2026-10-30

### Cine 2.0

- Botón “Unirme” persistente en la barra de sala: no desaparece al cargar y
  arranca el play dentro del gesto del usuario (evita el bloqueo de autoplay).
- Barra “Ahora en pantalla”: fuente detectada, estado (reproduciendo/pausado/
  error), espectadores conectados, sincronizar y pantalla completa.
- Reacciones en vivo con Supabase Broadcast: los emojis flotan en la pantalla
  de toda la sala; contador de presencia.
- Soporte de YouTube (watch, shorts, live, embed), Google Drive (file/d,
  open?id, uc?id, lh3) y video directo MP4/WebM/OGG/OGV/MOV, con tipo MIME
  correcto y detección automática.
- Sincronización: heartbeat del streamer cada 8 s, corrección de deriva en
  cada evento y respaldo de lectura cada 20 s.
- Errores claros: YouTube 101/150 muestra “no permite reproducción incrustada”
  y botón “Abrir en YouTube”.
- Cambio de video en caliente: destruye el reproductor anterior y crea el nuevo
  (antes reutilizaba el iframe viejo).

### Notas

- `1.8.0` es MINOR: nuevas funciones de sala y contrato de cine ampliado.
- El video actual `XoNCV9BsU9c` no permite embedding; se muestra error y enlace
  alternativo. Usar un video con incrustación habilitada para probar el sync.

## [1.7.4] - 2026-10-30

### Avatares de tienda

- Nuevos avatares exclusivos de tienda: `avatar-shop-male.webp` y
  `avatar-shop-female.webp` (512x512, recorte circular, WebP).
- Los avatares por defecto (`avatar-male.webp` y `avatar-female.webp`) siguen
  siendo los gratuitos del perfil.
- Premios actualizados en Supabase:
  - `Avatar Cyber Masculino` → `/img/avatars/avatar-shop-male.webp`.
  - `Avatar Cyber Femenino` → `/img/avatars/avatar-shop-female.webp`.

### Diseño

- Botones de cerrar sesión unificados con `.btn-logout`: fondo transparente,
  borde y hover rojo suave, mismo alto/radio que los botones primarios.
- Aplicado en galería, cine, sorteo y modal de perfil.

## [1.7.3] - 2026-10-30

### Correcciones

- Muro de saludos: `btnEliminar` se usaba antes de declararse y rompía el render
  de todas las tarjetas. Ahora los saludos cargan.
- Galería: los usuarios sin sesión ven una tarjeta compacta para iniciar sesión
  en vez del formulario de subida completo; el formulario queda centrado.
- Cine: la cámara de reacción se oculta cuando el stream está offline y se
  reduce en móvil; se eliminó el bloque duplicado de instrucciones; el chat
  vuelve a permitir scroll interno.
- Comunidad: la tienda se oculta sin sesión; se deduplican usuarios de presencia
  con varias pestañas; el perfil compacto (avatar) aparece en navbar móvil y de
  laptops; el modal de perfil incluye “Cerrar sesión”.
- Se eliminaron restos del helper de copiar enlace y se agregó una guarda en
  `scripts/check.js`.
- Se limpiaron las cuentas de prueba `ui_test_172_5057` y `ui_reg_172_8177`
  junto con sus sesiones y canjes.

### Notas

- `1.7.3` es un PATCH sobre `1.7.2`; no cambia contratos de RPC.
- Se reparó nuevamente el UTF-8 de los HTML tras un reemplazo masivo con
  PowerShell; queda documentado en `AGENTS.md` para no repetirlo.

## [1.7.2] - 2026-10-30

### Correcciones
- Perfil: un único modal global; se elimina el formulario inline y la ambigüedad
  de `actualizar_perfil_comunidad` (300 Multiple Choices en PostgREST).
- Registro y login devuelven género, avatar, bio y enlaces; avatar beta según
  género cuando no hay avatar comprado/subido.
- Tienda: catálogo y canjes usan las columnas reales (`costo_puntos`, `nombre`,
  `entregado_at`); se añaden dos avatares beta y se equipa avatar/icono al canjear.
- Ranking y navbar muestran avatar; aviso para elegir género.
- Migración local `supabase/migrations/20261031000000_beta_1_7_2_correcciones.sql`.
- `scripts/check.js` vigila el helper de copiar enlace.

## [1.7.1] - 2026-10-30

### Cambios
- Refinada ayuda admin en cine (resumen conciso) y galeria (explica ban/shadowban).

## [1.7.0] - 2026-10-30

### Funciones nuevas
- Género en cuentas de comunidad (`masculino`/`femenino`/`no_definido`) y avatares beta locales.
- Avatares de tienda (`tipo='avatar'`) con validación de propiedad.
- Modal global de perfil/ajustes inyectado desde `main.js`.
- Tienda privada: catálogo exige token de comunidad; pestaña oculta sin sesión.
- Ayuda plegable en paneles admin de galería y cine.

### Cambios
- Eliminado "copiar enlace" de muro, chat y galería.
- `tienda_obtener_catalogo` ahora requiere `p_token`.

## [1.6.0] - 2026-10-30

### Funciones nuevas

- Perfiles de comunidad: avatar en `avatares-comunidad`, bio (160), enlaces
  whitelist e icono equipado. Nuevo RPC `actualizar_perfil_comunidad`.
- Tienda de puntos: `tienda_premios`, `tienda_canjes`, catálogo público,
  canje transaccional con stock, puntos y un icono por usuario.
- Reacciones del muro: `muro_reactions`, RPCs `establecer_reaccion_muro` y
  `obtener_reacciones_muro`, realtime y actualización en sitio.
- Moderación: lista de usuarios, ban temporal, shadowban y auditoría
  (`admin_audit_log`) desde el panel de galería.
- Historial de chat por RPC `obtener_chat_historial`; lectura pública sin token
  y mensajes ocultos visibles solo para su autor.
- Tema OLED de tres estados y helpers de copiar enlace.

### Seguridad e integridad

- Baneo validado en login, sesión, chat, muro, puntos, likes, reacciones,
  galería, tienda y perfil; al banear se eliminan las sesiones.
- `admin_*` exige `es_admin()` y registra ban/shadowban en auditoría.
- Avatar validado por bucket y carpeta del usuario; enlaces `http/https`.
- Nuevas tablas internas con RLS y políticas de denegación explícita.
- Se corrigió XSS en el detalle de auditoría (`formatearDetalle` escapado).

### Correcciones de la implementación

- Galería: el panel unificado no se abría (`panelPendientes` inexistente),
  las pestañas Usuarios/Auditoría tenían `hidden` fijo y las acciones admin no
  estaban expuestas en `window`.
- CSS: la media query de 1200px quedó sin cerrar y metía todo el panel admin
  dentro de ella; el panel quedaba sin estilos en escritorio.
- Comunidad: HTML roto en las pestañas (`</butto` y `n>`), tarjeta
  "Tienda próximamente" duplicada, historial de chat vacío sin sesión y
  actualización de puntos tras canje usando un RPC de crédito en vez del saldo.
- Tema: el ciclo de temas usaba una constante y no avanzaba más de una vez.
- `obtener_chat_historial` y `tienda_*` creados en Supabase; la carpeta local
  `supabase/` sigue ignorada.

### Notas de migración

- Migraciones aplicadas: columnas de perfil/ban, `muro_reactions`, tienda,
  admin/auditoría, perfil/chat/baneo, helpers, bucket de avatares, políticas
  de denegación e índices de FK.
- El catálogo inicial trae tres iconos (100, 250 y 500 pts). Se puede editar
  en `tienda_premios`.
- Los iconos se muestran en perfil y ranking; extenderlos al chat requiere
  guardar/consultar el icono por autor.

## [1.5.1] - 2026-10-30

### Responsive

- Navbar: el menú hamburguesa entra en `<=1100px` (antes `<=900px`). Entre
  901 y 1100 los enlaces se partían en dos filas y se solapaban con el hero.
- `#nav-user-info` se oculta hasta `1399px` para dejar sitio a logo, enlaces y
  tema sin solapes en tablets y portátiles pequeños; reaparece desde `1400px`.
- Menú móvil: cierra al rotar/ampliar la pantalla, actualiza `aria-label` y
  `aria-expanded`, y enlaza `aria-controls` con el panel.
- Chat de Kick en el home: el layout móvil usaba `flex: 0 0 24%`, que anulaba
  `height: 350px` y dejaba el iframe en ~152px. Ahora usa `flex: 0 0 auto` y
  alto `clamp(480px, 60vh, 600px)`.
- Se quitó `scrolling="no"` del iframe de Kick para permitir el scroll interno.
- El stream y el chat se apilan hasta `1280px` (antes `1024px`), evitando un
  chat de ~250px en tablets y portátiles pequeños.
- El video conserva 16:9 en móvil: se quitó el `min-height: 300px` que lo
  deformaba a ~335x300 en pantallas de 390px.

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
- Migraciones aplicadas en Supabase; la carpeta local `supabase/` no se versiona.

### Notas de migración

- Los contadores de likes existentes se conservan. El historial por usuario
  empieza a registrarse desde 1.5.0; no se puede reconstruir el like de cada
  usuario anterior.
- Aplicar las migraciones en orden:
  `20261029213000`, `20261029213100`, `20261029214500`, `20261029215000`,
  `20261029215500`.
- Tras desplegar, probar Realtime (chat, galería, sorteo y cine) y los RPCs con
  una cuenta de comunidad temporal; limpiar los datos de prueba.
