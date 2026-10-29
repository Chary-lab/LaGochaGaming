-- 1.5.0 - Politicas explicitas de denegacion en tablas internas
-- Estas tablas solo se usan desde funciones SECURITY DEFINER. La denegacion
-- explicita evita que un GRANT accidental las exponga y documenta la intencion.

drop policy if exists "Sin acceso directo" on public.galeria_likes;
create policy "Sin acceso directo"
  on public.galeria_likes
  for all
  to anon, authenticated
  using (false)
  with check (false);

drop policy if exists "Sin acceso directo" on public.auth_rate_limit;
create policy "Sin acceso directo"
  on public.auth_rate_limit
  for all
  to anon, authenticated
  using (false)
  with check (false);
