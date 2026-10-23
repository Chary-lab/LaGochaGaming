# agent.md — Resumen consolidado de auditoría (LaGochaGaming)

**Proyecto:** LaGochaGaming
**Fecha:** 2026-10-23
**Fuentes:** auditoria-web.md, auditoria-bd.md (ningún archivo modificado en las auditorías)

---

## 1. Estado de la base de datos (Supabase)

**Proyecto:** `cydiyaacnyydprgffmkq` · Región `us-west-2` · Postgres `17.11` · Estado `ACTIVE_HEALTHY`

### Esquema público — 10 tablas

| Tabla | Filas aprox. | PK | Observaciones |
|---|---|---|---|
| comunidad_chat | 1 | id bigint | Chat de comunidad |
| comunidad_sesiones | 1 | token text | RLS habilitado **sin políticas** |
| config_sorteo | — | id int | Configuración de sorteo |
| galeria | 8 | id bigint | Fotos de galería |
| ganadores_sorteo | — | id bigint | Ganadores |
| message_reactions | 0 | id bigint (seq) | Reacciones a mensajes |
| muro_saludos | 57 | id bigint | Muro de saludos |
| participantes_en_vivo | — | id int (seq) | Participantes en vivo |
| sync_cine | — | id bigint | Sync de cine |
| usuarios_comunidad | 1 | id bigint | Usuarios de comunidad |

Columnas destacadas: `usuarios_comunidad` (apodo, apodo_norm, pin_hash, puntos, rango, ultimo_punto); `galeria` (title, image_url, thumb_url, estado default 'pendiente', likes, autor, created_at); `comunidad_sesiones` (token, usuario_id FK, creado_en, expira_en default +30 días, ultimo_mensaje_en, ultimo_punto_en).

### Claves foráneas
Todas las FK tienen índice de soporte:
- comunidad_sesiones.usuario_id → usuarios_comunidad.id (CASCADE)
- message_reactions.message_id → comunidad_chat.id (CASCADE)
- muro_saludos.usuario_id → usuarios_comunidad.id (SET NULL)

### Índices
4 índices reportados como no usados (candidatos a eliminar con `DROP INDEX CONCURRENTLY` tras confirmar patrones de consulta):
- `idx_galeria_estado_created` (galeria)
- `idx_galeria_estado_likes` (galeria)
- `idx_chat_created` (comunidad_chat)
- `idx_usuarios_puntos` (usuarios_comunidad)

### RLS y políticas
Patrón consistente: lectura pública (`anon, authenticated` SELECT true) y escritura solo admin (`es_admin()`) en tablas de contenido.
**Problema:** `comunidad_sesiones` tiene RLS habilitado pero 0 políticas → nadie puede leer/escribir vía PostgREST. Puede ser intencional (acceso solo vía RPCs SECURITY DEFINER), pero conviene verificar/documentar.

### Funciones RPC (27 en public)
- SECURITY DEFINER (14): `actualizar_autor_galeria`, `asignar_peso_sorteo`, `cerrar_sesion_comunidad`, `enviar_mensaje_chat`, `establecer_reaccion`, `incrementar_likes` (2 sobrecargas), `incrementar_puntos_comunidad`, `login_comunidad`, `publicar_foto_galeria` (2 sobrecargas), `publicar_saludo_muro`, `registrar_comunidad`, `registrar_participante_sorteo`, `sortear_ganador_sorteo`, `validar_sesion_comunidad`.
- SECURITY INVOKER (13): `apodo_norm`, `calcular_rango`, `es_admin`, `handle_sorteo_valido`, `multiplicador_rango`, `nombre_valido`, `obtener_rangos`, `patron_bloqueado`, `patron_simbolos`, `unaccent_texto`, `usuarios_rango_trg`.

### Triggers
- `trg_usuarios_rango` — BEFORE INSERT/UPDATE on `usuarios_comunidad` → `usuarios_rango_trg()` (recalcula rango automáticamente).

### Storage
Bucket `fotos-galeria`: público, límite 5 MB, MIME: png, jpeg, webp, gif, avif.

### Extensiones (6)
`supabase_vault`, `unaccent`, `uuid-ossp`, `pgcrypto`, `plpgsql`, `pg_stat_statements`.

### Migraciones
28 migraciones aplicadas. Última: `20261023075705_eliminar_visitas_tracking` (se eliminó la tabla de tracking de visitas). Historial coherente con el esquema actual.

### Edge Functions
Ninguna desplegada.

---

## 2. Estado del frontend (Web)

**Alcance:** `index.html`, `galeria.html`, `comunidad.html`, `cine.html`, `sorteo.html`, `main.js` (624 líneas), `style.css` (1223 líneas).

### Rendimiento
- Bootstrap 6.0.0-alpha.1 (CSS + JS bundle, ~200 KB) cargado en las 5 páginas aunque casi no se usa. Recomendación: eliminar o usar solo utilidades necesarias.
- Font Awesome 6.6.0 CSS completo en todas las páginas. Recomendación: subset de iconos o SVG inline.
- Google Fonts (Inter 3 pesos + Poppins 3 pesos) con `display=swap` (OK). Considerar self-hosting para evitar FOUT/CLS.
- Supabase SDK `@supabase/supabase-js@2` sin versión fijada → puede romper por cambios de versión.
- Iframes con `loading="lazy"` (bien). Kick stream con `autoplay=true&muted=1`.
- CLS: imágenes de galería (`<img loading="lazy">`) sin `width`/`height` explícitos → layout shift.
- `style.css` incluye estilos específicos de cada página que se descargan aunque no se usen. Bloques `<style>` inline repetidos en cada HTML (galeria ~380, comunidad ~450, cine ~175, sorteo ~450 líneas) que no se cachean y duplican reglas.
- `main.js` carga con `defer` en todas las páginas (OK).
- Polling del stream cada 90 s con `setInterval`, se pausa con `visibilitychange` y backoff exponencial hasta 5 min (bien).
- `verificarEstadoStream` hace `fetch` a `kick.com/api/v2/channels/lagochagaming` → posible CORS/rate limit, manejado con backoff.
- Confeti (`lanzarConfetti`) crea canvas por llamada con `requestAnimationFrame` hasta que caen las partículas → posible jank en móvil.
- Imágenes de clips usan CSS `background-image` con `img/1.jpg`, `img/2.jpg`, `img/3.jpg` sin dimensiones ni formatos modernos (WebP/AVIF).

### Bugs y errores detectados
- `sorteo.html`: typo en meta description `premiosincreíbles` (falta espacio); línea 25 concatena `<meta ...><link rel="manifest"...>` sin salto de línea.
- `index.html` línea 182: `allowfullscreen="true"` deprecated (usar `allowfullscreen` o `allow="fullscreen"`).
- `index.html` líneas 185-191: `frameborder="0"` y `scrolling="no"` deprecated (usar CSS).
- `comunidad.html`: falta enlace a favicons en `<head>` (inconsistencia con otras páginas).
- `main.js` 463-464: aborta request anterior sin capturar si el abort lanza (menor).
- `main.js` polling: comentario dice 60s pero intervalo es 90000 (90s). Inconsistencia en documentación.
- `galeria.html`: depende de Alpine.js con `defer`; si Alpine ya inicializó (caché), el store no se registra y se muestra "Galería no disponible" (tiene fallback).
- `sorteo.html`: mismo patrón con store 'sorteo' (fallback "Lista no disponible").
- `cine.html` línea 281: YouTube IFrame API con `defer`; `onYouTubeIframeAPIReady` en script inline sin defer. Frágil.
- `index.html` línea 300: Bootstrap JS como `type="module"` → modo estricto, no expone globals; puede romper plugins UMD.
- `index.html` línea 597-611: **Bug real** — detección de fallo de YouTube con `setTimeout` de 10 s y acceso a `contentWindow` cross-origin → siempre lanza excepción → el fallback se muestra tras 10 s **aunque el video cargue correctamente**.
- Modales: trampa de foco y cierre por Escape implementados (bien).
- Falta skip-link "Saltar al contenido" en las 5 páginas.
- Menú móvil no cierra con Escape.
- Canvas de confeti en `sorteo.html` sin `aria-hidden`.
- Algunos `<button>` sin `type` (default submit) dentro de formularios → posible envío accidental.
- Errores de consola probables: parpadeo en `galeria.html` línea 426 y `sorteo.html` línea 574 (`x-text` con texto inicial `0`); `comunidad.html` línea 499 (`x-data="{}"` puede crear scope vacío).

### Seguridad frontend
- `SUPABASE_KEY` (anon) expuesta en `main.js` (esperado para cliente, asegurar RLS en BD).
- `ADMIN_EMAIL = 'gocha@admin.com'` hardcodeado y verificado solo por email de sesión → si alguien crea cuenta con ese email en Supabase Auth, tendría permisos de admin.
- `validarSesionStreamer` solo llama a `esAdminActual()` → cualquier sesión autenticada con ese email pasa.

### Inconsistencias entre páginas
- `index.html` y `galeria.html` cargan Supabase sin `defer`; `cine.html` y `sorteo.html` con `defer`; `comunidad.html` sin defer. Orden inconsistente → race conditions con `main.js` (defer).
- `comunidad.html` carga Alpine con SRI integrity; otras páginas no usan Alpine.
- `index.html` tiene `referrerpolicy="no-referrer"` en Font Awesome; otras no.
- `cine.html` Font Awesome sin `referrerpolicy`.

---

## 3. Problemas encontrados (consolidado)

### Base de datos
1. `comunidad_sesiones`: RLS habilitado sin políticas (nadie accede vía PostgREST).
2. `publicar_foto_galeria` no fija `search_path` → riesgo de hijacking de esquema.
3. 13 funciones SECURITY DEFINER ejecutables por `anon` vía `/rest/v1/rpc/...`; revisar que ninguna exponga datos sensibles sin validación de token (especialmente `sortear_ganador_sorteo`, `asignar_peso_sorteo`, `actualizar_autor_galeria`).
4. Protección contra contraseñas filtradas (HaveIBeenPwned) deshabilitada en Auth.
5. 4 índices no usados (candidatos a eliminar).

### Frontend
1. **Bug crítico:** fallback de YouTube en `index.html` siempre se muestra tras 10 s aunque el video cargue.
2. Tipografía/markup: typo `premiosincreíbles`, meta+link concatenados sin salto de línea, `allowfullscreen="true"` deprecated, `frameborder`/`scrolling` deprecated, falta favicon en `comunidad.html`.
3. Rendimiento: Bootstrap pesado y poco usado, Font Awesome completo, Supabase SDK sin versión fijada, CLS en imágenes de galería, CSS inline no cacheable, confeti pesado en móvil, imágenes sin WebP/AVIF ni dimensiones.
4. Accesibilidad: falta skip-link, menú móvil no cierra con Escape, canvas confeti sin `aria-hidden`, botones sin `type` dentro de formularios.
5. Seguridad: `ADMIN_EMAIL` hardcodeado, verificación de admin solo por email de sesión (riesgo de suplantación).
6. Inconsistencias de carga de scripts (`defer` mixto), SRI solo en `comunidad.html`, `referrerpolicy` inconsistente.
7. Errores de consola probables en galería, sorteo y comunidad (Alpine stores).

---

## 4. Pendientes / Recomendaciones priorizadas

### Base de datos (prioridad)
1. Activar leaked password protection en Auth (configuración de proyecto, no SQL).
2. Fijar `search_path` en `publicar_foto_galeria` y auditar otras funciones SECURITY DEFINER.
3. Decidir sobre `comunidad_sesiones`: añadir políticas RLS mínimas o documentar acceso exclusivamente por RPC.
4. Revisar EXECUTE en funciones SECURITY DEFINER: revocar `EXECUTE` a `anon`/`authenticated` en las que no deban ser públicas (especialmente funciones de admin).
5. Evaluar eliminar los 4 índices no usados tras confirmar patrones de consulta reales.

### Frontend (prioridad)
1. Corregir fallback de YouTube en `index.html` (lógica de detección siempre muestra fallback tras 10 s).
2. Fijar versión de Supabase SDK (`@supabase/supabase-js@2.x.x`).
3. Eliminar o justificar Bootstrap (alpha, pesado, poco usado).
4. Añadir `width`/`height` a imágenes para evitar CLS.
5. Mover CSS inline de cada página a archivos cacheables (`style.css` o CSS por página).
6. Corregir typo `premiosincreíbles` en `sorteo.html`.
7. Cambiar `allowfullscreen="true"` por `allowfullscreen`.
8. Hardening admin: verificar email confirmado o usar custom claim en vez de comparar email.
9. Unificar carga de scripts (`defer` consistente) entre páginas.
10. Optimizar confeti (limitar partículas, usar `requestIdleCallback`).

---

**Notas:** Ninguna auditoría modificó archivos. Este resumen es de solo lectura y sirve como base de trabajo para el equipo de desarrollo.
