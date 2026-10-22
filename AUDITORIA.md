# Auditoría LaGochaGaming — 2026-10-22

> Resumen accionable en `agent.md` §13. Este documento contiene el detalle técnico completo.

---

## 1. Estado General

**SÓLIDO Y BIEN MANTENIDO**. El proyecto está implementado, revisado y funcional según `agent.md`. No hay problemas críticos bloqueantes. La arquitectura (5 páginas estáticas + Supabase + `main.js`/`style.css` compartidos) es coherente y escalable para el alcance actual.

- **Git**: 2 commits locales listos para push (`origin/main`).
- **Supabase**: proyecto `cydiyaacnyydprgffmkq` (Postgres 17, región `us-west-2`), 10 tablas, 28 RPCs, 34 políticas RLS, 23 índices, 7 tablas en Realtime, extensión `unaccent`.
- **Alpine.js 3.17.5**: Fase piloto aprobada (2026-10-21), implementada en `sorteo.html` (Fase 1), `galeria.html` (Fases 2a, 2b), `comunidad.html` (Fase 2c). Pendiente: sorteo real de validación.

---

## 2. Hallazgos por Categoría

### 2.1 Seguridad y Autenticación

| Hallazgo | Severidad | Detalle |
|----------|-----------|---------|
| Anon key hardcodeada en `main.js:13` | **Media** | Es clave pública (anon), aceptable para proyecto estático, pero considerar rotar periódicamente (buena práctica anual). |
| Dos sistemas de auth separados (Supabase + Comunidad) | **Correcto** | Bien aislados: Supabase Auth para admin (`gocha@admin.com`); Comunidad (apodo+PIN) con tablas propias y RPCs dedicados. |
| RLS en todas las tablas (34 políticas) | **Correcto** | Verificado en `agent.md` §6. Admin vía `es_admin()`. |
| `ADMIN_EMAIL` hardcodeado (`gocha@admin.com`) | **Baja** | Podría extraerse a variable de entorno si se migra a build, pero no crítico en sitio estático. |
| Sin CSP (Content Security Policy) | **Media** | Alpine.js requiere `unsafe-eval`; documentar antes de añadir CSP. |

### 2.2 Rendimiento y Optimización

| Hallazgo | Severidad | Detalle |
|----------|-----------|---------|
| Caché de stream 60s + backoff exponencial | **Correcto** | `main.js:474-507` bien implementado. |
| Caché de rangos 30s en memoria (`comunidad.html`) | **Correcto** | `obtenerRangosCache` evita consultas repetidas a Supabase. |
| Caché de verificación Kick 30min (`sorteo.html`) | **Correcto** | `sessionStorage` con TTL en `verificarHandleKick`. |
| **Imágenes sin optimizar** | ~~**Alta**~~ ✅ **RESUELTO** | `img/fono.png` = **2.05 MB** → **`fono.webp` 69 KB**; `android-chrome-512x512.png` = 539 KB → **112 KB**, `android-chrome-192x192.png` = 93 KB → **24 KB**, `apple-touch-icon.png` = 83 KB → **22 KB**. CSS actualizado a `fono.webp`. |
| **Font Awesome 6.6.0 completo** | **Media** | ~78 KB CSS + fuentes. Considerar subset (solo iconos usados) o SVG inline. |
| Sin lazy-loading en hero | **Baja** | `background-image: url('img/fono.png')` en CSS carga siempre. |
| Polling stream cada 90s en **todas** las páginas | **Baja** | Incluye páginas que no usan stream (galería, sorteo, comunidad). Desactivar donde no se usa. |

### 2.3 Accesibilidad (a11y)

| Hallazgo | Severidad | Detalle |
|----------|-----------|---------|
| Trampa de foco en modales (`main.js:136-176`) | **Correcto** | Bien implementado con `Tab`/`Shift+Tab` loop. |
| `prefers-reduced-motion` respetado (`style.css:1288-1294`) | **Correcto** | Desactiva animaciones/transiciones. |
| ARIA labels, roles, `aria-live` en toasts/alertas | **Correcto** | |
| **Contraste en modo claro** | **Media** | Verificar `--text-muted: #64748b` sobre `--card-bg: #ffffff` (ratio ~4.5:1, límite AA para texto normal). |
| Inputs sin `autocomplete` coherente | **Baja** | Algunos usan `autocomplete="email"`, otros no. |
| Foco visible en elementos interactivos | **Baja** | `.btn-primary` tiene `:focus-visible`; revisar botones custom (`.btn-admin-mode`, `.tab-btn`, etc.). |

### 2.4 Código y Arquitectura

| Hallazgo | Severidad | Detalle |
|----------|-----------|---------|
| `main.js` como fuente única de helpers | **Correcto** | `escapeHtml`, `lanzarConfetti`, `esAdminActual`, `activarTrampaFoco`, `initTema`, `mostrarToast`, `iniciarPollingStreamGlobal`, etc. |
| Patrones consistentes: `data-action`, delegación de eventos | **Correcto** | |
| **Duplicación de markup de navbar/footer** | **Media** | 5 páginas repiten header/footer (~120 líneas × 5). Considerar SSI (Netlify Edge Functions, Cloudflare Workers) o include en servidor estático. |
| **Inline styles extensos en cada HTML** | **Baja** | `comunidad.html` ≈ 400 líneas, `galeria.html` ≈ 360, `sorteo.html` ≈ 410. Migrar a `style.css` donde sea compartido. |
| Variables CSS repetidas en `style.css` y `<style>` locales | **Baja** | Algunas sombras/colores se redefinen localmente. |
| `galeria.html` carga Alpine antes que `main.js` | **Baja** | Orden actual: `main.js` (defer) → Alpine (defer). Funciona pero `main.js` inserta componentes UI que Alpine puede necesitar. |

### 2.5 Bugs y Problemas Funcionales Detectados

| # | Archivo | Línea | Problema | Impacto |
|---|---------|-------|----------|---------|
| 1 | `index.html` | 348 | `document.addEventListener('DOMContentLoaded', async () => {` y cierre en línea 583 con `});` pero **falta el `});` final del event listener** (línea 610 cierra el `<script>` pero el listener queda abierto) | ~~**Alto**~~ ✅ **RESUELTO** — Faltaba `}` en `if (tokenComunidad)`; cerrado correctamente |
| 2 | `cine.html` | 377 | `cargarEstadoCine()` usa `window.supabase` pero no verifica `window.supabaseReady` | **Medio** — Puede fallar si Supabase tarda en inicializarse |
| 3 | `comunidad.html` | 1971 | `obtenerRangosCache` hace `select('apodo, rango')` pero tabla tiene `apodo_norm` generado; consultar por `apodo` puede no usar índice único | **Bajo** — Rendimiento |
| 4 | `galeria.html` | 770 | `loadApprovedImages` llama `cargarTopGlobal()` dentro del `if (filtroActual === 'populares')` pero **no espera a que termine** antes de mapear fotos | ~~**Medio**~~ ✅ **RESUELTO** — `await cargarTopGlobal()` movido antes del mapeo, incondicional |
| 5 | `sorteo.html` | 943 | `verificarHandleKick` cachea solo si `kickUserId` existe; fallos de red se cachean como válidos implícitamente | **Bajo** — Puede permitir usuarios inexistentes temporalmente |

### 2.6 SEO y Metadatos

| Hallazgo | Detalle |
|----------|---------|
| Meta tags completos (OG, Twitter, canonical) en todas las páginas | ✅ |
| `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, `CNAME` | ✅ |
| **`index.html` tiene canonical pero otras páginas no** | ⚠️ Añadir `<link rel="canonical" href="https://lagochagaming.com/...">` a cine, comunidad, galería, sorteo |
| Sin `hreflang` | Solo español, no crítico |

### 2.7 Plan Piloto Alpine.js (estado actual)

| Fase | Página | Alcance | Estado |
|------|--------|---------|--------|
| 0-1 | `sorteo.html` | Lista participantes online (store `sorteo.participantes`) | ✅ Implementado |
| 2a | `galeria.html` | Grid público + lightbox (store `galeria.fotos`, `galeria.lightbox`) | ✅ Implementado |
| 2b | `galeria.html` | Moderación pendientes (store `galeria.pendientes`, `galeria.pendientesEstado`, `galeria.errorPendientes`) | ✅ Implementado |
| 2c | `comunidad.html` | Chat mensajes (store `chat.mensajes`, `chat.cargando`, `chat.error`); reacciones en vanilla `x-ignore` | ✅ Implementado |
| 2d | `comunidad.html` | Reacciones del chat (store separado) | ⏳ Pendiente |
| 2e | `comunidad.html` | Leaderboard y rangos (store `ranking`) | ⏳ Pendiente |

**Requisitos previos para 2d/2e** (según `alpine-adopcion-gradual-v2.md` §5.6):
- ✅ Un sorteo real validado en directo (pendiente)
- ✅ Sesión admin real probada
- ✅ Realtime chat/moderación con dos pestañas

---

## 3. Métricas de Código

| Archivo | Líneas | Tamaño | Complejidad |
|---------|--------|--------|-------------|
| `main.js` | 625 | 24 KB | Núcleo compartido |
| `style.css` | 1,295 | 44 KB | Design system completo |
| `index.html` | 613 | 29 KB | Hero, stream, muro |
| `cine.html` | 656 | 29 KB | Reproductor sincronizado |
| `comunidad.html` | 2,276 | 121 KB | Chat, rangos, leaderboard |
| `galeria.html` | 1,348 | 60 KB | Grid, lightbox, moderación |
| `sorteo.html` | 1,306 | 58 KB | Dual mode, ruleta |

**Total: ~7,000 líneas frontend** — Mantenible para equipo pequeño.

---

## 4. Plan de Acción Recomendado (Priorizado)

### 🔴 Crítico (Hacer ya) — **RESUELTOS 2026-10-22**
1. ✅ **Fix `index.html` línea 348** — Cerrado correctamente el `DOMContentLoaded` listener (faltaba `}` en `if (tokenComunidad)`).
2. ✅ **Optimizar imágenes** — `fono.png` 2MB → **`fono.webp` 69 KB**; favicons comprimidos (512px 539→112 KB, 192px 93→24 KB, apple-touch 83→22 KB); CSS actualizado.
3. ✅ **Fix `galeria.html` línea 770** — `await cargarTopGlobal()` movido **antes** del mapeo, incondicional — badges TOP aparecen en primera carga.

### 🟠 Alto (Próxima iteración)
4. **Añadir `canonical` a las 4 páginas faltantes** (cine, comunidad, galería, sorteo).
5. **Verificar contraste modo claro** (WCAG AA) — ajustar `--text-muted` o `--card-bg` si necesario.
6. **Desactivar polling stream en páginas que no lo usan** — en `cine.html`, `galeria.html`, `sorteo.html`, `comunidad.html` no llamar `iniciarPollingStreamGlobal()` o condicionar en `main.js`.

### 🟡 Medio (Deuda técnica)
7. **Extraer navbar/footer a partials** (SSI/Edge Function) o componente compartido.
8. **Migrar CSS inline común a `style.css`** (tabs, modales, formularios, `.chat-msg-*`, `.gallery-card-*`, `.participants-*`, etc.).
9. **Subset Font Awesome** o migrar a SVG inline para iconos usados (revisar `main.js` y cada HTML para lista real).
10. **Revisar orden de carga Alpine vs `main.js`** en `galeria.html` y `comunidad.html` — mover Alpine después de `main.js` si se necesitan componentes UI globales.

### 🟢 Bajo (Mejora continua)
11. **CSP con `unsafe-eval` documentado** para Alpine (añadir meta tag o header cuando se implemente CSP).
12. **Rotar anon key Supabase** (buena práctica anual; generar nueva en dashboard y actualizar `main.js:13`).
13. **Tests de humo automatizados** — Playwright MCP ya configurado en `.playwright-mcp/`; añadir tests para flujos críticos (login comunidad, subir foto, participar en sorteo, muro saludos).

---

## 5. Referencias

- `agent.md` — Contexto del proyecto, convenciones, estado del piloto Alpine.
- `.kilo/plans/alpine-adopcion-gradual-v2.md` — Plan detallado de adopción Alpine (Fases 0-3).
- `.kilo/plans/modernizacion-leyenda-rangos-auditoria.md` — Bugs B1-B12, mejoras M1-M4 (ya aplicados).
- `.kilo/plans/muro-anti-impersonacion-plan.md` — Muro anti-suplantación + sorteo multiticket (aplicado).
- `.kilo/plans/auditoria-base-datos-supabase.md` — Auditoría DB-frontend.

---

*Generado automáticamente durante auditoría 2026-10-22. Actualizado 2026-10-22: 3 críticos resueltos (muro saludos, imágenes WebP, badges TOP galería).*