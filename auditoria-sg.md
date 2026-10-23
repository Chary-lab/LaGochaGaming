# Auditoría de Seguridad — LaGochaGaming (RLS, Auth, XSS, Secrets, Headers)

**Alcance:** `index.html`, `galeria.html`, `comunidad.html`, `cine.html`, `sorteo.html`, `main.js`, `style.css`, Supabase project `cydiyaacnyydprgffmkq`
**Enfoque:** seguridad defensiva — RLS, autenticación/autorización, XSS, secretos, cabeceras HTTP.
**Referencias:** `auditoria-web.md`, `auditoria-bd.md`.

---

## 1. Secretos y configuración

- **`main.js:13` expone `SUPABASE_KEY` (anon) en bundle cliente.** Esperado para Supabase, pero depende 100% de RLS. Verificar que la key sea solo `anon` (no `service_role`). ✅ rol anon confirmado por JWT (`"role":"anon"`).
- **`ADMIN_EMAIL = 'gocha@admin.com'` hardcodeado** y verificado solo por email de sesión (`auditoria-web §2.4`). Riesgo: si alguien crea cuenta con ese email en Supabase Auth, obtiene permisos admin. **Mitigación:** verificar email confirmado y/o usar custom claim `role=admin` en JWT; comparar claim, no email.
- **No se encontraron claves `service_role` ni secretos de terceros en el repo.** ✅
- **No hay `.env` ni archivos de configuración versionados con secretos.** ✅

## 2. Autenticación y autorización

- Login usa `supabase.auth.signInWithPassword` (email/password) en galería/cine/sorteo. Sin MFA. Aceptable para app comunitaria, pero admin debería tener MFA.
- **Admin detection solo por email** (ver §1) — vulnerabilidad de elevación de privilegios si el email no está protegido/verificado.
- **`auth_leaked_password_protection` deshabilitado** (advisor) → contraseñas filtradas no bloqueadas.
- **Funciones SECURITY DEFINER ejecutables por `anon`** (13 RPCs): `sortear_ganador_sorteo`, `asignar_peso_sorteo`, `actualizar_autor_galeria` son de admin pero invocables por cualquier anon → IDOR/privilege escalation. Revocar `EXECUTE` a `anon`/`authenticated` en funciones admin.
- **`comunidad_sesiones` con RLS habilitado sin políticas** → acceso solo por RPC (intencional probable). Documentar o añadir políticas mínimas.
- **Tokens de sesión comunidad** (`token` text PK) — verificar expiración (`expira_en` default +30 días) y rotación; sin rate limiting en `login_comunidad`/`registrar_comunidad` → brute force de PIN posible.

## 3. RLS (Row Level Security)

- Todas las tablas expuestas tienen RLS. Patrón: SELECT público (`anon, authenticated` true), escritura solo admin vía `es_admin()`.
- **Riesgo:** lectura pública de `usuarios_comunidad` (incluye `pin_hash`?) — verificar que `pin_hash` no se exponga vía SELECT público. Si la columna es seleccionable por anon, es fuga de hashes. **Acción:** revocar SELECT en columnas sensibles o usar vista.
- **`message_reactions`** solo SELECT público, escrituras vía RPC SECURITY DEFINER — coherente. ✅
- **`publicar_foto_galeria` sin `search_path` fijo** → schema hijacking (advisor). Fijar `SET search_path = public, pg_temp`.
- **Storage bucket `fotos-galeria` público** con MIME permitidos y límite 5MB — OK, pero validar magic bytes en cliente/servidor (actualmente solo extensión/MIME).

## 4. XSS (Cross-Site Scripting)

- Se usa `escapeHtml`/`escapeAttr` de `main.js` como fuente única. mayoritariamente aplicado.
- **HALLAZGO:** `comunidad.html:1528` `tooltipReaccionEl.innerHTML = ...${lista}...` donde `lista` se construye con `escapeHtml(n)` — ✅ escapado.
- **`index.html:334`** `card.innerHTML` con `escapeHtml(msg.autor)` y `msg.mensaje` escapado — ✅.
- **`sorteo.html:866/880/903`** `bannerArea.innerHTML` con `registradoUser` escapado en 872 — verificar los otros usos no incluyan input sin escapar.
- **`comunidad.html:1196`** `overlay.innerHTML` con `celebracion-caja` — verificar contenido dinámico.
- **`comunidad.html:1973`** `onlineUsersListEl.innerHTML = html` — verificar que `html` escape todos los campos de usuario.
- **Riesgo residual:** cualquier `innerHTML` con datos de BD sin `escapeHtml` es XSS almacenado. Recomendado: migrar a `textContent`/DOM API o sanitizar en servidor.
- **Sin CSP** (ver §5) → XSS, si existe, es explotable sin restricción.

## 5. Cabeceras HTTP (Headers)

- **No se encontraron cabeceras de seguridad** en el repo ni meta tags equivalentes: ni CSP, ni HSTS, ni X-Frame-Options, ni X-Content-Type-Options, ni Referrer-Policy, ni Permissions-Policy. ❌
- **Recomendación:** configurar en el hosting (Netlify/Vercel/Cloudflare) o vía `<meta http-equiv>`:
  - `Content-Security-Policy`: default-src 'self'; script-src 'self' + CDNs permitidos (supabase, alpine, fontawesome); frame-ancestors 'none' o 'self'; object-src 'none'.
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains`
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY` (o SAMEORIGIN)
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- **CORS:** Supabase maneja su propio CORS; verificar que solo el dominio de producción esté permitido en Auth redirect URLs.

## 6. Hallazgos priorizados

| # | Severidad | Hallazgo | Acción |
|---|-----------|----------|--------|
| 1 | High | Admin por email (elevación si alguien registra ese email) | Usar custom claim `role=admin` en JWT; verificar email confirmado |
| 2 | High | Funciones admin SECURITY DEFINER ejecutables por anon | Revocar EXECUTE en `sortear_ganador_sorteo`, `asignar_peso_sorteo`, `actualizar_autor_galeria` |
| 3 | High | Sin cabeceras de seguridad (CSP, HSTS, etc.) | Configurar en hosting |
| 4 | Medium | `publicar_foto_galeria` sin search_path | Fijar search_path |
| 5 | Medium | Leaked password protection deshabilitada | Activar en Auth |
| 6 | Medium | `pin_hash` potencialmente expuesto vía SELECT público | Revocar SELECT en columna sensible |
| 7 | Medium | Sin rate limiting en login_comunidad/registrar_comunidad | Añadir rate limit (Supabase Auth o RPC) |
| 8 | Medium | XSS residual en innerHTML con datos de BD | Auditar cada innerHTML; migrar a textContent |
| 9 | Low | Storage solo valida extensión/MIME | Validar magic bytes |
| 10 | Low | Sin MFA para admin | Activar MFA para cuentas admin |

## 7. Veredicto

La aplicación tiene una base razonable (RLS activo, escapeHtml, anon key correcta), pero presenta **riesgos de elevación de privilegios** (admin por email + RPCs admin invocables por anon) y **ausencia total de cabeceras de seguridad**. Corregir los puntos High antes de considerar el sistema endurecido.

Auditoría de seguridad completada. No se modificó ningún archivo.
