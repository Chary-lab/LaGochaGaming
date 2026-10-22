# AGENT.md — Contexto del proyecto LaGochaGaming

> Archivo de contexto para sesiones. Léelo al iniciar cada sesión. No es sustituto de leer un archivo específico cuando sea necesario. Todo está implementado y revisado: frontend + Supabase al día.

---

## 1. Visión general

**LaGochaGaming** es un sitio web estático (5 páginas HTML + `main.js` + `style.css`) para una streamer de Kick, con backend **Supabase**. Dominio: `lagochagaming.com`. Idioma: español.

- Stack: HTML5, CSS3 (variables CSS, modo claro/oscuro), Vanilla JS, Font Awesome 6.6.0, Supabase JS SDK v2 (CDN), YouTube IFrame API.
- Excepción aprobada (2026-10-21): Alpine.js 3.17.5 para la fase piloto en `sorteo.html` (implementada, ver §12).
- Sin framework de build, sin Node, sin `.env`. Sitio estático: abrir `index.html` en el navegador o servir con servidor estático.
- Supabase proyecto: `cydiyaacnyydprgffmkq` (región `us-west-2`, Postgres 17). URL: `https://cydiyaacnyydprgffmkq.supabase.co`.
- Anon key hardcodeada en `main.js:13`. Admin email: `gocha@admin.com`.
- Bucket Storage: `fotos-galeria` (carpeta `gallery/`).
- Publicación Realtime: `supabase_realtime` con 7 tablas.

---

## 2. Estructura de archivos

```
D:\Gocha\
├── index.html          # Inicio: hero, stream Kick, clips, feed social, YouTube, muro de saludos
├── main.js             # Lógica GLOBAL compartida por las 5 páginas (Supabase, tema, menú, toasts, modales, polling stream, helpers)
├── style.css           # CSS global (1295 líneas): variables, componentes, utilidades, animaciones, rangos
├── cine.html           # GochiWatch: reproductor sincronizado + panel streamer + chat Kick
├── comunidad.html      # Chat comunidad: login/registro (apodo+PIN), mensajes, usuarios online, leaderboard, rangos, perfil
├── galería.html        # Galería: subida, likes, moderación (aprobar/rechazar), lightbox, cambio de autor
├── sorteo.html         # GochiSorteo: modo manual y modo streamer, ruleta, participantes, ganadores
├── manifest.webmanifest, sitemap.xml, robots.txt, CNAME
├── img/                # favicons + 1.jpg, 2.jpg, 3.jpg, fono.png
├── .kilo/              # Config de Kilo (plans, skills)
│   ├── plans/
│   │   ├── auditoria-base-datos-supabase.md
│   │   ├── modernizacion-leyenda-rangos-auditoria.md
│   │   └── muro-anti-impersonacion-plan.md
│   └── skills/
│       ├── frontend-clean-editor/
│       └── lagochagaming-dev/
└── .gitignore          # ignora .kilo/, AGENTS.md, README.md, kilo.jsonc
```

---

## 3. Páginas y responsabilidades clave

| Archivo | Qué hace | Auth requerida |
|---------|----------|----------------|
| `index.html` | Home: stream, clips, muro de saludos (`muro_saludos`), redes | Admin (`gocha@admin.com`) para eliminar saludos |
| `comunidad.html` | Chat en vivo, usuarios online, leaderboard, tienda de puntos, rangos, perfil | Comunidad (apodo+PIN) |
| `cine.html` | Reproductor sincronizado de video, cámara Kick, panel streamer | Supabase Auth admin |
| `galería.html` | Subida y visualización de fotos, likes, moderación pendiente | Comunidad para subir/like; Admin para moderar |
| `sorteo.html` | Sorteos: modo manual (local) y modo streamer (servidor), participantes, ganadores | Admin para abrir/cerrar/vaciar/bonus; Comunidad para participar |

---

## 4. main.js — fuente única de verdad

Ubicación: `main.js:1-625`. Se carga con `defer` en todas las páginas.

**Supabase** (`main.js:12-26`): `window.supabase`, `window.supabaseReady`, `SUPABASE_URL`, `SUPABASE_KEY`.

**Helpers globales** (usar estos, no duplicar):
- `window.escapeHtml(s)` / `window.escapeAttr(s)` — única fuente de escapado HTML
- `window.esAdminActual()` — cachea sesión Supabase; admin si `gocha@admin.com`
- `window.refrescarCacheAdmin()` — invalida caché tras login/logout
- `window.lanzarConfetti(canvasId, opciones)` — confeti reutilizable
- `window.activarTrampaFoco(modal, el)` / `window.desactivarTrampaFoco()` — accesibilidad modales
- `window.initTema()` / `window.toggleTema()` — modo claro/oscuro (localStorage `gochi_tema`)
- `window.mostrarToast(msg, esError)` / `window.mostrarConfirmacionModal({...})`
- `window.insertarComponentesUIGlobales()` — inserta toast, modal confirm, alerta stream, toast stream
- `window.iniciarPollingStreamGlobal()` — polling Kick API cada 90s con backoff y caché 60s
- `window.validarSesionStreamer()` → `esAdminActual()`
- `window.cerrarSesionAdminGlobal()` — signOut + limpia UI admin
- `window.cerrarSesion()` — cierra sesión de comunidad (RPC + localStorage)
- `window.actualizarUsuarioNavComunidad()` — muestra apodo en navbar

**Patrón de clicks globales** (`main.js:605-614`): delegación para cerrar toast y modales por clic en fondo.

**ADMIN_EMAIL** = `'gocha@admin.com'` (línea 43).

---

## 5. Sistema de autenticación (dos sistemas separados)

1. **Supabase Auth (admin)**: email/password. Admin = `gocha@admin.com`. Se usa en cine, sorteo, galería (moderación) y index (muro eliminar). `window.esAdminActual()`.
2. **Sistema Comunidad (apodo + PIN)**: tablas `usuarios_comunidad`, `comunidad_sesiones`, `comunidad_chat`. RPCs: `registrar_comunidad`, `login_comunidad`, `validar_sesion_comunidad`, `cerrar_sesion_comunidad`, `enviar_mensaje_chat`, `establecer_reaccion`, `incrementar_puntos_comunidad`. Tokens en localStorage: `comunidad_session_token`, `comunidad_nickname`, `comunidad_user_id`.

---

## 6. Tablas y RPCs de Supabase (estado actual — todo aplicado)

| Tabla | Columnas clave | Uso | Páginas |
|-------|---------------|-----|---------|
| `muro_saludos` | id, autor, mensaje, created_at, estado, verificado, rango, usuario_id, autor_norm (generated) | Saludos del muro | index.html |
| `usuarios_comunidad` | id, apodo, pin_hash, puntos, ultima_actividad, rango, apodo_norm (generated, unique) | Perfiles comunidad | comunidad.html |
| `comunidad_sesiones` | token (PK), usuario_id, creado_en, expira_en, ultimo_mensaje_en, ultimo_punto_en | Sesiones comunidad | comunidad.html |
| `comunidad_chat` | id, autor, mensaje, created_at | Mensajes del chat | comunidad.html |
| `message_reactions` | id, message_id, user_id, emoji, created_at, apodo | Reacciones del chat | comunidad.html |
| `participantes_en_vivo` | id, username (unique), kick_user_id (unique), peso, created_at | Participantes sorteo | sorteo.html |
| `config_sorteo` | id, abierto | Config sorteo abierto/cerrado | sorteo.html |
| `ganadores_sorteo` | id, nombre, created_at | Historial ganadores | sorteo.html |
| `galeria` | id, title, image_url, estado, likes, created_at, autor | Fotos galería | galería.html |
| `sync_cine` | id, video_url, estado, tiempo, updated_at | Reproductor sincronizado | cine.html |

**RPCs frecuentes**: `publicar_saludo_muro` (3 args), `registrar_participante_sorteo`, `sortear_ganador_sorteo`, `asignar_peso_sorteo`, `incrementar_likes` (3 args), `obtener_rangos`, `multiplicador_rango`, `calcular_rango`, `incrementar_puntos_comunidad`, `enviar_mensaje_chat`, `establecer_reaccion`, `registrar_comunidad`, `login_comunidad`, `validar_sesion_comunidad`, `cerrar_sesion_comunidad`, `publicar_foto_galeria`, `actualizar_autor_galeria`, `apodo_norm`, `nombre_valido`, `handle_sorteo_valido`, `es_admin`, `patron_bloqueado`, `patron_simbolos`, `unaccent_texto`, `usuarios_rango_trg`.

**Índices**: PKs en todas las tablas; UNIQUE en `usuarios_comunidad.apodo`, `usuarios_comunidad.apodo_norm`, `participantes_en_vivo.username`, `participantes_en_vivo.kick_user_id`, `message_reactions(message_id, user_id)`; compuestos `idx_muro_created`, `idx_muro_autor_norm_created`, `idx_muro_usuario_created`, `idx_galeria_estado_created`, `idx_galeria_estado_likes`, `idx_usuarios_puntos`, `idx_chat_created`, `idx_sesiones_expira`, `idx_sesiones_usuario`, `idx_message_reactions_msg_emoji`.

**Realtime** (`supabase_realtime`): `muro_saludos`, `galeria`, `sync_cine`, `participantes_en_vivo`, `config_sorteo`, `comunidad_chat`, `message_reactions`.

**Extensión**: `unaccent` instalada.

---

## 7. Rangos y gamificación (comunidad)

| Rango | Puntos | Multiplicador | Emoji |
|-------|--------|---------------|-------|
| Semilla | 0-49 | ×1 | 🌱 |
| Gota | 50-199 | ×2 | 💧 |
| Flor | 200-499 | ×3 | 🌸 |
| Estrella | 500-999 | ×4 | ⭐ |
| Leyenda | 1000+ | ×5 | 👑 |

- 1 crédito cada 5 min conectado, multiplicado por el rango actual.
- Fuente de verdad SQL: `calcular_rango()`, `multiplicador_rango()`, `obtener_rangos()`. Fallback JS en `comunidad.html`.
- Puntos automáticos: `incrementar_puntos_comunidad` cada 300s (pestaña visible) + ajuste por `visibilitychange` al volver.

---

## 8. Convenciones y reglas del proyecto

- **Sin comentarios en el código** (regla del sistema Kilo) a menos que se pida.
- Nombres de clases y variables en español (proyecto hispanohablante).
- Las 5 páginas comparten `main.js` y `style.css`; cada página tiene su `<style>` inline para lo específico.
- Patrón `data-action` para delegación de clicks en comunidad, galería, sorteo, cine.
- Modales usan `gochi-modal-overlay` + `gochi-modal-box` de style.css.
- Toast: `gochi-toast-center` + `mostrarToast()`.
- Realtime en: `muro_saludos` (index), `galeria` (galería), `sync_cine` (cine), `participantes_en_vivo` + `config_sorteo` (sorteo), `comunidad_chat` + `message_reactions` (comunidad).
- `rel="noopener noreferrer"` en enlaces `target="_blank"`.
- `loading="lazy"` en iframes de terceros (Kick ya lo lleva).
- Tema: `light-mode` class en body, localStorage `gochi_tema`.

---

## 9. Qué YA está resuelto (no tocar)

Todo lo siguiente está implementado y revisado contra la BD real de Supabase:

**Frontend (5 páginas + main.js + style.css):**
- Muro: `publicar_saludo_muro` 3 args (`p_autor`, `p_mensaje`, `p_token`) en `index.html:515`; filtro `estado='aprobado'` en `index.html:418`; `LIMITE+1` sin `count:'exact'` en `index.html:430`; realtime con filtro de estado en `index.html:459`; badge de rango server-side en `index.html:317-323`; prefill del autor con `readOnly` en `index.html:385-398`; manejo de errores con `resultado.ok` en `index.html:504-512`.
- Galería: `incrementar_likes` 3 args en `galería.html:805-809`; `publicar_foto_galeria` en `galería.html:1193`; `actualizar_autor_galeria` en `galería.html:1234`; top-3 global por likes en `galería.html:599-606`; realtime en `galería.html:863-883`.
- Sorteo: `verificarHandleKick` en `sorteo.html:898-926`; `registrar_participante_sorteo` con `p_kick_user_id` en `sorteo.html:960-962`; `asignar_peso_sorteo` RPC en `sorteo.html:1084-1086`; `sortear_ganador_sorteo` en servidor en `sorteo.html:1176`; sorteo local honesto como fallback en `sorteo.html:1196-1202`.
- Comunidad: chat orden descendente en `comunidad.html:1250`; multiplicador y progreso de rangos en `comunidad.html:932-983`; `escapeHtml`/`escapeAttr` de `main.js` como fuente única en `comunidad.html:1095` y `galería.html:1256`; un solo listener de clic para modales en `main.js:605-614`; planificador de puntos autocorregible en `comunidad.html:2177-2194`; caché de rangos en memoria 30s en `comunidad.html:1937-1968`.
- SEO: meta tags completos (og:, twitter:, canonical) en todas las páginas.

**Base de datos Supabase (verificado en proyecto `cydiyaacnyydprgffmkq`):**
- 10 tablas con todas las columnas esperadas (incl. `autor_norm`, `apodo_norm`, `verificado`, `rango`, `kick_user_id`, `peso`, etc.).
- 28 funciones presentes (incl. todas las RPCs listadas arriba).
- 34 políticas RLS en todas las tablas, con `es_admin()` para operaciones de admin y lectura pública para `anon`/`authenticated`.
- 23 índices, incluyendo únicos en `apodo_norm`, `apodo`, `username`, `kick_user_id`.
- 7 tablas publicadas en `supabase_realtime`.
- Extensión `unaccent` instalada.

**Estado: no hay pendientes críticos.** Frontend y BD están al día con los planes de auditoría. Piloto Alpine (Fase 0 + Fase 1) ejecutado en `sorteo.html`; pendiente un sorteo real de validación en directo (ver §12).

---

## 10. Cómo trabajar en este proyecto (checklist por sesión)

1. Leer `agent.md` (este archivo) y, si toca una página específica, leer esa página + `main.js` + `style.css`.
2. No crear archivos de build ni añadir dependencias npm. Alpine.js 3.17.5 está aprobado como excepción para la fase piloto (solo `sorteo.html`); no introducir otros frameworks ni ampliar a otras páginas sin aprobación.
3. Antes de editar JS/HTML, verificar que no exista ya un helper en `main.js` (escapeHtml, lanzarConfetti, esAdminActual, etc.).
4. Mantener consistencia con clases CSS existentes de `style.css`.
5. Supabase: credenciales hardcodeadas, no tocar sin necesidad. Cualquier cambio de RLS/RPC requiere migración SQL en Supabase, no solo frontend.
6. Tras cambios, revisar consola del navegador y probar en las 5 páginas (comparten main.js).
7. No commitear a menos que el usuario lo pida explícitamente.

---

## 11. Planes existentes en .kilo/plans (aplicados y pendientes)

- `auditoria-base-datos-supabase.md`: auditoría DB-frontend.
- `modernizacion-leyenda-rangos-auditoria.md`: bugs B1-B12, seguridad M1, gamificación M3, sorteo/likes M4, rendimiento M2, SEO/a11y Fase 4.
- `muro-anti-impersonacion-plan.md`: muro anti-suplantación + sorteo multiticket (ambos aplicados).
- Aplicado (Fase 0 + Fase 1): `alpine-adopcion-gradual-v2.md` (piloto Alpine en `sorteo.html`; pendiente validación con un sorteo real antes de la Fase 2).

---

## 12. Alpine.js (fase piloto)

- Estado: excepción aprobada el 2026-10-21 e implementada (Fase 0 + Fase 1); pendiente un sorteo real sin incidencias antes de la Fase 2.
- Alcance ejecutado: solo `sorteo.html` y la lista de participantes online (store `sorteo.participantes`); `listaPublica` (modo manual) sigue en vanilla.
- Alpine se carga con `defer` después de `main.js`, versión fijada 3.17.5 y SRI verificado (55.935 bytes); es la única página que lo carga.
- Store registrado en `alpine:init` dentro del script inline de la página; no hay stores globales en `main.js`.
- Estado en `Alpine.store`; render con `x-for`/`x-text`; no se manipula el DOM de nodos gestionados por Alpine.
- Preferir `x-text`; `x-html` solo con `escapeHtml`/`escapeAttr`.
- Acceso desde JS con `obtenerStoreSorteo()` y guarda de `null`; si Alpine o el store faltan, la lista muestra aviso, el contador muestra `—` y el modo manual sigue operativo.
- Tema, toasts, modales, auth, helpers globales y Realtime base siguen en vanilla.
- Una página y una sección por iteración; no abrir otra página hasta cerrar el piloto.
- Plan: `.kilo/plans/alpine-adopcion-gradual-v2.md`.

---

*Última actualización: 2026-10-21. Piloto Alpine (Fase 0 + Fase 1) implementado en `sorteo.html`: lista de participantes online con store `sorteo` y `<template x-for>`, render manual eliminado y fallback visible. Validado en Chrome headless (Alpine 3.17.5, SRI, reactividad y CDN bloqueado); queda pendiente un sorteo real antes de abrir la Fase 2. El resto del frontend (5 HTML, `main.js`, `style.css`) y la base de datos Supabase (proyecto `cydiyaacnyydprgffmkq`) siguen verificados.*
