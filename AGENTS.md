# AGENTS.md — LaGochaGaming

## Project Overview
- **Name:** LaGochaGaming (lagochagaming.com)
- **Type:** Static site (no build/bundler/npm)
- **Stack:** Vanilla HTML5/CSS3/JS (ES2020+), Bootstrap CSS (utilities only), Alpine.js 3.17.5 (galeria/comunidad/sorteo), Supabase JS v2.118.0, Font Awesome 6.6.0, Google Fonts (Inter/Poppins)
- **Backend:** Supabase (project `cydiyaacnyydprgffmkq`, us-west-2, Postgres 17.11). Auth, Realtime, Storage, RPC. No Edge Functions.
- **Deployment:** GitHub Pages (push to `main`), CNAME `lagochagaming.com`. `_headers` ignored by GitHub Pages.
- **Version:** v1.4.5

## Architecture
```
GitHub Pages (static files)
  index.html | galeria.html | comunidad.html | cine.html | sorteo.html
  main.js | style.css
           │
           ▼ HTTPS
        Supabase (Auth/DB/Realtime/Storage/RPC)
```

## File Map
| File | Purpose |
|------|---------|
| `index.html` | Home: hero/stream (Kick), clips, Juicer social feed, YouTube, muro de saludos |
| `galeria.html` | Public gallery, upload, admin moderation, lightbox, Alpine store |
| `comunidad.html` | Chat, ranking, online presence, reactions, gamification, celebration |
| `cine.html` | GochiWatch (YouTube IFrame API + HTML5 video), sync via `sync_cine`, streamer panel |
| `sorteo.html` | Manual/public roulette + streamer mode, live registration, winners |
| `main.js` | Global helpers, admin check (`esAdminActual`), theme, modals/toasts/focus trap, Kick polling, UI components |
| `style.css` | Global styles, theme (light/dark), responsive |
| `ninjas.md` | Full audit (reference) |
| `VERSION` | `1.4.3` |

## Script Loading Order (all pages)
1. Supabase JS CDN (defer)
2. `main.js` (defer) — exposes `window.*`
3. Inline page script
4. Alpine.js (defer) — only galeria/comunidad/sorteo

Everything exposed on `window.*`; no ES modules. `DOMContentLoaded` initializes global UI/polling/theme/nav.

## Backend (Supabase) Notes
- **Tables (relevant):** `comunidad_chat`, `comunidad_sesiones` (RPC-only), `config_sorteo`, `galeria` (approved or admin), `ganadores_sorteo`, `message_reactions`, `muro_saludos` (approved or admin), `participantes_en_vivo`, `sync_cine`, `usuarios_comunidad` (public read), `donaciones` (orphaned, unused).
- **Revoked for anon:** `usuarios_comunidad.pin_hash`, `apodo_norm`, `ultimo_punto` (401).
- **RPCs (key):** `es_admin()` SECURITY INVOKER (reads `app_metadata.role`), `sortear_ganador_sorteo()` SECURITY DEFINER (auth only), `registrar_participante_sorteo(text,bigint)` SECURITY DEFINER (callable by anon - accepted risk), `login_comunidad`/`registrar_comunidad`/`validar_sesion_comunidad`/`cerrar_sesion_comunidad`, `publicar_foto_galeria` SECURITY DEFINER (auth), `incrementar_likes`, `publicar_saludo_muro`, `enviar_mensaje_chat`, `establecer_reaccion`, `incrementar_puntos_comunidad`, `obtener_rangos()`.
- **Auth:** Only `gocha@admin.com` confirmed with `app_metadata.role='admin'`. Email confirmation required, no MFA. `admin.com` MX points to localhost (recovery only via Admin API).
- **Storage:** Bucket `fotos-galeria` public, 5MB, types png/jpeg/webp/gif/avif, folder `gallery/`. Magic bytes validated client-side only.
- **RLS:** Enforced; writes blocked for anon on tested tables.

## Conventions
- **HTML/CSS/JS:** Vanilla, no build. Keep changes compatible.
- **XSS:** Use `window.escapeHtml` / `window.escapeAttr` from `main.js`. Prefer `textContent`/DOM over `innerHTML` where possible.
- **Admin:** Never check email on client. Use `window.esAdminActual()` (RPC `es_admin()` via JWT claims). Cache by user id, refresh on `onAuthStateChange`.
- **Modals/Focus:** Use focus trap (`activarTrampaFoco`/`desactivarTrampaFoco`), Escape to close, restore focus.
- **Toasts/Confirms:** `mostrarToast(msg, isError)`, `mostrarConfirmacionModal({titulo,mensaje,enConfirmar})`.
- **Realtime:** Use Supabase channels; clean up where needed. Polling: Kick every ~90s with backoff, pauses on `visibilitychange`.
- **Alpine:** Only in galeria/comunidad/sorteo.
- **Accessibility:** Skip-link present, focus states, aria-live where appropriate, aim for keyboard navigation.

## Known Issues / Risks (from audit)
- **Critical:** Admin validation missing in some flows (galeria/sorteo) - ensure `esAdminActual()` called before admin actions. Cine validates correctly.
- **Critical:** `<source src="">` in cine.html (invalid). 
- **Medium:** `registrar_participante_sorteo` callable by anon (accepted risk for public registration without account). `guardarGanadorOficial()` inserts directly into `ganadores_sorteo` in sorteo streamer fallback (should use RPC).
- **Medium:** No security headers in production (GitHub Pages ignores `_headers`).
- **Medium:** Large inline CSS/JS, Bootstrap/FA full, unoptimized images.
- **Low:** Table `donaciones` orphaned.

## Versioning (SemVer)

- **Source of truth:** The `VERSION` file contains the current version in `X.Y.Z` format (current: `1.4.5`).
- **Git tags:** Releases are tagged as `vX.Y.Z` matching the same number (e.g., `v1.4.3`). Full history: `git tag --list`.
- **Rule:** Follow [Semantic Versioning 2.0.0](https://semver.org/).
  - `MAJOR` (X): Incompatible/breaking changes
  - `MINOR` (Y): Backwards-compatible new features
  - `PATCH` (Z): Backwards-compatible bug fixes

### Process when updating version
1. **Determine bump:** Analyze changes to decide `patch`, `minor`, or `major`.
2. **Update files:** Change `VERSION` to the new number. Update references if needed (e.g., `ninjas.md`).
3. **Commit:** Commit changes with a clear message.
4. **Tag:** Create annotated tag: `git tag -a vX.Y.Z -m "Release vX.Y.Z"`.
5. **Push:** Push commits and tags: `git push && git push --tags`.

**Important:** Always start from the highest existing tag. Never reuse versions or skip the SemVer sequence.

**Rule:** On every change, update `AGENTS.md` version reference and `VERSION` to keep them in sync.

## Development
- **Run:** Open HTML files directly or serve locally (any static server). No build step.
- **Edit:** Follow existing patterns. Check neighbors/imports. Preserve behavior (Regla de Oro).
- **Lint/Typecheck:** Not configured. No tests.
- **Commit:** Only when explicitly requested.

## References
- Full audit: `ninjas.md` (711 lines) - includes Clan Hamato intervention plan (Fases 1-4)
- README: `README.md`
