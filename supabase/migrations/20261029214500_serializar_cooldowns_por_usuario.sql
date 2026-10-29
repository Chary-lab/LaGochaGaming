-- 1.5.0 - Serializa los cooldowns por usuario
-- Sin el FOR UPDATE dos pestañas/sesiones podian leer el mismo ultimo_punto o
-- ultimo_mensaje_en y pasar el limite a la vez. El lock de la fila del usuario
-- garantiza una sola credito/mensaje por ventana.

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
   where usr.id = v_usuario_id
   for update;

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
   where id = v_sesion.usuario_id
   for update;

  if not found then
    return json_build_object('ok', false, 'error', 'usuario_no_encontrado');
  end if;

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
