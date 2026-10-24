# AGENTS.md — LaGochaGaming

> **Léeme primero.** Este archivo es el mapa del proyecto. No abras los HTML completos para "explorar":
> identifica aquí el archivo y la sección, y usa `grep`/lectura por rangos. Los números de línea son
> aproximados y se desplazan al editar; guíate por los nombres de secciones y funciones.

**Repo:** github.com/Chary-lab/LaGochaGaming · **Prod:** lagochagaming.com (GitHub Pages, rama `main`, sin build)
**Supabase:** `cydiyaacnyydprgffmkq` · `us-west-2` · Postgres 17.11
**Versión:** v1.2.3 · **Actualizado:** 2026-10-24 · **BD:** verificado vía PostgREST `anon` el 2026-10-24 (catálogo/políticas sin verificar)

**Regla de oro:** 5 HTML + `main.js` + `style.css`. Sin frameworks nuevos, sin npm, sin bundler, sin archivos extra.

---

## 1. Mapa de archivos

| Archivo | Líneas | Qué hay | Abrir cuando… |
|---|---:|---|---|
| `index.html` | 554 | Home: hero, stream Kick, clips, feed social, YouTube, muro | Tocar la portada o el stream |
| `galeria.html` | 1103 | Galería pública, subida, moderación admin, lightbox | Fotos, likes, aprobación |
| `comunidad.html` | 1959 | Chat, ranking, online, reacciones, muro, celebración | Chat o usuarios |
| `cine.html` | ~620 | GochiWatch: YouTube IFrame API, panel streamer, sync_cine | Cine o reproducción |
| `sorteo.html` | 904 | Sorteo manual/streamer, participantes, ganadores | Sorteos |
| `main.js` | 631 | Helpers globales, admin, tema, toasts, modales, polling | Lógica compartida |
| `style.css` | 3282 | Tema claro/oscuro, layout, componentes, responsive | Cualquier estilo |
| `_headers` | 7 | CSP/HSTS/etc. **GitHub Pages lo ignora** | Seguridad/cabeceras |
| `VERSION` | 1 | Dice `1.0.0` (desactualizado; tag real `v1.2.1`) | Release |

- Sin tests automatizados ni build. Verificación = abrir las 5 páginas y revisar consola.
- Deploy: push a `main` en GitHub Pages. `CNAME` = `lagochagaming.com`.
- Docs profundas (solo si hace falta): `auditoria-web.md`, `auditoria-bd.md`, `auditoria-sg.md`.

---

## 2. `main.js` — índice por bloques

| Líneas | Contenido |
|---|---|
| 12–16 | `SUPABASE_URL`, `SUPABASE_KEY` (anon), `window.supabase` |
| 31–41 | `escapeHtml`, `escapeAttr` (usar siempre con datos de BD) |
| 43–69 | `ADMIN_EMAIL`, `esAdminActual()`, `refrescarCacheAdmin()`, `onAuthStateChange` |
| 73–134 | `lanzarConfetti(canvasId, opciones)` |
| 136–185 | Trampa de foco para modales (`activarTrampaFoco`, `desactivarTrampaFoco`) |
| 187–211 | `initTema`, `toggleTema` (persistencia en localStorage) |
| 213–254 | `cerrarSesion`, `cerrarSesionAdminGlobal` |
| 256–280 | `actualizarUsuarioNavComunidad`, `validarSesionStreamer` |
| 282–370 | `insertarComponentesUIGlobales`, alertas/toasts de stream, `mostrarToast` |
| 371–418 | `mostrarConfirmacionModal` + cierre de modales |
| 420–452 | `inicializarMenuMovil`, `inicializarNavLinks` |
| 461–630 | Polling de Kick: `verificarEstadoStream`, backoff, `visibilitychange`, intervalo 90 s |

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
- **Bug:** el login admin (~1200–1207) activa `adminAutenticado` con cualquier cuenta Auth válida; no llama a `esAdminActual()`.
- **Riesgo BD:** si la policy `SELECT` de `galeria` es `true`, las fotos `pendiente` son legibles por `anon` aunque la UI no las muestre.

### `comunidad.html`
- Stores `chat`, `ranking`, `reacciones` (~745–760).
- Chat con Realtime, scroll inteligente, typing indicator, reacciones accesibles, rate limit visual.
- Ranking/rango, usuarios online, muro, modal de bienvenida y celebración de rango.
- Script inline grande: ~738–2378.
- **Bug:** `#canal-preview` (~639) tiene `src=""` → petición a la propia página e imagen rota.
- **A11y:** la página no tiene ningún `<h1>`.

### `cine.html`
- YouTube IFrame API (`onYouTubeIframeAPIReady`) + Supabase + Realtime con reconexión automática.
- Panel maestro del streamer para cambiar video; login **valida `esAdminActual()`** (v1.2.3).
- Overlay de carga/error (`#cinePlayerOverlay`).
- **Corregido (v1.2.3):** `<source id="cineVideoSource">` sin `src` vacío; fallback de YouTube en `index.html` (timeout sin `contentWindow`); regex de YouTube expandida; manejo de errores `onError`/`onStateChange`; limpieza de `ytPlayer` al cambiar a MP4.

### `sorteo.html`
- Store `sorteo` (~626). Modo streamer para admin, modo manual/público para el resto.
- Participantes, pesos, ganadores, reglas, banner.
- **Bug:** el login streamer (~790–797) abre el modo streamer con cualquier cuenta Auth válida.
- **Sorteo:** el modo streamer usa `sortear_ganador_sorteo` (servidor) con fallback local; el modo público gira en cliente y no se registra. Si el servidor falla, `guardarGanadorOficial()` inserta directo en `ganadores_sorteo` (~1266).
- **Typos:** línea 14 `premiosincreíbles`; línea 25 `<meta>` y `manifest` pegados. La meta description dice “se sortea en el servidor”, pero el modo público es local.

### `style.css` — bloques
- 2–52 variables/tema claro-oscuro · 93–232 hero/layout · 233–265 social · 266–707 galería/lightbox · 708–773 muro · 774–883 UI/toasts/modales · 884–983 navbar/móvil · 984–1796 rangos y badges · 1797–1847 detalles.

---

## 4. Base de datos (verificado por PostgREST con `anon`; catálogo sin acceso)

Tablas (11): `comunidad_chat`, `comunidad_sesiones`, `config_sorteo`, `galeria`, `ganadores_sorteo`, `message_reactions`, `muro_saludos`, `participantes_en_vivo`, `sync_cine`, `usuarios_comunidad`, `donaciones`.

- **Filas visibles (2026-10-24):** `galeria` 11 (todas aprobadas), `muro_saludos` 55, `usuarios_comunidad` 2, `message_reactions` 1, `comunidad_chat` 1, `config_sorteo` 1 (`abierto=false`), `sync_cine` 1 (`pause`), `ganadores_sorteo` 0, `participantes_en_vivo` 0, `donaciones` 0, `comunidad_sesiones` 0 visibles (RLS).
- **Columnas revocadas para `anon`:** `usuarios_comunidad.pin_hash`, `apodo_norm`, `ultimo_punto` (HTTP 401). `id`, `apodo`, `puntos`, `rango` sí se leen.
- **RLS:** `PATCH` de `anon` sobre filas existentes de `galeria`, `config_sorteo`, `sync_cine`, `comunidad_chat` y `muro_saludos` devuelve `[]` (bloqueado). `INSERT`/`DELETE` no probados para no alterar datos.
- **`comunidad_sesiones`:** 0 filas visibles; RLS sin políticas según auditoría previa → solo RPC `SECURITY DEFINER` (intencional).
- **RPC:** `es_admin()` → `false` para `anon`; `obtener_rangos()` público; `actualizar_autor_galeria` → 401 (no ejecutable por `anon`). `sortear_ganador_sorteo` y `asignar_peso_sorteo` sin verificar.
- **Auth:** `disable_signup=false`, `mailer_autoconfirm=false`, solo proveedor email. Sin MFA.
- **Auth comunidad:** `login_comunidad`, `registrar_comunidad`, `validar_sesion_comunidad`, `cerrar_sesion_comunidad`; rate limit `registrar_intento_auth` (5/15 min, según auditoría previa).
- **Migraciones:** 28 (última `20261023075705_eliminar_visitas_tracking`), sin Edge Functions. Sin re-verificar.
- **Storage:** bucket `fotos-galeria` público, 5 MB, png/jpeg/webp/gif/avif.
- **Pendiente de verificar (requiere `service_role`/SQL):** políticas completas, triggers, `search_path`, índices (`idx_galeria_estado_created`, `idx_galeria_estado_likes`, `idx_chat_created`, `idx_usuarios_puntos`), Advisors y RLS de `donaciones`.
- **Donaciones:** el código se revirtió en v1.1.1, pero la tabla sigue en `public` vacía. No reintroducir sin pedido; decidir si se elimina.

---

## 5. Recetas para cambiar cosas

- **UI de una página:** busca el `<section>`/`<h2>` en el HTML, edita solo ese bloque, reutiliza clases de `style.css`. No reescribas el archivo completo.
- **Lógica compartida:** añade `window.miFuncion = function…` en `main.js`, úsala desde las páginas y pruébala en las 5.
- **Lógica exclusiva:** script inline de esa página (así está hecho hoy). Mantén el orden: Supabase → `main.js` (`defer`) → Alpine (`defer`).
- **Datos:** `window.supabase.from(...)` para lecturas; para escrituras sensibles usa RPC `SECURITY DEFINER`, no expongas `service_role`.
- **Admin:** `window.esAdminActual()` (hoy compara email; ver prioridad 2).
- **Estilos:** usa variables de `:root` y media queries existentes; modo claro/oscuro debe seguir funcionando.
- **XSS:** todo dato de BD en `innerHTML` pasa por `escapeHtml`/`escapeAttr` o se inserta con `textContent`.

---

## 6. Problemas conocidos (prioridad)

1. **Login admin sin validar rol:** galería y sorteo abren el panel admin/streamer con **cualquier** cuenta Auth válida (`adminAutenticado`/`streamerAutenticado = true` sin `esAdminActual()`). Con registro abierto, cualquiera puede crear cuenta y ver la UI. Las escrituras siguen bloqueadas por RLS/RPC, pero es la prioridad #1. **Cine corregido en v1.2.3.**
2. **Admin por email:** `main.js:43` (`gocha@admin.com`) y `esAdminActual()` compara solo email. No existe `app_metadata.role` en el frontend. Migrar a claim/RPC y exigir email confirmado.
3. **Cabeceras inertes:** `_headers` no lo aplica GitHub Pages (devuelve 404). Producción sin CSP/HSTS reales. Migrar a Cloudflare/Netlify Pages o meta tags.
4. **Markup roto:** `comunidad.html` `img src=""` + sin `<h1>`. **Cine (`<source>`) y fallback de YouTube de `index.html` corregidos en v1.2.3.**
5. **Peso:** Bootstrap CSS y Font Awesome completos con uso mínimo; CSS/JS inline duplicado; fuentes de Google; `img/1-3.jpg` 1024×576 (~430 KB).
6. **Detalles:** typos de `sorteo.html`, atributos deprecated en iframes, comentario "60s" vs 90 s, 34 botones sin `type`, `x-cloak` en contadores.
7. **A11y:** 12 campos sin label/`aria-label`, falta skip-link, menú móvil no cierra con Escape, confeti sin `aria-hidden`.
8. **BD:** revisar si la policy `SELECT` de `galeria` expone pendientes; decidir `donaciones`; confirmar y borrar los 4 índices sin uso; verificar permisos de `sortear_ganador_sorteo`/`asignar_peso_sorteo`.

---

## 7. Reglas de trabajo

- **Stack cerrado:** Vanilla JS, Bootstrap CSS, Alpine 3.17.5, Supabase JS v2 (2.118.0 fijado). Nada de npm/frameworks nuevos.
- **Sin archivos extra:** todo va en las 5 páginas, `main.js` o `style.css`. No `.env`, bundlers ni configs.
- **Reutilizar** helpers, clases, modales y toasts. No duplicar lógica.
- **Sin comentarios** en código salvo pedido. Variables/clases en español.
- **Probar las 5 páginas** y la consola (comparten `main.js`). Revisar móvil y modo claro/oscuro.
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
