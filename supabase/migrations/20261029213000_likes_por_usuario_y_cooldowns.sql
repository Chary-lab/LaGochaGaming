-- 1.5.0 - Likes por usuario y cooldowns por cuenta
-- El contador de likes deja de ser manipulable: cada usuario puede dar/retirar
-- su like una sola vez por imagen. Los creditos de puntos y el rate limit del
-- chat pasan a ser por usuario, no por sesion (evita multiplicar con varios logins).

create table if not exists public.galeria_likes (
  image_id bigint not null references public.galeria(id) on delete cascade,
  usuario_id bigint not null references public.usuarios_comunidad(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (image_id, usuario_id)
);

alter table public.galeria_likes enable row level security;
revoke all on table public.galeria_likes from public, anon, authenticated;
grant all on table public.galeria_likes to service_role;

create index if not exists idx_galeria_likes_usuario
  on public.galeria_likes (usuario_id);

create or replace function public.incrementar_likes(
  p_token text,
  p_image_id bigint,
  p_delta integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id bigint;
  v_likes integer;
  v_usuario bigint;
  v_filas integer := 0;
begin
  select s.usuario_id into v_usuario
    from public.comunidad_sesiones s
   where s.token = p_token and s.expira_en > now();

  if v_usuario is null then
    return jsonb_build_object('ok', false, 'error', 'sin_sesion');
  end if;
  if p_delta not in (-1, 1) then
    return jsonb_build_object('ok', false, 'error', 'delta_invalido');
  end if;

  select g.id into v_id
    from public.galeria g
   where g.id = p_image_id and g.estado = 'aprobado'
   for update;

  if v_id is null then
    return jsonb_build_object('ok', false, 'error', 'imagen_inexistente');
  end if;

  if p_delta = 1 then
    insert into public.galeria_likes(image_id, usuario_id)
    values (v_id, v_usuario)
    on conflict (image_id, usuario_id) do nothing;
    get diagnostics v_filas = row_count;

    if v_filas > 0 then
      update public.galeria
         set likes = greatest(0, coalesce(likes, 0) + 1)
       where id = v_id
      returning likes into v_likes;
    else
      select likes into v_likes from public.galeria where id = v_id;
    end if;

    return jsonb_build_object('ok', true, 'likes', coalesce(v_likes, 0), 'liked', true);
  else
    delete from public.galeria_likes
     where image_id = v_id and usuario_id = v_usuario;
    get diagnostics v_filas = row_count;

    if v_filas > 0 then
      update public.galeria
         set likes = greatest(0, coalesce(likes, 0) - 1)
       where id = v_id
      returning likes into v_likes;
    else
      select likes into v_likes from public.galeria where id = v_id;
    end if;

    return jsonb_build_object('ok', true, 'likes', coalesce(v_likes, 0), 'liked', false);
  end if;
end;
$$;

revoke all on function public.incrementar_likes(text, bigint, integer) from public;
grant execute on function public.incrementar_likes(text, bigint, integer) to anon, authenticated;

create or replace function public.obtener_likes_galeria(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario bigint;
  v_ids bigint[];
begin
  select s.usuario_id into v_usuario
    from public.comunidad_sesiones s
   where s.token = p_token and s.expira_en > now();

  if v_usuario is null then
    return jsonb_build_object('ok', false, 'error', 'sin_sesion');
  end if;

  select coalesce(array_agg(l.image_id), '{}'::bigint[]) into v_ids
    from public.galeria_likes l
    join public.galeria g on g.id = l.image_id and g.estado = 'aprobado'
   where l.usuario_id = v_usuario;

  return jsonb_build_object('ok', true, 'ids', to_jsonb(v_ids));
end;
$$;

revoke all on function public.obtener_likes_galeria(text) from public;
grant execute on function public.obtener_likes_galeria(text) to anon, authenticated;

create or replace function public.incrementar_puntos_comunidad(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id bigint;
  v_ultimo_punto timestamptz;
  v_puntos integer;
  v_rango text;
  v_mult integer;
  v_ganados integer;
begin
  select ses.usuario_id into v_usuario_id
    from public.comunidad_sesiones ses
   where ses.token = p_token and ses.expira_en > now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'sin_sesion');
  end if;

  select usr.puntos, usr.rango, usr.ultimo_punto
    into v_puntos, v_rango, v_ultimo_punto
    from public.usuarios_comunidad usr
   where usr.id = v_usuario_id;

  if v_ultimo_punto is not null
     and now() - v_ultimo_punto < interval '5 minutes' then
    return jsonb_build_object(
      'ok', true,
      'puntos', coalesce(v_puntos, 0),
      'rango', v_rango,
      'multiplicador', public.multiplicador_rango(v_rango),
      'ganados', 0,
      'sin_credito', true
    );
  end if;

  v_mult := public.multiplicador_rango(v_rango);
  v_ganados := v_mult;

  update public.usuarios_comunidad usr
     set puntos = coalesce(usr.puntos, 0) + v_ganados,
         ultimo_punto = now(),
         ultima_actividad = now()
   where usr.id = v_usuario_id
  returning usr.puntos, usr.rango into v_puntos, v_rango;

  update public.comunidad_sesiones ses
     set ultimo_punto_en = now()
   where ses.token = p_token;

  return jsonb_build_object(
    'ok', true,
    'puntos', coalesce(v_puntos, 0),
    'rango', v_rango,
    'multiplicador', public.multiplicador_rango(v_rango),
    'ganados', v_ganados
  );
exception when others then
  return jsonb_build_object('ok', false, 'error', 'error_interno', 'detalle', sqlerrm);
end;
$$;

revoke all on function public.incrementar_puntos_comunidad(text) from public;
grant execute on function public.incrementar_puntos_comunidad(text) to anon, authenticated;

create or replace function public.enviar_mensaje_chat(p_token text, p_mensaje text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sesion public.comunidad_sesiones%rowtype;
  v_usuario public.usuarios_comunidad%rowtype;
  v_msg_id bigint;
  v_texto text;
begin
  v_texto := trim(coalesce(p_mensaje, ''));

  if v_texto = '' then
    return json_build_object('ok', false, 'error', 'mensaje_vacio');
  end if;
  if length(v_texto) > 300 then
    return json_build_object('ok', false, 'error', 'mensaje_muy_largo');
  end if;

  select * into v_sesion
    from public.comunidad_sesiones
   where token = p_token and expira_en > now();

  if not found then
    return json_build_object('ok', false, 'error', 'sin_sesion');
  end if;

  select * into v_usuario
    from public.usuarios_comunidad
   where id = v_sesion.usuario_id;

  if not found then
    return json_build_object('ok', false, 'error', 'usuario_no_encontrado');
  end if;

  -- Rate limit por CUENTA: varias sesiones abiertas no lo saltan.
  if exists (
    select 1
      from public.comunidad_sesiones s
     where s.usuario_id = v_usuario.id
       and s.ultimo_mensaje_en is not null
       and s.ultimo_mensaje_en > now() - interval '2.5 seconds'
  ) then
    return json_build_object('ok', false, 'error', 'rate_limit');
  end if;

  insert into public.comunidad_chat (autor, mensaje)
  values (v_usuario.apodo, v_texto)
  returning id into v_msg_id;

  update public.comunidad_sesiones
     set ultimo_mensaje_en = now()
   where token = p_token;

  update public.usuarios_comunidad
     set ultima_actividad = now()
   where id = v_usuario.id;

  return json_build_object('ok', true, 'msg_id', v_msg_id);
exception
  when others then
    return json_build_object('ok', false, 'error', 'error_interno', 'detalle', sqlerrm);
end;
$$;

revoke all on function public.enviar_mensaje_chat(text, text) from public;
grant execute on function public.enviar_mensaje_chat(text, text) to anon, authenticated;

create or replace function public.establecer_reaccion(
  p_token text,
  p_message_id bigint,
  p_emoji text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_usuario_id bigint;
  v_apodo text;
  v_emoji text;
  v_existente text;
begin
  select ses.usuario_id, usr.apodo
    into v_usuario_id, v_apodo
    from public.comunidad_sesiones ses
    join public.usuarios_comunidad usr on usr.id = ses.usuario_id
   where ses.token = p_token
     and ses.expira_en > now();

  if not found then
    return jsonb_build_object('ok', false, 'error', 'sin_sesion');
  end if;

  v_emoji := trim(coalesce(p_emoji, ''));
  if v_emoji not in ('👍', '❤️', '😂', '🔥', '😀', '🙏') then
    return jsonb_build_object('ok', false, 'error', 'emoji_invalido');
  end if;

  if not exists (select 1 from public.comunidad_chat where id = p_message_id) then
    return jsonb_build_object('ok', false, 'error', 'mensaje_inexistente');
  end if;

  select mr.emoji into v_existente
    from public.message_reactions mr
   where mr.message_id = p_message_id
     and mr.user_id = v_usuario_id;

  if v_existente = v_emoji then
    delete from public.message_reactions mr
     where mr.message_id = p_message_id
       and mr.user_id = v_usuario_id;
    return jsonb_build_object('ok', true, 'emoji', null);
  elsif v_existente is null then
    insert into public.message_reactions(message_id, user_id, emoji, apodo)
    values (p_message_id, v_usuario_id, v_emoji, v_apodo);
  else
    update public.message_reactions mr
       set emoji = v_emoji, apodo = v_apodo
     where mr.message_id = p_message_id
       and mr.user_id = v_usuario_id;
  end if;

  return jsonb_build_object('ok', true, 'emoji', v_emoji);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'error_interno', 'detalle', sqlerrm);
end;
$$;

revoke all on function public.establecer_reaccion(text, bigint, text) from public;
grant execute on function public.establecer_reaccion(text, bigint, text) to anon, authenticated;

-- Limpieza de sesiones caducadas al iniciar sesion / registrarse.
create or replace function public.login_comunidad(p_apodo text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_u public.usuarios_comunidad%rowtype;
  v_t text;
  v_ip text;
  v_clave text;
begin
  v_ip := coalesce(
    (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for'),
    (current_setting('request.headers', true)::jsonb ->> 'x-real-ip'),
    'unknown'
  );
  v_clave := 'login:' || v_ip;

  if not public.auth_puede_intentar(v_clave) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  if p_apodo is null or length(p_apodo) > 30 then
    perform public.auth_registrar_fallo(v_clave);
    return jsonb_build_object('ok', false, 'error', 'credenciales');
  end if;

  select * into v_u
    from public.usuarios_comunidad
   where apodo_norm = public.apodo_norm(p_apodo);

  if not found or v_u.pin_hash is null
     or v_u.pin_hash <> extensions.crypt(p_pin, v_u.pin_hash) then
    perform public.auth_registrar_fallo(v_clave);
    return jsonb_build_object('ok', false, 'error', 'credenciales');
  end if;

  delete from public.comunidad_sesiones where expira_en <= now();

  v_t := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.comunidad_sesiones(token, usuario_id, expira_en)
  values (v_t, v_u.id, now() + interval '30 days');
  update public.usuarios_comunidad set ultima_actividad = now() where id = v_u.id;

  return jsonb_build_object('ok', true, 'token', v_t, 'usuario',
    jsonb_build_object('id', v_u.id, 'apodo', v_u.apodo, 'puntos', v_u.puntos, 'rango', v_u.rango));
end;
$$;

create or replace function public.registrar_comunidad(p_apodo text, p_pin text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_apodo text;
  v_id bigint;
  v_t text;
  v_ip text;
  v_clave text;
begin
  v_ip := coalesce(
    (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for'),
    (current_setting('request.headers', true)::jsonb ->> 'x-real-ip'),
    'unknown'
  );
  v_clave := 'register:' || v_ip;

  if not public.auth_puede_intentar(v_clave) then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  v_apodo := trim(coalesce(p_apodo, ''));
  if length(v_apodo) = 0 or length(v_apodo) > 20
     or not public.nombre_valido(v_apodo) then
    perform public.auth_registrar_fallo(v_clave);
    return jsonb_build_object('ok', false, 'error', 'apodo_invalido');
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    perform public.auth_registrar_fallo(v_clave);
    return jsonb_build_object('ok', false, 'error', 'pin_invalido');
  end if;
  if exists (
    select 1 from public.usuarios_comunidad
     where apodo_norm = public.apodo_norm(v_apodo)
  ) then
    perform public.auth_registrar_fallo(v_clave);
    return jsonb_build_object('ok', false, 'error', 'apodo_duplicado');
  end if;

  delete from public.comunidad_sesiones where expira_en <= now();

  insert into public.usuarios_comunidad(apodo, pin_hash, puntos, rango)
  values (v_apodo, extensions.crypt(p_pin, extensions.gen_salt('bf')), 0, 'semilla')
  returning id into v_id;

  v_t := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.comunidad_sesiones(token, usuario_id, expira_en)
  values (v_t, v_id, now() + interval '30 days');

  return jsonb_build_object('ok', true, 'token', v_t, 'usuario',
    jsonb_build_object('id', v_id, 'apodo', v_apodo, 'puntos', 0, 'rango', 'semilla'));
exception
  when unique_violation then
    perform public.auth_registrar_fallo(v_clave);
    return jsonb_build_object('ok', false, 'error', 'apodo_duplicado');
end;
$$;

-- Cierre de grants heredados de PUBLIC en las RPC publicas.
revoke all on function public.publicar_saludo_muro(text, text, text) from public;
grant execute on function public.publicar_saludo_muro(text, text, text) to anon, authenticated;

revoke all on function public.publicar_foto_galeria(text, text, text, text, text) from public;
grant execute on function public.publicar_foto_galeria(text, text, text, text, text) to anon, authenticated;

revoke all on function public.login_comunidad(text, text) from public;
grant execute on function public.login_comunidad(text, text) to anon, authenticated;

revoke all on function public.registrar_comunidad(text, text) from public;
grant execute on function public.registrar_comunidad(text, text) to anon, authenticated;

revoke all on function public.validar_sesion_comunidad(text) from public;
grant execute on function public.validar_sesion_comunidad(text) to anon, authenticated;

revoke all on function public.cerrar_sesion_comunidad(text) from public;
grant execute on function public.cerrar_sesion_comunidad(text) to anon, authenticated;

revoke all on function public.actualizar_autor_galeria(bigint, text) from public, anon;
grant execute on function public.actualizar_autor_galeria(bigint, text) to authenticated;
