# LaGochaGaming

Sitio oficial de la comunidad de LaGocha: HTML, CSS y JavaScript clásico, sin build ni dependencias npm de runtime.

## Páginas

- `index.html` — inicio, player de Kick, clips, feed social, YouTube y muro de saludos.
- `comunidad.html` — presencia, chat, reacciones, ranking y rangos.
- `galeria.html` — subida de fotos, galería pública, likes y moderación.
- `sorteo.html` — sorteo manual, tómbola online y modo streamer.
- `cine.html` — GochiWatch: sincronización de películas/videos.

## Stack

- HTML5 + CSS3 responsive (`style.css`).
- JavaScript vanilla (`main.js` y scripts por página).
- Supabase (Postgres, RLS, RPC, Realtime y Storage) con la librería JS 2.118.0.
- Alpine.js 3.17.5, Bootstrap 6 solo CSS y Font Awesome 6.4.0 por CDN.
- Hosting: GitHub Pages con dominio `lagochagaming.com`.

## Desarrollo local

No requiere instalación. Desde la raíz:

```powershell
python -m http.server 8765
```

Abrir `http://127.0.0.1:8765/`.

## Validaciones

```powershell
node scripts/check.js
node --check main.js
```

`scripts/check.js` valida sintaxis de scripts inline, IDs duplicados, recursos locales, SemVer, CSP básica y mustaches de Alpine en atributos.

## Base de datos

- Proyecto Supabase: `cydiyaacnyydprgffmkq`.
- Historial de migraciones en Supabase; no se versiona la carpeta local `supabase/`.
- Las escrituras sensibles pasan por RPC `SECURITY DEFINER`; RLS permanece activo.
- Nunca agregar `service_role` ni secretos al cliente.

## Versión y despliegue

- `VERSION` es la fuente de verdad (SemVer).
- Cambios en `CHANGELOG.md`.
- Commit de release: `vX.Y.Z - resumen`.
- GitHub Pages ignora `_headers`; no asumir CSP/HSTS activos en producción.

## Reglas para agentes

Leer `AGENTS.md` antes de modificar código, base de datos o despliegue.
