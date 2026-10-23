# Auditoría Web — LaGochaGaming (5 páginas + main.js + style.css)

**Alcance:** `index.html`, `galeria.html`, `comunidad.html`, `cine.html`, `sorteo.html`, `main.js`, `style.css`
**Enfoque:** rendimiento, bugs y errores.

---

## 1. Rendimiento

### 1.1 Recursos de terceros pesados en todas las páginas
- **Bootstrap 6.0.0-alpha.1** (CSS + JS bundle) cargado en las 5 páginas, aunque el sitio usa CSS propio (`style.css`) y casi no aprovecha Bootstrap. Peso ~200 KB + JS. **Recomendación:** eliminar Bootstrap o usar solo las utilidades necesarias.
- **Font Awesome 6.6.0** (CSS completo) en todas las páginas. **Recomendación:** subset de iconos usados o SVG inline.
- **Google Fonts** (Inter 3 pesos + Poppins 3 pesos) con `display=swap` (OK). Considerar self-hosting para evitar FOUT/CLS.
- **Supabase SDK** (`@supabase/supabase-js@2`) sin versión fijada → puede cambiar y romper. Fijar versión.

### 1.2 Iframes y contenido embebido
- `index.html`: Kick stream + chat (2 iframes), Juicer ×2, YouTube. Todos con `loading="lazy"` (bien). El iframe de Kick stream tiene `autoplay=true&muted=1`.
- `cine.html`: Kick stream + chat.
- `comunidad.html`: sin iframes externos (bien).
- **CLS:** las imágenes de galería (`<img loading="lazy">`) no tienen `width`/`height` explícitos → layout shift. Añadir dimensiones o aspect-ratio.

### 1.3 CSS
- `style.css` de 1223 líneas, un solo archivo compartido por las 5 páginas. Buena caché, pero incluye estilos específicos de cada página (comunidad, cine, sorteo) que se descargan aunque no se usen. Considerar split por página o purga.
- Cada HTML repite bloques `<style>` inline (galeria ~380 líneas, comunidad ~450 líneas, cine ~175, sorteo ~450). No se cachean y duplican reglas. Mover a `style.css` o CSS por página.
- Uso extensivo de `!important` implícito y selectores de alta especificidad en varios bloques.

### 1.4 JavaScript
- `main.js` (624 líneas) se carga con `defer` en todas las páginas → bloquea `DOMContentLoaded` solo parcialmente. OK.
- Polling del stream cada 90 s con `setInterval`; se pausa con `visibilitychange` (bien). Backoff exponencial hasta 5 min (bien).
- `verificarEstadoStream` hace `fetch` a `kick.com/api/v2/channels/lagochagaming` → puede fallar por CORS/rate limit; manejado con backoff.
- Confeti (`lanzarConfetti`) crea un canvas por llamada y corre `requestAnimationFrame` hasta que todas las partículas caen → puede jank en móvil. Considerar `will-change` y limitar cantidad.

### 1.5 Imágenes
- Imágenes de clips usan CSS `background-image` con archivos `img/1.jpg`, `img/2.jpg`, `img/3.jpg` sin dimensiones ni formatos modernos (WebP/AVIF). Convertir y añadir `srcset`.
- `img/3.jpg` se usa como OG image (1200×630 recomendado).

---

## 2. Bugs y errores detectados

### 2.1 Texto y markup
- **`sorteo.html` línea 14/25:** meta description con typo `premiosincreíbles` (falta espacio) y línea 25 concatena `<meta ...><link rel="manifest"...>` sin salto de línea (cosmético pero inválido-ish).
- **`index.html` línea 182:** `allowfullscreen="true"` es atributo deprecated; usar `allow="fullscreen"` o solo `allowfullscreen`.
- **`index.html` líneas 185-191:** `frameborder="0"` y `scrolling="no"` deprecated (usar CSS).
- **`comunidad.html`:** falta enlace a favicons en `<head>` (solo en otras páginas). Inconsistencia.

### 2.2 Lógica JavaScript
- **`main.js` línea 463-464:** `if (window._streamAbort) window._streamAbort.abort();` aborta el request anterior; OK, pero si el abort lanza, no se captura. Menor.
- **`main.js` polling:** comentario dice "Polling cada 60s" pero el intervalo es `90000` (90 s). Inconsistencia documentación.
- **`galeria.html`:** depende de Alpine.js cargado con `defer` al final. El script inline se ejecuta antes de Alpine → usa `document.addEventListener('alpine:init', ...)`. Si Alpine ya inicializó (caché), el store no se registra y se muestra "Galería no disponible". Manejado con fallback, pero puede confundir.
- **`sorteo.html`:** mismo patrón con store 'sorteo'. Fallback muestra "Lista no disponible".
- **`cine.html` línea 281:** YouTube IFrame API se carga con `defer`; `onYouTubeIframeAPIReady` está en script inline sin defer. Orden de carga puede fallar en algunos navegadores (la API llama a la global cuando esté lista; debería funcionar, pero frágil).
- **`index.html` línea 300:** Bootstrap JS cargado como `type="module"` → se ejecuta en modo estricto y no expone globals; innecesario para bundle UMD. Puede romper plugins que esperan global.
- **`index.html` línea 597-611:** detección de fallo de YouTube con `setTimeout` de 10 s y acceso a `contentWindow` cross-origin → siempre lanza excepción → siempre muestra fallback después de 10 s **aunque el video cargue correctamente**. **Bug real:** el fallback se muestra incorrectamente en todos los casos.

### 2.3 Accesibilidad
- Falta skip-link "Saltar al contenido" en las 5 páginas.
- `index.html` nav: `<a href="./#stream">` etc. OK, pero el menú móvil no cierra con Escape.
- Modales: trampa de foco implementada en `main.js` (bien). Cierre por Escape implementado (`cerrarModalVisible`).
- `sorteo.html` canvas de confeti no tiene `aria-hidden`.
- Algunos `<button>` sin `type` (default submit) dentro de formularios → puede enviar form accidentalmente (ej. `btn-toggle-admin` dentro de form en galeria no está en form, OK).

### 2.4 Seguridad (frontend)
- `SUPABASE_KEY` (anon) expuesta en `main.js` → esperado para cliente, pero asegurar RLS en BD (ver auditoría BD).
- `ADMIN_EMAIL = 'gocha@admin.com'` hardcodeado y verificado solo por email de sesión → si alguien crea cuenta con ese email en Supabase Auth, tendría permisos de admin. **Riesgo:** verificar que el email esté confirmado y, mejor, usar role/claim.
- `validarSesionStreamer` solo llama a `esAdminActual()` → cualquier sesión autenticada con ese email pasa.

### 2.5 Inconsistencias entre páginas
- `index.html` y `galeria.html` cargan Supabase **sin** `defer`; `cine.html` y `sorteo.html` con `defer`. `comunidad.html` sin defer. Orden inconsistente → race conditions con `main.js` (defer).
- `comunidad.html` carga Alpine con SRI integrity; otras páginas no usan Alpine.
- `index.html` tiene `referrerpolicy="no-referrer"` en Font Awesome; otras no.
- `cine.html` Font Awesome sin `referrerpolicy`.

### 2.6 Errores de consola probables
- `galeria.html` línea 426: `x-text="$store.galeria.pendientesEstado === 'error' ? '?' : $store.galeria.pendientes.length"` dentro de `<span>` con texto inicial `0` → parpadeo.
- `sorteo.html` línea 574: `x-text="$store.sorteo.participantes.length"` dentro de `<span>` con texto inicial `0`.
- `comunidad.html` línea 499: `x-data="{}"` en `#leaderboard-list` dentro de un contenedor que ya tiene Alpine store → puede crear scope vacío y no reaccionar. Verificar.

---

## 3. Recomendaciones priorizadas

1. **Corregir fallback de YouTube en `index.html`** (siempre se muestra tras 10 s). Revisar lógica de detección.
2. **Fijar versión de Supabase SDK** (`@supabase/supabase-js@2.x.x`).
3. **Eliminar o justificar Bootstrap** (alpha, pesado, poco usado).
4. **Añadir `width`/`height`** a imágenes para evitar CLS.
5. **Mover CSS inline** de cada página a archivos cacheables.
6. **Corregir typo** `premiosincreíbles` en `sorteo.html`.
7. **Cambiar `allowfullscreen="true"`** por `allowfullscreen`.
8. **Hardening admin:** verificar email confirmado o usar custom claim en vez de comparar email.
9. **Unificar carga de scripts** (defer consistente) entre páginas.
10. **Optimizar confeti** (limitar partículas, usar `requestIdleCallback`).

---

Auditoría completada. No se modificó ningún archivo.
