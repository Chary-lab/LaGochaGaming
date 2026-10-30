# Plan Beta 1.7.0 - Perfil, ajustes, tienda privada y ayuda de admin

Estado: implementado y corregido en `1.7.2`
Base: `1.7.1`  
Objetivo: cerrar los seis puntos sin romper comunidad, galería, cine ni sorteo.

## Decisiones previas

1. **Género**: valores `masculino`, `femenino` y `no_definido` para cuentas antiguas.
   Registro nuevo exige masculino/femenino; Ajustes permite cambiarlo.
2. **Avatares beta**: dos assets locales `img/avatars/avatar-male.webp` y
   `img/avatars/avatar-female.webp`. `avatar_url` acepta esos paths y las URLs
   del bucket `avatares-comunidad`.
3. **Avatares de tienda**: `tienda_premios.avatar_url` + `tipo='avatar'`. El
   canje equipa el avatar; el perfil valida que el usuario lo haya comprado.
4. **Tienda privada**: el catálogo deja de ser anónimo. `tienda_obtener_catalogo`
   exige token de comunidad. La pestaña se oculta sin sesión.
5. **Perfil en navbar**: modal global inyectado desde `main.js`, reutilizable en
   todas las páginas. No duplicar el formulario actual de comunidad.
6. **Ayuda admin**: bloques `<details>` plegables, sin JS nuevo, accesibles y
   responsive. No sustituyen la autorización del servidor.
7. **Copiar enlace**: se elimina de muro, chat y galería, junto con handlers,
   botones y CSS muerto.

## Orden de ejecución

1. Fase 0: preparación y migración de género/avatar.
2. Fase 1: registro/login con género.
3. Fase 2: modal de perfil + Ajustes + avatares beta.
4. Fase 3: tienda privada + avatares de tienda.
5. Fase 4: ayuda del panel de galería y cine.
6. Fase 5: quitar copiar enlace.
7. Fase 6: pruebas, versión y despliegue.

---

## Fase 0 - Base de datos y assets

### Pasos

- [ ] Crear migración `genero_y_avatares_beta`:
  - `usuarios_comunidad.genero text not null default 'no_definido'`.
  - Check `genero in ('masculino','femenino','no_definido')`.
  - Índice no necesario; no exponer `genero` a `anon` por grant de columna.
  - `tienda_premios.avatar_url text` (null salvo `tipo='avatar'`).
  - Ampliar check de `tienda_premios.tipo` a `general`, `icono`, `avatar`.
  - Check de `avatar_url` en premios: null o `http(s)`/bucket.
- [ ] Extender `actualizar_perfil_comunidad`:
  - `p_genero text default null`; validar valores.
  - `avatar_url` permitido:
    - `^/img/avatars/(avatar-male|avatar-female)\.webp$`
    - bucket `avatares-comunidad/avatar/<usuario_id>/...`
    - avatar de un canje `tipo='avatar'` entregado al usuario.
- [ ] Extender `registrar_comunidad`:
  - `p_genero text default null` para no romper clientes viejos.
  - Si viene, validar masculino/femenino; insertar; si no, `no_definido`.
- [ ] Extender `login_comunidad` y `validar_sesion_comunidad`:
  - Devolver `genero` y `avatar_url` en `usuario`.
- [ ] Crear `obtener_avatares_disponibles(p_token)`:
  - Devuelve defaults + avatares de canjes entregados.
  - Incluye `url`, `nombre`, `origen` (`default`/`tienda`).
- [x] Crear directorio `img/avatars/` con los dos avatares beta.
  - Formato WebP 512x512, recorte circular transparente, <60KB.
  - Nombres exactos: `avatar-male.webp`, `avatar-female.webp`.
- [ ] Probar SQL en transacción con usuario temporal y `ROLLBACK`.

### Archivos

`supabase/migrations/` (local, ignorado), `img/avatars/*`.

### Criterio de aceptación

Usuario nuevo sin género queda `no_definido`; con género guarda correctamente.
El perfil acepta solo avatares permitidos.

---

## Fase 1 - Registro y login con género

### Pasos

- [ ] En `comunidad.html`, añadir selector obligatorio de género al registro:
  - Radio o segmented control: Femenino / Masculino.
  - `aria-describedby` con texto “Se usa para el avatar inicial”.
  - Validación cliente antes de la RPC.
- [ ] Enviar `p_genero` en `registrar_comunidad`.
- [ ] En login no pedir género; el servidor lo devuelve.
- [ ] Guardar `genero` en el objeto de sesión del cliente (`guardarSesion`).
- [ ] Si una cuenta antigua entra con `no_definido`, mostrar aviso no bloqueante:
  “Elige tu género en Ajustes para asignar tu avatar”.
- [ ] Actualizar textos de registro y errores (`genero_invalido`).

### Archivos

`comunidad.html`, `style.css`, `main.js` (estado/helper de sesión).

### Criterio de aceptación

Registro nuevo guarda género; login antiguo sigue funcionando; no se expone
`genero` en consultas públicas.

---

## Fase 2 - Modal de perfil y Ajustes en navbar

### Pasos

- [ ] Convertir `#nav-user-info` en botón accesible:
  - `aria-haspopup="dialog"`, `aria-expanded`, foco visible.
  - Muestra avatar + apodo + icono; en móvil solo avatar/apodo corto.
- [ ] Crear modal global `#modal-perfil` inyectado desde `main.js`:
  - Dos vistas: **Perfil** y **Ajustes**.
  - Perfil: avatar grande, apodo, rango, puntos, icono, bio y enlaces.
  - Ajustes: avatar, género, bio (160), enlaces whitelist, guardar/cancelar.
  - Cerrar con Escape, backdrop, botón; trampa de foco; devolver foco.
- [ ] Cargar perfil con `avatar_url, bio, links_json, icono_equipado` y sesión.
- [ ] Selector de avatar:
  - Dos avatares beta.
  - Avatares de tienda entregados (`obtener_avatares_disponibles`).
  - Vista previa y estado seleccionado.
- [ ] Guardar con `actualizar_perfil_comunidad`.
- [ ] Sincronizar cambios con:
  - avatar del navbar,
  - icono equipado,
  - ranking,
  - perfil actual de comunidad.
- [ ] Eliminar el formulario de perfil inline de `comunidad.html` o convertirlo
  en enlace “Abrir Ajustes”; una sola fuente de verdad.
- [ ] Mantener avatar por defecto si `avatar_url` es null:
  - femenino → `avatar-female.webp`
  - masculino → `avatar-male.webp`
  - no_definido → inicial del apodo.

### Archivos

`main.js`, `comunidad.html`, `style.css`, `img/avatars/*`.

### Criterio de aceptación

Desde cualquier página, el usuario de comunidad abre su perfil, cambia avatar,
bio y enlaces, y el navbar/ranking reflejan el cambio sin recargar.

---

## Fase 3 - Tienda privada y avatares de tienda

### Pasos

- [ ] Ocultar pestaña y panel `Tienda` sin sesión de comunidad.
  - Al cerrar sesión, volver a `Canal`.
  - Si hay hash `#tienda`, redirigir a Canal.
- [ ] Cambiar `tienda_obtener_catalogo` a `tienda_obtener_catalogo(p_token text)`:
  - Validar sesión; `sin_sesion` si no hay.
  - **Eliminar la versión sin argumentos** para que no quede un bypass anónimo.
- [ ] Actualizar el cliente para enviar `p_token`.
- [ ] Extender `tienda_canjear_premio` para `tipo='avatar'`:
  - Validar premio/stock/puntos.
  - Impedir recomprar el mismo avatar (`ya_tiene_avatar`).
  - Guardar `avatar_url` del premio en el usuario.
  - Devolver `avatar_url` y `puntos_restantes`.
- [ ] Añadir `avatar_url` al resultado de `tienda_mis_canjes` o al RPC de avatares.
- [ ] En el catálogo, mostrar avatares con imagen, no solo texto.
- [ ] Mantener `tipo='icono'` como está; un icono por usuario.
- [ ] Añadir premios de avatar de prueba solo si el producto lo confirma.

### Archivos

`comunidad.html`, `main.js`, `style.css`, Supabase.

### Criterio de aceptación

Sin sesión no se ve ni se puede consultar la tienda. Con sesión se ve catálogo,
canjes y avatares comprados; el avatar comprado se puede equipar en Ajustes.

---

## Fase 4 - Ayuda de los paneles de admin

### Pasos

- [ ] Galería: añadir `<details class="panel-ayuda">` dentro del panel admin.
  Explicar en lenguaje simple:
  - Modo Moderación: login de admin; no es cuenta de comunidad.
  - Pendientes: aprobar, rechazar y editar autor.
  - Subida: título, autor de admin y límites (5MB, formatos).
  - Usuarios: buscar, filtrar baneados, ban temporal, shadowban y estados.
  - Auditoría: historial de ban/shadowban y detalle.
  - Cerrar sesión admin.
- [ ] Cine: añadir ayuda en el panel Maestro:
  - Iniciar sesión de streamer.
  - Cargar URL (YouTube, MP4, Drive).
  - Play/pausa/seek y sincronización de espectadores.
  - “Sincronización activa”, apagar/limpiar y cerrar sesión.
  - Botón “Unirme a la reproducción” para autoplay bloqueado.
- [ ] Usar `<summary>` claro (“¿Qué hace cada botón?”), sin jerga.
- [ ] Responsive: una columna en móvil, texto 14-16px, sin tapar controles.
- [ ] No incluir credenciales ni detalles de seguridad explotables.

### Archivos

`galeria.html`, `cine.html`, `style.css`.

### Criterio de aceptación

Un admin nuevo entiende cada función sin mirar código; se puede abrir/cerrar con
teclado y lector de pantalla.

---

## Fase 5 - Quitar “copiar enlace”

### Pasos

- [ ] Muro (`index.html` + `main.js`):
  - Quitar botón “Copiar enlace”, `data-url`, helper `crearBotonCopiar` y
    handler `copiar`.
- [ ] Chat (`comunidad.html`):
  - Quitar botón de copiar de cada mensaje y su handler.
- [ ] Galería (`galeria.html`):
  - Quitar copiar de tarjeta y lightbox, `data-action="copy-*"` y helpers.
- [ ] `main.js`: eliminar `copiarEnlace`, `crearBotonCopiar` y código muerto.
- [ ] `style.css`: eliminar `.btn-copiar*`, `.lightbox-btn-copy`, etc.
- [ ] Añadir guarda en `scripts/check.js`:
  - Fallar si reaparece `data-action="copy` o “Copiar enlace”.
- [ ] Verificar que no quedan referencias con `Select-String`.

### Archivos

`index.html`, `comunidad.html`, `galeria.html`, `main.js`, `style.css`,
`scripts/check.js`.

### Criterio de aceptación

No hay botones de copiar en muro, chat ni galería; no hay handlers ni CSS
huérfanos; las tarjetas siguen abriendo lightbox y los likes funcionan.

---

## Fase 6 - Pruebas, versión y despliegue

### Pruebas obligatorias

- [ ] `node scripts/check.js`
- [ ] `node --check main.js`
- [ ] Servidor local `python -m http.server 8766`.
- [ ] Registro nuevo con género masculino y femenino.
- [ ] Login de cuenta antigua (`no_definido`) sin errores.
- [ ] Perfil/Ajustes en escritorio y móvil: avatar, género, bio, enlaces.
- [ ] Avatar por defecto y avatar comprado; recarga y persistencia.
- [ ] Tienda oculta sin sesión; catálogo bloqueado por RPC sin token.
- [ ] Canje de icono y de avatar; puntos, stock y canjes correctos.
- [ ] Admin galería: ayuda, usuarios, ban, shadowban, auditoría.
- [ ] Cine: ayuda, login, sync y join.
- [ ] Sin botones de copiar en muro/chat/galería.
- [ ] Sin errores de consola propios; encoding UTF-8 correcto.
- [ ] Limpiar usuarios, sesiones, likes, canjes y auditoría de prueba.

### Versión

- [x] `VERSION` → `1.7.2` (PATCH: correcciones de perfil, género y tienda sobre 1.7.1).
- [x] `?v=1.7.2` en `style.css` y `main.js` de los cinco HTML.
- [x] Entrada en `CHANGELOG.md`.
- [x] Actualizar `AGENTS.md` (reglas de género, avatares, tienda privada).
- [ ] Actualizar `sitemap.xml` si cambia contenido público.
- [ ] Commit `v1.7.2 - perfil, género y tienda funcionales`.
- [ ] Push solo con pruebas verdes.

## Riesgos y notas

- Cuentas antiguas sin género: `no_definido`; aviso en Ajustes, no bloqueo.
- El catálogo deja de ser público: clientes cacheados con JS viejo pueden fallar
  hasta refrescar; el query `?v=1.7.0` fuerza la nueva versión.
- El avatar de tienda requiere validar propiedad; no aceptar cualquier URL.
- La ayuda del panel no es un control de seguridad; `es_admin()` manda.
- Mostrar avatares en chat/muro requiere guardar o unir el avatar por mensaje;
  queda fuera de beta salvo que se añada una columna snapshot.
- Los avatares locales deben existir en `img/avatars/` antes de activar el
  selector; si faltan, usar inicial del apodo como fallback.
