-- 1.5.0 - Validar thumb_url en la publicacion de galeria
-- Sin esto un usuario de comunidad podia enviar cualquier URL como miniatura
-- (imagen externa, tracking o contenido ajeno). La miniatura debe vivir en el
-- mismo bucket/prefijo que la imagen principal.

create or replace function public.publicar_foto_galeria(
  p_token text,
  p_title text,
  p_image_url text,
  p_autor text default null,
  p_thumb_url text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_titulo text;
  v_url text;
  v_thumb_url text;
  v_id bigint;
  v_apodo text;
  v_autor_final text;
  v_es_admin boolean := false;
  v_prefijo text := '^https://cydiyaacnyydprgffmkq\.supabase\.co/storage/v1/object/public/fotos-galeria/(gallery/|gallery_)';
begin
  v_es_admin := public.es_admin();

  if v_es_admin then
    v_autor_final := trim(coalesce(p_autor, ''));
    if v_autor_final = '' then v_autor_final := 'LaGochaGaming'; end if;
    if length(v_autor_final) > 30 then v_autor_final := left(v_autor_final, 30); end if;
  else
    select usr.apodo into v_apodo
      from public.comunidad_sesiones ses
      join public.usuarios_comunidad usr on usr.id = ses.usuario_id
     where ses.token = p_token and ses.expira_en > now();
    if v_apodo is null then
      return jsonb_build_object('ok', false, 'error', 'sin_sesion');
    end if;
    v_autor_final := v_apodo;
  end if;

  v_titulo := trim(coalesce(p_title, ''));
  v_url := trim(coalesce(p_image_url, ''));
  v_thumb_url := trim(coalesce(p_thumb_url, ''));

  if length(v_titulo) = 0 or length(v_titulo) > 60 then
    return jsonb_build_object('ok', false, 'error', 'titulo_invalido');
  end if;
  if v_url !~ v_prefijo then
    return jsonb_build_object('ok', false, 'error', 'url_invalida');
  end if;
  if v_thumb_url <> '' and v_thumb_url !~ v_prefijo then
    return jsonb_build_object('ok', false, 'error', 'thumb_invalida');
  end if;

  if not v_es_admin and (
    select count(*) from public.galeria
     where autor = v_autor_final and estado = 'pendiente'
  ) >= 5 then
    return jsonb_build_object('ok', false, 'error', 'galeria_limite');
  end if;

  insert into public.galeria(title, image_url, thumb_url, estado, likes, autor)
  values (v_titulo, v_url, nullif(v_thumb_url, ''), 'pendiente', 0, v_autor_final)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'autor', v_autor_final, 'thumb_url', v_thumb_url);
exception
  when others then
    return jsonb_build_object('ok', false, 'error', 'error_interno', 'detalle', sqlerrm);
end;
$$;

revoke all on function public.publicar_foto_galeria(text, text, text, text, text) from public;
grant execute on function public.publicar_foto_galeria(text, text, text, text, text) to anon, authenticated;
