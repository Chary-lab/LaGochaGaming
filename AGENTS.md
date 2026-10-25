# AGENTS.md — LaGochaGaming

> **Léeme primero.** Este archivo es el mapa del proyecto. No abras los HTML completos para "explorar":
> identifica aquí el archivo y la sección, y usa `grep`/lectura por rangos. Los números de línea son
> aproximados y se desplazan al editar; guíate por los nombres de secciones y funciones.

**Repo:** github.com/Chary-lab/LaGochaGaming · **Prod:** lagochagaming.com (GitHub Pages, rama `main`, sin build)
**Supabase:** `cydiyaacnyydprgffmkq` · `us-west-2` · Postgres 17.11
**Versión:** v1.4.0 · **Actualizado:** 2026-10-25 · **BD:** verificada por PostgREST `anon` y por SQL el 2026-10-25 (40 migraciones, políticas, permisos y Advisors leídos)

**Regla de oro:** 5 HTML + `main.js` + `style.css`. Sin frameworks nuevos, sin npm, sin bundler, sin archivos extra.

---

## 1. Mapa de archivos

| Archivo | Líneas | Qué hay | Abrir cuando… |
|---|---:|---|---|
| `index.html` | 550 | Home: hero, stream Kick, clips, feed social, YouTube, muro | Tocar la portada o el stream |
| `galeria.html` | 1103 | Galería pública, subida, moderación admin, lightbox | Fotos, likes, aprobación |
| `comunidad.html` | 1960 | Chat, ranking, online, reacciones, muro, celebración | Chat o usuarios |
| `cine.html` | 648 | GochiWatch: YouTube IFrame API, panel streamer, sync_cine | Cine o reproducción |
| `sorteo.html` | 905 | Sorteo manual/streamer, participantes, ganadores | Sorteos |
| `main.js` | 631 | Helpers globales, admin, tema, toasts, modales, polling | Lógica compartida |
| `style.css` | 3439 | Tema claro/oscuro, layout, componentes, responsive | Cualquier estilo |
| `_headers` | 7 | CSP/HSTS/etc. **GitHub Pages lo ignora** | Seguridad/cabeceras |
| `VERSION` | 1 | Dice la versión actual (`1.2.8`) | Release |

- Sin tests automatizados ni build. Verificación = abrir las 5 páginas y revisar consola.
- Deploy: push a `main` en GitHub Pages. `CNAME` = `lagochagaming.com`.
- Docs profundas (solo si hace falta): `auditoria-web.md`, `auditoria-bd.md`, `auditoria-sg.md`.

---

## 2. `main.js` — índice por bloques

| Líneas | Contenido |
|---|---|
| 12–16 | `SUPABASE_URL`, `SUPABASE_KEY` (anon), `window.supabase` |
| 31–41 | `escapeHtml`, `escapeAttr` (usar siempre con datos de BD) |
| 43–85 | `esAdminActual()` vía RPC `es_admin()` (exige sesión + email confirmado, caché por `user.id`), `onAuthStateChange`, `refrescarCacheAdmin()` |
| 89–155 | `lanzarConfetti(canvasId, opciones)` |
| 159–199 | Trampa de foco para modales (`activarTrampaFoco`, `desactivarTrampaFoco`) |
| 203–225 | `initTema`, `toggleTema` (persistencia en localStorage) |
| 229–270 | `cerrarSesion`, `cerrarSesionAdminGlobal` |
| 272–294 | `actualizarUsuarioNavComunidad`, `validarSesionStreamer` |
| 298–385 | `insertarComponentesUIGlobales`, alertas/toasts de stream, `mostrarToast` |
| 387–432 | `mostrarConfirmacionModal` + cierre de modales |
| 436–468 | `inicializarMenuMovil`, `inicializarNavLinks` |
| 477–646 | Polling de Kick: `verificarEstadoStream`, backoff, `visibilitychange`, intervalo 90 s |

Patrón: todo se expone en `window.*` (no hay módulos ES). `main.js` se carga con `defer` en las 5 páginas; Supabase debe cargarse antes. `DOMContentLoaded` al final inicializa polling, UI global, tema, menú y nav.

---

## 3. Páginas: secciones y estado

### `index.html`
- Secciones: `#stream` (Kick iframe), `#clips`, `#social` (Juicer), `#youtube`, `#muro`.
- Scripts inline: 302–645. Helpers propios + muro de saludos.
- **Bug:** ~línea 633, detección de fallo del iframe de YouTube inútil (`contentWindow` siempre truthy entre orígenes) → el fallback no aparece si el video falla.

### `galeria.html`
- Alpine store `galeria` (línea ~611) + fallback si Alpine no inicializó.
- Grid responsive, lightbox, subida a Storage, panel de pendientes/admin.
- `width`/`height` ya puestos; validación de magic bytes en subida (solo cliente).
- **Corregido (desde v1.0.0):** el login admin valida `esAdminActual()` antes de activar `adminAutenticado`.
- **Corregido (v1.2.10):** el login admin vive en `<form id="form-admin-login">` (submit real, Enter nativo, autofill del gestor de contraseñas); el botón es `#btn-entrar-admin` y el delegado ya no maneja `login-admin`.
- **Corregido (v1.2.12):** la plantilla de pendientes pone el `<img>` dentro de `.gallery-card-image-wrap` como la galería pública. Antes iba suelto y, al ser `.gallery-card img { position:absolute; inset:0 }`, la foto se estiraba sobre toda la tarjeta y tapaba título, autor y los botones Aprobar/Rechazar (`elementFromPoint` devolvía `IMG`, no el botón). También `aplicarEstadoAdmin()` centraliza el estado de moderación (clase `admin-mode-active`, `#panelPendientes`, `#btn-logout-galeria`, `#btn-toggle-admin` y `loadPendingImages()`), y un `onAuthStateChange` lo reevalúa si la sesión cambia fuera de la pestaña. Antes, si la sesión de admin aparecía **después** de cargar (login en otra pestaña o página, sesión restaurada), el panel se quedaba oculto y "Modo Moderación" volvía a pedir login con la sesión ya válida.
- **BD (v1.2.11):** la policy `SELECT` ya no es `true`; devuelve solo `estado = 'aprobado' or es_admin()`, así que `anon` no ve las `pendiente`.

### `comunidad.html`
- Stores `chat`, `ranking`, `reacciones` (~745–760).
- Chat con Realtime, scroll inteligente, typing indicator, reacciones accesibles, rate limit visual.
- Ranking/rango, usuarios online, muro, modal de bienvenida y celebración de rango.
- Script inline grande: ~738–2378.
- **Corregido (v1.2.8):** `#canal-preview` ya no tiene `src=""`; el JS asigna `src` solo cuando hay stream.
- **Corregido (v1.2.13):** el login del apodo vive en `<form id="form-nickname" novalidate>` (Enter nativo, sin listeners `keydown` duplicados) con `autocomplete="username"` / `current-password`; el PIN ya no dispara el aviso `[DOM] Password field is not contained in a form`.
- **Corregido (v1.2.14):** el modal de apodo tiene `aria-label` en apodo/PIN y el error es `role="status"` + `aria-live="polite"`; el botón se deshabilita mientras la RPC está en vuelo (no hay doble envío ni doble intento de rate limit) y `rate_limited` se traduce. Fuera `nicknameModalSetBtn` (sin uso) y `cerrarModalComunidad()` (código muerto).
- **Corregido (v1.2.15):** el registro ya no llama `login_comunidad` antes de `registrar_comunidad` (gastaba el cupo de login); el duplicado se detecta por el `apodo_duplicado` del servidor y muestra el mismo aviso.
- **A11y (v1.4.0):** el encabezado de la barra lateral es `<h2>` (antes `h3`, saltaba desde el `h1`); `#chat-autor` tiene `aria-label`. Skip-link y Escape del menú móvil: ver nota global al final de la sección.

### `cine.html`
- YouTube IFrame API (`onYouTubeIframeAPIReady`) + Supabase + Realtime con reconexión automática.
- Panel maestro del streamer para cambiar video; login **valida `esAdminActual()`** (v1.2.3).
- Overlay de carga/error (`#cinePlayerOverlay`) + panel de instrucciones (`#streamerAdminPanel .admin-instructions`) colapsible, oculto por defecto, visible solo al admin.
- **Corregido (v1.2.6):** instrucciones colapsible (`data-action="toggle-instrucciones"`); tip corregido a formato específico de YouTube/Drive (no se promete conversión mágica).
- **Corregido (v1.2.13):** login streamer en `<form id="form-login-cine" novalidate>` con Entrar `#btn-entrar-cine` (`type="submit"`); fuera el listener `keydown` y el `case 'login-streamer'`.

### `sorteo.html`
- Store `sorteo` (~626). Modo streamer para admin, modo manual/público para el resto.
- Participantes, pesos, ganadores, reglas, banner.
- **Corregido (desde v1.0.0):** el login streamer valida `esAdminActual()`.
- **Sorteo:** el modo streamer usa `sortear_ganador_sorteo` (servidor) con fallback local; el modo público gira en cliente y no se registra. Si el servidor falla, `guardarGanadorOficial()` inserta directo en `ganadores_sorteo` (~1266).
- **Registro en vivo (diseño):** manda `config_sorteo.abierto`. Al abrirlo, `#banner-estado-sorteo` (fuera de las pestañas, visible para todos) muestra el formulario `#input-usuario-temporal`; `enviarParticipacionTemporal()` verifica el handle contra Kick y llama `registrar_participante_sorteo`. Al registrarse, `gochi_registrado_user` (localStorage) sustituye el formulario por el banner «YA ESTÁS PARTICIPANDO», de modo que cada navegador registra una sola vez; el servidor añade `username` único e `idx_participantes_kick_user_unico`. Al cerrar el sorteo se borra esa clave y se muestra «cerrado»; al reabrir, todos pueden registrarse otra vez (ronda nueva). El registro público **no exige cuenta de comunidad: es intencional** (sorteos de comunidades externas). La pestaña manual es solo una lista local (`listaPublica`) y no escribe en Supabase.
- **Corregido (v1.2.8):** typo `premiosincreíbles`, `<meta>` y `manifest` pegados, y la meta description ya no afirma que el modo manual sortee en el servidor.
- **Corregido (v1.2.13):** login streamer en `<form id="form-login-sorteo" novalidate>` con Entrar `#btn-entrar-sorteo` (`type="submit"`); fuera el listener `keydown` y el `case 'login-streamer'`.

### `style.css` — bloques
- 2–52 variables/tema claro-oscuro · 93–232 hero/layout · 233–265 social · 266–707 galería/lightbox · 708–773 muro · 774–883 UI/toasts/modales · 884–983 navbar/móvil · 984–1796 rangos y badges · 1797–1858 detalles (`[x-cloak]`, `.visually-hidden` de respaldo). `.skip-link` y `.skip-link:focus` están en ~1763.

- **A11y global (v1.4.0):** las 5 páginas llevan `<a class="skip-link">` como primer elemento del `<body>`; el destino es `#stream` en `index.html` y `#contenido` (con `tabindex="-1"`) en el resto. Los 8 campos que no tenían nombre accesible llevan `aria-label`: `muro-autor`, `muro-mensaje`, `imageTitleInput`, `chat-autor`, `inputVideoUrl`, `nombre-input-publico`, `input-usuario-admin`, `select-peso-admin`. `main.js` cierra el menú móvil con Escape y devuelve el foco, sincroniza `aria-expanded` y marca el confeti con `aria-hidden="true"`. Contraste del skip-link medido: 9.96:1 (oscuro) y 9.72:1 (claro).

---

## 4. Base de datos (verificado por PostgREST `anon` y por SQL el 2026-10-25)

Tablas (10): `comunidad_chat`, `comunidad_sesiones`, `config_sorteo`, `galeria`, `ganadores_sorteo`, `message_reactions`, `muro_saludos`, `participantes_en_vivo`, `sync_cine`, `usuarios_comunidad`.

- **Filas visibles (2026-10-24):** `galeria` 11 (todas aprobadas), `muro_saludos` 55, `usuarios_comunidad` 2, `message_reactions` 1, `comunidad_chat` 1, `config_sorteo` 1 (`abierto=false`), `sync_cine` 1 (`pause`), `ganadores_sorteo` 0, `participantes_en_vivo` 0, `comunidad_sesiones` 0 visibles (RLS).
- **Columnas revocadas para `anon`:** `usuarios_comunidad.pin_hash`, `apodo_norm`, `ultimo_punto` (HTTP 401). `id`, `apodo`, `puntos`, `rango` sí se leen.
- **RLS escrituras:** `anon` no tiene `INSERT`/`UPDATE`/`DELETE` en `galeria` ni `muro_saludos` (HTTP 401, `42501`); todo pasa por RPC `SECURITY DEFINER`. `authenticated` (admin) conserva `UPDATE`/`DELETE` directos para moderar. **v1.4.0:** además se revocaron a `anon` `INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER` (tabla y columna) en las 10 tablas y todos los privilegios de las 8 secuencias; probado: `PATCH`/`DELETE` con la clave pública dan **401** (antes 200 con `[]` por RLS). `authenticated` conserva los 30 `INSERT/UPDATE/DELETE` que necesita para moderar.
- **RLS lectura:** `galeria` y `muro_saludos` filtran por `estado = 'aprobado' or es_admin()`; el resto de tablas públicas usa `true` (chat, config, ganadores, participantes, reacciones, sync, usuarios). Probado: una fila `pendiente` no se ve por `anon` ni por id directo.
- **`comunidad_sesiones`:** 0 filas visibles; RLS sin políticas → solo RPC `SECURITY DEFINER` (intencional).
- **RPC:** `es_admin()` es `sql STABLE`, `SECURITY INVOKER`, `search_path=''` y su cuerpo es `select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)`; **24 políticas RLS** de 8 tablas + `storage.objects` dependen de ella, igual que **4 funciones** (`sortear_ganador_sorteo`, `asignar_peso_sorteo`, `publicar_foto_galeria`, `actualizar_autor_galeria`). El rol vive en `app_metadata.role` (solo escribible por `service_role`/Admin API); `user_metadata` no sirve porque lo edita el usuario. `sortear_ganador_sorteo()` y `asignar_peso_sorteo(text,int)` son `SECURITY DEFINER`, comprueban `es_admin()` y **`anon` no puede ejecutarlas** (solo `authenticated`/`service_role`). `incrementar_likes(p_token,p_image_id,p_delta)` valida sesión de comunidad y `delta ∈ {-1,1}`. `publicar_foto_galeria` exige sesión y URL de Storage; `publicar_saludo_muro` acepta invitados (token opcional), con autor validado, nombres de miembros reservados y rate limit 3/hora por autor.
- **Riesgo aceptado (T5-01, 2026-10-25):** `registrar_participante_sorteo(text,bigint)` es `SECURITY DEFINER` y `anon` puede ejecutarla sin sesión. **Es intencional**: el registro público no exige cuenta de comunidad (sorteos de comunidades externas). El servidor garantiza un nombre por ronda (`username` único) y el cliente cierra el formulario tras registrarse; un usuario técnico podría falsear el `kick_user_id`, porque la verificación del handle es cliente. La mitigación completa exigiría verificar Kick en servidor (Edge Function), fuera del stack actual. El streamer controla el riesgo abriendo y cerrando `config_sorteo.abierto`.
- **Higiene verificada (v1.4.0):** 1 solo trigger (`trg_usuarios_rango`, `SECURITY INVOKER`, `search_path=''`, correcto); las 27 funciones de `public` fijan `search_path` (11 con `public`, no explotable: todas las referencias van cualificadas); políticas completas revisadas (ninguna escritura de `anon`; `comunidad_chat` solo `SELECT` público + `DELETE` admin; `comunidad_sesiones` deny-all); extensiones en `extensions`, no en `public`; sin vistas ni matviews. Advisors leídos: 11 WARN `anon_security_definer_function_executable` por diseño salvo T5-01, y `auth_leaked_password_protection` en WARN (ajuste de Auth, no SQL).
- **Auth:** `disable_signup=false`, `mailer_autoconfirm=false`, solo proveedor email. Sin MFA. Única cuenta: `gocha@admin.com`, confirmada y con `app_metadata.role = 'admin'`. **`admin.com` no es un buzón real** (su MX apunta a `localhost.admin.com`): la recuperación de contraseña solo es posible por Admin API con `service_role`/PAT, no por correo.
- **Auth comunidad:** `login_comunidad`, `registrar_comunidad`, `validar_sesion_comunidad`, `cerrar_sesion_comunidad`; rate limit 5/15 min por IP (`auth_puede_intentar` + `auth_registrar_fallo`) que **solo cuenta fallos** y purga filas viejas al registrar uno. `auth_rate_limit` tiene RLS ON y sin permisos para `anon`/`authenticated` (v1.2.15); antes `anon` podía leer IPs y borrar filas con la clave pública.
- **Migraciones:** 40 (últimas `endurecer_grants_anon_y_participantes` y `quitar_indice_kick_uid_duplicado`), sin Edge Functions.
- **Storage:** bucket `fotos-galeria` público, 5 MB, png/jpeg/webp/gif/avif.
- **Índices:** los 4 "sin uso" (`idx_galeria_estado_created`, `idx_galeria_estado_likes`, `idx_chat_created`, `idx_usuarios_puntos`) tienen 0 scans **porque las tablas tienen 1–11 filas**; los 4 coinciden con consultas reales (orden por `created_at`/`likes`/`puntos`) y ocupan 64 KB en total. Se mantienen a propósito: borrarlos no ahorra nada y quita cobertura cuando las tablas crezcan.
- **Eliminado (v1.2.11):** tabla `donaciones` (0 filas, 0 referencias, 3 políticas, una de ellas `INSERT` público) y la RPC `obtener_donaciones_recientes()`; sobrecarga `incrementar_likes(bigint,int)` (sin control de sesión); sobrecarga `publicar_foto_galeria(text,text,text)` (causaba `PGRST203` y rompía la subida de usuarios de comunidad).
- **Eliminado (v1.2.15):** `registrar_intento_auth(text)`, sustituida por `auth_puede_intentar(text)` (consulta) y `auth_registrar_fallo(text)` (inserta y purga); `anon`/`authenticated` sin `SELECT`/`INSERT`/`UPDATE`/`DELETE`/`TRUNCATE` sobre `auth_rate_limit`.
- **Pendiente de verificar:** nada de triggers, `search_path`, políticas ni Advisors (todo revisado en v1.4.0). T5-01 queda como riesgo aceptado (ver arriba); solo queda el ajuste de Auth `auth_leaked_password_protection`.

---

## 5. Recetas para cambiar cosas

- **UI de una página:** busca el `<section>`/`<h2>` en el HTML, edita solo ese bloque, reutiliza clases de `style.css`. No reescribas el archivo completo.
- **Lógica compartida:** añade `window.miFuncion = function…` en `main.js`, úsala desde las páginas y pruébala en las 5.
- **Lógica exclusiva:** script inline de esa página (así está hecho hoy). Mantén el orden: Supabase → `main.js` (`defer`) → Alpine (`defer`).
- **Datos:** `window.supabase.from(...)` para lecturas; para escrituras sensibles usa RPC `SECURITY DEFINER`, no expongas `service_role`.
- **Admin:** `window.esAdminActual()` → RPC `es_admin()`, que lee `app_metadata.role` del JWT y exige sesión + email confirmado; nunca compares emails en el cliente. La cuenta `gocha@admin.com` está confirmada y tiene `app_metadata.role = 'admin'`; dar o quitar admin es un `PUT /auth/v1/admin/users/{id}` con `service_role`, sin migración. Si el panel no aparece tras un cambio de rol, refresca la sesión: el claim viaja en el token.
- **Estilos:** usa variables de `:root` y media queries existentes; modo claro/oscuro debe seguir funcionando.
- **XSS:** todo dato de BD en `innerHTML` pasa por `escapeHtml`/`escapeAttr` o se inserta con `textContent`.

---

## 6. Problemas conocidos (prioridad)

1. **Cabeceras inertes (T4, aplazada por decisión del usuario):** `_headers` no lo aplica GitHub Pages (devuelve 404). Producción sin CSP/HSTS reales. Requiere Cloudflare por delante o cambiar de hosting; no se toca por ahora.
2. **Peso:** Bootstrap CSS y Font Awesome completos con uso mínimo; CSS/JS inline duplicado; fuentes de Google; `img/1-3.jpg` 1024×576 (~430 KB).
3. **A11y restante:** los 8 campos, el skip-link, Escape del menú móvil, el confeti y la jerarquía de `comunidad.html` están resueltos (v1.4.0). Queda la jerarquía de encabezados de `galeria.html` (`H1,H3,H2,…`), `cine.html` (sin `h2`) y `sorteo.html` (`H3` antes del `H1`): exige revisar qué reglas CSS dependen de `h3` antes de cambiar etiquetas.
4. **Detalles menores:** atributos deprecated en iframes; `AGENTS.md:61` sigue describiendo como bug vivo el fallback de YouTube de `index.html` (marcado como corregido en la prioridad antigua); *Leaked password protection* desactivado en Auth.

**Riesgo aceptado (T5-01):** `registrar_participante_sorteo` se puede llamar con `anon` sin sesión. Es el precio del registro público sin cuenta (sorteos de comunidades externas): un nombre por ronda, formulario que se cierra al registrarse y streamer que abre/cierra el sorteo. La verificación de Kick es cliente, así que un usuario técnico podría falsear el `kick_user_id`; cerrarlo del todo exigiría Edge Functions, fuera del stack. No reabrir sin cambiar esa decisión de producto.

**Resueltos:** login admin/streamer valida `esAdminActual()` (galería y sorteo, desde v1.0.0); `galeria.html`/`sorteo.html` ya no abren panel con cualquier cuenta. Cine en v1.2.3 (`<source>` vacío, fallback de YouTube, login). v1.2.6/v1.2.7 instrucciones del panel streamer. v1.2.8 `src=""` de `#canal-preview`, `<h1>` en comunidad, typos y metas de `sorteo.html`, 34 botones con `type="button"`, comentario "60s" → 90 s. v1.2.9 `esAdminActual()` migrado a la RPC `es_admin()` (sin email hardcodeado en el cliente, exige email confirmado, caché por usuario). v1.2.10 login admin de `galeria.html` dentro de un `<form>` real (Enter nativo y autofill; fuera el aviso `[DOM] Password field is not contained in a form`). v1.2.11 (solo BD, 2 migraciones): `SELECT` de `galeria`/`muro_saludos` limitado a `aprobado` + `es_admin()`; `anon` sin `INSERT`/`UPDATE`/`DELETE` directos; eliminadas `donaciones`, `obtener_donaciones_recientes()`, `incrementar_likes(bigint,int)` y la sobrecarga ambigua de `publicar_foto_galeria` que rompía la subida de usuarios de comunidad. v1.2.12 `galeria.html`: la tarjeta de pendientes usa `.gallery-card-image-wrap` (la foto ya no tapa título, autor ni los botones Aprobar/Rechazar) y `aplicarEstadoAdmin()` + `onAuthStateChange` mantienen el panel de moderación y "Modo Moderación" sincronizados con la sesión real aunque el login ocurra en otra pestaña. v1.2.13 `comunidad.html`/`cine.html`/`sorteo.html`: los tres campos `type="password"` van dentro de un `<form novalidate>` real con botón `type="submit"`, así que el aviso `[DOM] Password field is not contained in a form` desaparece y Enter funciona de forma nativa; se quitaron los listeners `keydown` manuales y los `case 'login-streamer'` ya muertos, y el apodo/PIN declaran `autocomplete` para que DevTools no recomiende nada. Las 5 páginas quedan con la consola sin avisos `[DOM]`. v1.2.14 `comunidad.html`: `aria-label` en apodo/PIN y error con `role="status"` + `aria-live="polite"`; el botón Entrar se deshabilita durante la RPC (sin doble envío) y `rate_limited` ya se traduce en vez de mostrar `Error: rate_limited`; eliminados `nicknameModalSetBtn` y `cerrarModalComunidad()`, que no se usaban. Quedaban 8 campos sin nombre accesible en el resto de páginas (resueltos en v1.4.0). v1.2.15 (BD + cliente): el rate limit de comunidad solo cuenta fallos — 6 logins correctos seguidos ya no bloquean — y purga filas de más de 15 min; `auth_rate_limit` pasa a RLS ON y sin permisos para `anon`/`authenticated`, porque con la clave pública se podían leer las IPs y borrar filas para saltarse el límite; el registro dejó de llamar `login_comunidad` antes de `registrar_comunidad`. v1.3.0 (solo BD + comentario): `es_admin()` deja de comparar `auth.email()` y pasa a leer `app_metadata.role` del JWT (`select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false)`); la cuenta `gocha@admin.com` lleva `app_metadata.role = 'admin'` desde la Admin API. Las 24 políticas y las 4 funciones que dependen de `es_admin()` no cambian. Se aplicó en dos migraciones (con fallback por email y luego sin él) y se verificó con sesión real: admin `true`, `anon` `false`, usuario autenticado sin rol `false`, pendientes visibles solo para admin, aprobar/rechazar y Storage OK, RPC de sorteo admin 200 / `anon` 401. Consecuencia asumida: el email queda solo como login y la recuperación es exclusivamente por Admin API, porque `admin.com` no recibe correo. v1.4.0 (a11y + BD): skip-link en las 5 páginas (visible al foco, contraste 9.96:1 oscuro / 9.72:1 claro, foco al destino con Enter), `aria-label` en los 8 campos que no tenían nombre accesible, Escape cierra el menú móvil y devuelve el foco con `aria-expanded` sincronizado, confeti con `aria-hidden`, y `comunidad.html` sin salto `h1`→`h3` (la barra lateral pasa a `h2`). En BD se revocaron a `anon` `DML/TRUNCATE/REFERENCES/TRIGGER` (tabla y columna) y los privilegios de las secuencias: `PATCH`/`DELETE` con la clave pública pasan de 200 (`[]` por RLS) a 401; `authenticated` conserva los 30 `INSERT/UPDATE/DELETE` de moderación y se verificó con sesión real (galería, Storage y RPC de sorteo OK). Advisors, triggers, `search_path` y políticas revisados: sin hallazgos nuevos salvo `registrar_participante_sorteo` (riesgo aceptado por diseño del sorteo público). Se quitó un índice único duplicado en `participantes_en_vivo` (ya existía `idx_participantes_kick_user_unico`).

---

## 7. Reglas de trabajo

- **Stack cerrado:** Vanilla JS, Bootstrap CSS, Alpine 3.17.5, Supabase JS v2 (2.118.0 fijado). Nada de npm/frameworks nuevos.
- **Sin archivos extra:** todo va en las 5 páginas, `main.js` o `style.css`. No `.env`, bundlers ni configs.
- **Reutilizar** helpers, clases, modales y toasts. No duplicar lógica.
- **Sin comentarios** en código salvo pedido. Variables/clases en español.
- **Probar las 5 páginas** y la consola (comparten `main.js`). Revisar móvil y modo claro/oscuro. Ojo: DevTools muestra avisos del dominio `Log` (cabeceras `Permissions-Policy`, `[DOM]`) que no pasan por `console.*`; revisa también el panel *Issues* antes de dar por limpia la consola.
- **Actualizar `AGENTS.md` y `VERSION`** tras cada cambio.
- **SemVer automático:** fix → PATCH, feature → MINOR, breaking → MAJOR. Si está estable: `git add -A && git commit && git tag vX.Y.Z && git push && git push origin vX.Y.Z`. No esperar a que lo pidan.
- **Revertir:** `git checkout vX.Y.Z`. Nunca commitear secretos ni `service_role`.

---

## 8. Protocolo del agente (para ahorrar tokens)

1. Lee solo este archivo.
2. Identifica archivo + sección + línea aproximada.
3. `grep` del ancla exacta; lee 30–80 líneas alrededor, no el archivo completo.
4. Edita con cambios mínimos y consistentes.
5. Verifica consola en las 5 páginas y actualiza este mapa si cambió la estructura.

Si la tarea exige contexto profundo de BD/seguridad, abre solo la auditoría correspondiente.

---

## 9. Subagentes locales (The Agency)

`.opencode/agents/` contiene 13 subagentes con nombres cortos: `@web`, `@minimos`, `@revisor`, `@tiempo-real`, `@diseno`, `@ux`, `@qa-visual`, `@bd`, `@bd-confiable`, `@seguridad`, `@accesibilidad`, `@rendimiento`, `@orquestador`. Lista, criterios y reinstalación: `.opencode/README.md`. Todos heredan las reglas de este archivo; si un subagente propone frameworks, npm o archivos extra, ignóralo. `@orquestador` puede lanzar al resto (`.opencode/opencode.json` fija `subagent_depth: 2`) y también aparece en el selector de agentes principales junto a `build` y `plan`.
