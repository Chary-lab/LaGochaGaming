# AGENTS.md — LaGochaGaming

> **Léeme primero.** Este archivo es el mapa del proyecto. No abras los HTML completos para "explorar":
> identifica aquí el archivo y la sección, y usa `grep`/lectura por rangos. Los números de línea son
> aproximados y se desplazan al editar; guíate por los nombres de secciones y funciones.

**Repo:** github.com/Chary-lab/LaGochaGaming · **Prod:** lagochagaming.com (GitHub Pages, rama `main`, sin build)
**Supabase:** `cydiyaacnyydprgffmkq` · `us-west-2` · Postgres 17.11
**Versión:** v1.2.14 · **Actualizado:** 2026-10-24 · **BD:** verificada por PostgREST `anon` y por SQL el 2026-10-24 (35 migraciones, políticas y permisos leídos)

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
- **A11y:** tiene `<h1 class="visually-hidden">` (v1.2.8), pero salta de `h1` a `h3`; faltan `h2`.

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
- **Corregido (v1.2.8):** typo `premiosincreíbles`, `<meta>` y `manifest` pegados, y la meta description ya no afirma que el modo manual sortee en el servidor.
- **Corregido (v1.2.13):** login streamer en `<form id="form-login-sorteo" novalidate>` con Entrar `#btn-entrar-sorteo` (`type="submit"`); fuera el listener `keydown` y el `case 'login-streamer'`.

### `style.css` — bloques
- 2–52 variables/tema claro-oscuro · 93–232 hero/layout · 233–265 social · 266–707 galería/lightbox · 708–773 muro · 774–883 UI/toasts/modales · 884–983 navbar/móvil · 984–1796 rangos y badges · 1797–1858 detalles (`[x-cloak]`, `.visually-hidden` de respaldo).

---

## 4. Base de datos (verificado por PostgREST `anon` y por SQL el 2026-10-24)

Tablas (10): `comunidad_chat`, `comunidad_sesiones`, `config_sorteo`, `galeria`, `ganadores_sorteo`, `message_reactions`, `muro_saludos`, `participantes_en_vivo`, `sync_cine`, `usuarios_comunidad`.

- **Filas visibles (2026-10-24):** `galeria` 11 (todas aprobadas), `muro_saludos` 55, `usuarios_comunidad` 2, `message_reactions` 1, `comunidad_chat` 1, `config_sorteo` 1 (`abierto=false`), `sync_cine` 1 (`pause`), `ganadores_sorteo` 0, `participantes_en_vivo` 0, `comunidad_sesiones` 0 visibles (RLS).
- **Columnas revocadas para `anon`:** `usuarios_comunidad.pin_hash`, `apodo_norm`, `ultimo_punto` (HTTP 401). `id`, `apodo`, `puntos`, `rango` sí se leen.
- **RLS escrituras:** `anon` no tiene `INSERT`/`UPDATE`/`DELETE` en `galeria` ni `muro_saludos` (HTTP 401, `42501`); todo pasa por RPC `SECURITY DEFINER`. `authenticated` (admin) conserva `UPDATE`/`DELETE` directos para moderar.
- **RLS lectura:** `galeria` y `muro_saludos` filtran por `estado = 'aprobado' or es_admin()`; el resto de tablas públicas usa `true` (chat, config, ganadores, participantes, reacciones, sync, usuarios). Probado: una fila `pendiente` no se ve por `anon` ni por id directo.
- **`comunidad_sesiones`:** 0 filas visibles; RLS sin políticas → solo RPC `SECURITY DEFINER` (intencional).
- **RPC:** `es_admin()` es `sql STABLE`, `SECURITY INVOKER`, `search_path=''` y su cuerpo es `select coalesce(auth.email() = 'gocha@admin.com', false)`; **22 políticas RLS** de 9 tablas + `storage.objects` dependen de ella. `sortear_ganador_sorteo()` y `asignar_peso_sorteo(text,int)` son `SECURITY DEFINER`, comprueban `es_admin()` y **`anon` no puede ejecutarlas** (solo `authenticated`/`service_role`). `incrementar_likes(p_token,p_image_id,p_delta)` valida sesión de comunidad y `delta ∈ {-1,1}`. `publicar_foto_galeria` y `publicar_saludo_muro` validan sesión, URL de Storage, límites y rate limit.
- **Auth:** `disable_signup=false`, `mailer_autoconfirm=false`, solo proveedor email. Sin MFA.
- **Auth comunidad:** `login_comunidad`, `registrar_comunidad`, `validar_sesion_comunidad`, `cerrar_sesion_comunidad`; rate limit `registrar_intento_auth` (5/15 min, según auditoría previa).
- **Migraciones:** 35 (última `20261024224108_eliminar_sobrecarga_ambigua_publicar_foto`), sin Edge Functions.
- **Storage:** bucket `fotos-galeria` público, 5 MB, png/jpeg/webp/gif/avif.
- **Índices:** los 4 "sin uso" (`idx_galeria_estado_created`, `idx_galeria_estado_likes`, `idx_chat_created`, `idx_usuarios_puntos`) tienen 0 scans **porque las tablas tienen 1–11 filas**; los 4 coinciden con consultas reales (orden por `created_at`/`likes`/`puntos`) y ocupan 64 KB en total. Se mantienen a propósito: borrarlos no ahorra nada y quita cobertura cuando las tablas crezcan.
- **Eliminado (v1.2.11):** tabla `donaciones` (0 filas, 0 referencias, 3 políticas, una de ellas `INSERT` público) y la RPC `obtener_donaciones_recientes()`; sobrecarga `incrementar_likes(bigint,int)` (sin control de sesión); sobrecarga `publicar_foto_galeria(text,text,text)` (causaba `PGRST203` y rompía la subida de usuarios de comunidad).
- **Pendiente de verificar:** triggers, `search_path` del resto de funciones, Advisors y políticas completas de `usuarios_comunidad`/`comunidad_chat`.

---

## 5. Recetas para cambiar cosas

- **UI de una página:** busca el `<section>`/`<h2>` en el HTML, edita solo ese bloque, reutiliza clases de `style.css`. No reescribas el archivo completo.
- **Lógica compartida:** añade `window.miFuncion = function…` en `main.js`, úsala desde las páginas y pruébala en las 5.
- **Lógica exclusiva:** script inline de esa página (así está hecho hoy). Mantén el orden: Supabase → `main.js` (`defer`) → Alpine (`defer`).
- **Datos:** `window.supabase.from(...)` para lecturas; para escrituras sensibles usa RPC `SECURITY DEFINER`, no expongas `service_role`.
- **Admin:** `window.esAdminActual()` → RPC `es_admin()` con sesión y email confirmado; nunca compares emails en el cliente. La cuenta admin (`gocha@admin.com`) está confirmada y sin `app_metadata.role`.
- **Estilos:** usa variables de `:root` y media queries existentes; modo claro/oscuro debe seguir funcionando.
- **XSS:** todo dato de BD en `innerHTML` pasa por `escapeHtml`/`escapeAttr` o se inserta con `textContent`.

---

## 6. Problemas conocidos (prioridad)

1. **Admin por email (residual):** el cliente ya no compara emails (v1.2.9): `esAdminActual()` llama a `es_admin()` y exige sesión + email confirmado. Pero la RPC sigue decidiendo por `auth.email()`, así que la autorización depende de un email y no de un rol. Siguiente paso: `app_metadata.role = 'admin'` en la RPC (las 22 políticas se actualizan solas, el cliente no cambia).
2. **Cabeceras inertes:** `_headers` no lo aplica GitHub Pages (devuelve 404). Producción sin CSP/HSTS reales. Migrar a Cloudflare/Netlify Pages o meta tags.
3. **BD restante:** revisar triggers y `search_path` del resto de funciones, Advisors y las políticas completas de `usuarios_comunidad`/`comunidad_chat`. Resuelto en v1.2.11: policy `SELECT` de `galeria`/`muro_saludos` limitada a `aprobado`, `anon` sin escritura directa, `donaciones` y 2 sobrecargas inseguras eliminadas, permisos de las RPC de sorteo verificados.
4. **Peso:** Bootstrap CSS y Font Awesome completos con uso mínimo; CSS/JS inline duplicado; fuentes de Google; `img/1-3.jpg` 1024×576 (~430 KB).
5. **A11y restante:** 8 campos sin label/`aria-label` (medido en el DOM de las 5 páginas el 2026-10-24): `muro-autor`, `muro-mensaje`, `imageTitleInput`, `chat-autor`, `inputVideoUrl`, `nombre-input-publico`, `input-usuario-admin`, `select-peso-admin`; falta skip-link, menú móvil no cierra con Escape, confeti sin `aria-hidden`; `comunidad.html` salta de `h1` a `h3` (faltan `h2`).
6. **Detalles menores:** atributos deprecated en iframes; `AGENTS.md:61` sigue describiendo como bug vivo el fallback de YouTube de `index.html` (marcado como corregido en la prioridad antigua).

**Resueltos:** login admin/streamer valida `esAdminActual()` (galería y sorteo, desde v1.0.0); `galeria.html`/`sorteo.html` ya no abren panel con cualquier cuenta. Cine en v1.2.3 (`<source>` vacío, fallback de YouTube, login). v1.2.6/v1.2.7 instrucciones del panel streamer. v1.2.8 `src=""` de `#canal-preview`, `<h1>` en comunidad, typos y metas de `sorteo.html`, 34 botones con `type="button"`, comentario "60s" → 90 s. v1.2.9 `esAdminActual()` migrado a la RPC `es_admin()` (sin email hardcodeado en el cliente, exige email confirmado, caché por usuario). v1.2.10 login admin de `galeria.html` dentro de un `<form>` real (Enter nativo y autofill; fuera el aviso `[DOM] Password field is not contained in a form`). v1.2.11 (solo BD, 2 migraciones): `SELECT` de `galeria`/`muro_saludos` limitado a `aprobado` + `es_admin()`; `anon` sin `INSERT`/`UPDATE`/`DELETE` directos; eliminadas `donaciones`, `obtener_donaciones_recientes()`, `incrementar_likes(bigint,int)` y la sobrecarga ambigua de `publicar_foto_galeria` que rompía la subida de usuarios de comunidad. v1.2.12 `galeria.html`: la tarjeta de pendientes usa `.gallery-card-image-wrap` (la foto ya no tapa título, autor ni los botones Aprobar/Rechazar) y `aplicarEstadoAdmin()` + `onAuthStateChange` mantienen el panel de moderación y "Modo Moderación" sincronizados con la sesión real aunque el login ocurra en otra pestaña. v1.2.13 `comunidad.html`/`cine.html`/`sorteo.html`: los tres campos `type="password"` van dentro de un `<form novalidate>` real con botón `type="submit"`, así que el aviso `[DOM] Password field is not contained in a form` desaparece y Enter funciona de forma nativa; se quitaron los listeners `keydown` manuales y los `case 'login-streamer'` ya muertos, y el apodo/PIN declaran `autocomplete` para que DevTools no recomiende nada. Las 5 páginas quedan con la consola sin avisos `[DOM]`. v1.2.14 `comunidad.html`: `aria-label` en apodo/PIN y error con `role="status"` + `aria-live="polite"`; el botón Entrar se deshabilita durante la RPC (sin doble envío) y `rate_limited` ya se traduce en vez de mostrar `Error: rate_limited`; eliminados `nicknameModalSetBtn` y `cerrarModalComunidad()`, que no se usaban. Quedan 8 campos sin nombre accesible en el resto de páginas (ver prioridad 5).

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
