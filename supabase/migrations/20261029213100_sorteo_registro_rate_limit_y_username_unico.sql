-- 1.5.0 - Endurecimiento del registro publico del sorteo
-- - Unicidad real por nombre sin distinguir mayusculas (evita duplicados por carrera).
-- - Limite de registros por IP para reducir el llenado masivo de la tombola.
-- - El sorteo y el registro de ganadores quedan solo para sesiones admin.

create unique index if not exists idx_participantes_username_lower_unico
  on public.participantes_en_vivo (lower(username));

create or replace function public.registrar_participante_sorteo(
  p_username text,
  p_kick_user_id bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nombre text;
  v_id integer;
  v_ip text;
  v_clave text;
  v_intentos integer;
  v_kick_id bigint;
begin
  v_nombre := trim(replace(coalesce(p_username, ''), '@', ''));
  if not public.handle_sorteo_valido(v_nombre) then
    return jsonb_build_object('ok', false, 'error', 'usuario_invalido');
  end if;
  if not exists (select 1 from public.config_sorteo where id = 1 and abierto) then
    return jsonb_build_object('ok', false, 'error', 'sorteo_cerrado');
  end if;

  v_ip := coalesce(
    (current_setting('request.headers', true)::jsonb ->> 'x-forwarded-for'),
    (current_setting('request.headers', true)::jsonb ->> 'x-real-ip'),
    'unknown'
  );
  v_clave := 'sorteo:' || v_ip;

  delete from public.auth_rate_limit
   where clave = v_clave and intento_en < now() - interval '10 minutes';

  select count(*) into v_intentos
    from public.auth_rate_limit
   where clave = v_clave and intento_en > now() - interval '10 minutes';

  if v_intentos >= 30 then
    return jsonb_build_object('ok', false, 'error', 'rate_limited');
  end if;

  insert into public.auth_rate_limit(clave) values (v_clave);

  v_kick_id := case when p_kick_user_id is not null and p_kick_user_id > 0
                    then p_kick_user_id else null end;

  if v_kick_id is not null and exists (
    select 1 from public.participantes_en_vivo p where p.kick_user_id = v_kick_id
  ) then
    return jsonb_build_object('ok', false, 'error', 'ya_registrado');
  end if;
  if exists (
    select 1 from public.participantes_en_vivo p
     where lower(p.username) = lower(v_nombre)
  ) then
    return jsonb_build_object('ok', false, 'error', 'ya_registrado');
  end if;
  if (select count(*) from public.participantes_en_vivo) >= 500 then
    return jsonb_build_object('ok', false, 'error', 'lleno');
  end if;

  insert into public.participantes_en_vivo(username, peso, kick_user_id)
  values (v_nombre, 1, v_kick_id)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'ya_registrado');
end;
$$;

revoke all on function public.registrar_participante_sorteo(text, bigint) from public;
grant execute on function public.registrar_participante_sorteo(text, bigint) to anon, authenticated;

revoke all on function public.registrar_ganador_sorteo(text) from public, anon;
grant execute on function public.registrar_ganador_sorteo(text) to authenticated;

revoke all on function public.sortear_ganador_sorteo() from public, anon;
grant execute on function public.sortear_ganador_sorteo() to authenticated;

revoke all on function public.asignar_peso_sorteo(text, integer) from public, anon;
grant execute on function public.asignar_peso_sorteo(text, integer) to authenticated;
