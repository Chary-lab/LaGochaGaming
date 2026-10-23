# Auditoría completa — Supabase `Chary-lab's Project`

**Proyecto:** `cydiyaacnyydprgffmkq` · Región `us-west-2` · Postgres `17.11` · Estado `ACTIVE_HEALTHY`
**Fecha de auditoría:** 2026-10-23

---

## 1. Esquema público — Tablas (10)

| Tabla | Filas aprox. | PK | Observaciones |
|---|---|---|---|
| `comunidad_chat` | 1 | `id` bigint | Chat de comunidad |
| `comunidad_sesiones` | 1 | `token` text | ⚠️ RLS habilitado **sin políticas** |
| `config_sorteo` | — | `id` int | Configuración de sorteo |
| `galeria` | 8 | `id` bigint | Fotos de galería |
| `ganadores_sorteo` | — | `id` bigint | Ganadores |
| `message_reactions` | 0 | `id` bigint (seq) | Reacciones a mensajes |
| `muro_saludos` | 57 | `id` bigint | Muro de saludos |
| `participantes_en_vivo` | — | `id` int (seq) | Participantes en vivo |
| `sync_cine` | — | `id` bigint | Sync de cine |
| `usuarios_comunidad` | 1 | `id` bigint | Usuarios de comunidad |

### Columnas destacadas
- `usuarios_comunidad`: `apodo` (unique), `apodo_norm` (unique), `pin_hash`, `puntos`, `rango`, `ultimo_punto`.
- `galeria`: `title`, `image_url`, `thumb_url`, `estado` (default `'pendiente'`), `likes`, `autor`, `created_at`.
- `comunidad_sesiones`: `token`, `usuario_id` (FK), `creado_en`, `expira_en` (default +30 días), `ultimo_mensaje_en`, `ultimo_punto_en`.

## 2. Claves foráneas (public)

| Tabla | Columna | Referencia | ON DELETE |
|---|---|---|---|
| `comunidad_sesiones` | `usuario_id` | `usuarios_comunidad.id` | CASCADE |
| `message_reactions` | `message_id` | `comunidad_chat.id` | CASCADE |
| `muro_saludos` | `usuario_id` | `usuarios_comunidad.id` | SET NULL |

✅ Todas las FK tienen índice de soporte (`idx_sesiones_usuario`, PK de chat, etc.).

## 3. Índices (public)

| Tabla | Índice | Tipo |
|---|---|---|
| comunidad_chat | `comunidad_chat_pkey` | UNIQUE btree (id) |
| comunidad_chat | `idx_chat_created` ⚠️ unused | btree (created_at DESC) |
| comunidad_sesiones | `comunidad_sesiones_pkey` | UNIQUE btree (token) |
| comunidad_sesiones | `idx_sesiones_expira` | btree (expira_en) |
| comunidad_sesiones | `idx_sesiones_usuario` | btree (usuario_id) |
| config_sorteo | `config_sorteo_pkey` | UNIQUE btree (id) |
| galeria | `galeria_pkey` | UNIQUE btree (id) |
| galeria | `idx_galeria_estado_created` ⚠️ unused | btree (estado, created_at DESC) |
| galeria | `idx_galeria_estado_likes` ⚠️ unused | btree (estado, likes DESC) |
| ganadores_sorteo | `ganadores_sorteo_pkey` | UNIQUE btree (id) |
| message_reactions | `message_reactions_pkey` | UNIQUE btree (id) |
| message_reactions | `idx_message_reactions_msg_emoji` | btree (message_id, emoji) |
| message_reactions | `message_reactions_unique_user_message` | UNIQUE btree (message_id, user_id) |
| muro_saludos | `muro_saludos_pkey` | UNIQUE btree (id) |
| muro_saludos | `idx_muro_autor_created` | btree (autor, created_at DESC) |
| muro_saludos | `idx_muro_autor_norm_created` | btree (autor_norm, created_at DESC) |
| muro_saludos | `idx_muro_created` | btree (created_at DESC) |
| muro_saludos | `idx_muro_usuario_created` | btree (usuario_id, created_at DESC) |
| participantes_en_vivo | `participantes_en_vivo_pkey` | UNIQUE btree (id) |
| participantes_en_vivo | `idx_participantes_kick_user_unico` | UNIQUE btree (kick_user_id) |
| participantes_en_vivo | `participantes_en_vivo_username_key` | UNIQUE btree (username) |
| sync_cine | `sync_cine_pkey` | UNIQUE btree (id) |
| usuarios_comunidad | `usuarios_comunidad_pkey` | UNIQUE btree (id) |
| usuarios_comunidad | `idx_usuarios_apodo_norm_unico` | UNIQUE btree (apodo_norm) |
| usuarios_comunidad | `idx_usuarios_puntos` ⚠️ unused | btree (puntos DESC) |
| usuarios_comunidad | `usuarios_comunidad_apodo_key` | UNIQUE btree (apodo) |

## 4. RLS — Políticas (public)

Todas las tablas expuestas tienen RLS con políticas. Patrón consistente: **lectura pública** (`anon, authenticated` SELECT `true`) y **escritura solo admin** (`es_admin()` para INSERT/UPDATE/DELETE) en tablas de contenido.

⚠️ **`comunidad_sesiones` tiene RLS habilitado pero 0 políticas** → nadie (ni anon) puede leer/escribir vía PostgREST. Esto puede ser intencional (acceso solo vía RPCs SECURITY DEFINER), pero conviene verificar.

Tablas con políticas: `comunidad_chat`, `config_sorteo`, `galeria`, `ganadores_sorteo`, `message_reactions` (solo SELECT público), `muro_saludos`, `participantes_en_vivo`, `sync_cine`, `usuarios_comunidad`.

## 5. Funciones RPC (27 en public)

**SECURITY DEFINER (14):** `actualizar_autor_galeria`, `asignar_peso_sorteo`, `cerrar_sesion_comunidad`, `enviar_mensaje_chat`, `establecer_reaccion`, `incrementar_likes` (2 sobrecargas), `incrementar_puntos_comunidad`, `login_comunidad`, `publicar_foto_galeria` (2 sobrecargas), `publicar_saludo_muro`, `registrar_comunidad`, `registrar_participante_sorteo`, `sortear_ganador_sorteo`, `validar_sesion_comunidad`.

**SECURITY INVOKER (13):** `apodo_norm`, `calcular_rango`, `es_admin`, `handle_sorteo_valido`, `multiplicador_rango`, `nombre_valido`, `obtener_rangos`, `patron_bloqueado`, `patron_simbolos`, `unaccent_texto`, `usuarios_rango_trg`.

## 6. Triggers

- `trg_usuarios_rango` — `BEFORE INSERT/UPDATE` on `usuarios_comunidad` → `usuarios_rango_trg()` (recalcula rango automáticamente).

## 7. Storage

| Bucket | Público | Límite | MIME permitidos |
|---|---|---|---|
| `fotos-galeria` | ✅ Sí | 5 MB | png, jpeg, webp, gif, avif |

## 8. Extensiones instaladas (6)

`supabase_vault` (vault), `unaccent` (extensions), `uuid-ossp` (extensions), `pgcrypto` (extensions), `plpgsql` (pg_catalog), `pg_stat_statements` (extensions).

## 9. Migraciones

28 migraciones aplicadas. Última: `20261023075705_eliminar_visitas_tracking` (se eliminó la tabla de tracking de visitas). Historial coherente con el esquema actual.

## 10. Edge Functions

Ninguna desplegada.

---

## 11. Hallazgos de Advisors

### 🔴 Seguridad (WARN)
1. **`function_search_path_mutable`** — `publicar_foto_galeria` no fija `search_path`. Riesgo de hijacking de esquema. Fijar con `SET search_path = public, pg_temp`.
2. **`anon_security_definer_function_executable`** — 13 funciones SECURITY DEFINER ejecutables por `anon` vía `/rest/v1/rpc/...`. Esto parece **intencional** (login, registro, chat, etc. usan token propio), pero conviene revisar que ninguna exponga datos sensibles sin validación de token.
3. **`authenticated_security_definer_function_executable`** — ídem para rol autenticado.
4. **`auth_leaked_password_protection`** — protección contra contraseñas filtradas (HaveIBeenPwned) **deshabilitada** en Auth. Recomendado activarla.

### 🟡 Info
5. **`rls_enabled_no_policy`** — `comunidad_sesiones` con RLS sin políticas. Verificar si es intencional (acceso solo por RPC).

### 🔵 Performance (INFO — unused indexes)
6. `idx_galeria_estado_created` (galeria)
7. `idx_galeria_estado_likes` (galeria)
8. `idx_chat_created` (comunidad_chat)
9. `idx_usuarios_puntos` (usuarios_comunidad)

> Estos índices no se han usado desde que se crearon. Candidatos a eliminar si no se prevén consultas filtrando por esos campos. Eliminarlos con `DROP INDEX CONCURRENTLY` para no bloquear.

---

## 12. Recomendaciones priorizadas

1. **Activar leaked password protection** en Auth (configuración de proyecto, no SQL).
2. **Fijar `search_path`** en `publicar_foto_galeria` (y auditar otras funciones SECURITY DEFINER).
3. **Decidir sobre `comunidad_sesiones`**: o añadir políticas RLS mínimas, o documentar que el acceso es exclusivamente por RPC.
4. **Revisar EXECUTE en funciones SECURITY DEFINER**: revocar `EXECUTE` a `anon`/`authenticated` en aquellas que no deban ser públicas (especialmente `sortear_ganador_sorteo`, `asignar_peso_sorteo`, `actualizar_autor_galeria` que son de admin).
5. **Evaluar eliminar los 4 índices no usados** tras confirmar patrones de consulta reales.
6. **`message_reactions`** tiene solo política SELECT público — no hay INSERT/UPDATE/DELETE policy; las escrituras se hacen vía RPC SECURITY DEFINER, coherente. OK.

Auditoría completa. No se realizaron cambios en la base de datos.
