-- ============================================================================
-- Migración 004 — Endurecimiento (auditoría de seguridad run-1, 2026-10-10)
-- ----------------------------------------------------------------------------
-- Se puede ejecutar en cualquier momento después de la 003. Es idempotente.
-- ============================================================================

-- 1. No depender solo de RLS: quitar a anon/authenticated todos los permisos de
--    tabla. Si alguien desactiva RLS por error, siguen sin poder leer ni escribir.
REVOKE ALL ON public.reportes, public.reportes_envios FROM anon, authenticated;

-- 2. fuente_url solo puede ser http(s). NOT VALID: aplica a filas nuevas sin
--    fallar por filas viejas. Revisa las existentes con la consulta de abajo y,
--    si devuelve 0 filas, ejecuta el VALIDATE.
ALTER TABLE public.reportes DROP CONSTRAINT IF EXISTS reportes_fuente_url_http;
ALTER TABLE public.reportes
  ADD CONSTRAINT reportes_fuente_url_http
  CHECK (fuente_url IS NULL OR fuente_url ~* '^https?://') NOT VALID;
-- select id, colonia, estado_moderacion, left(fuente_url, 200)
--   from public.reportes where fuente_url is not null and fuente_url !~* '^https?://';
-- ALTER TABLE public.reportes VALIDATE CONSTRAINT reportes_fuente_url_http;

-- 3. Conteo global del freno (created_at) sin escaneo completo.
CREATE INDEX IF NOT EXISTS reportes_envios_created_at_idx
  ON public.reportes_envios (created_at);

-- 4. Borrar un reporte (p. ej. spam) ya no borra el historial de envíos de esa
--    red: así el límite sigue aplicando al autor.
ALTER TABLE public.reportes_envios
  DROP CONSTRAINT IF EXISTS reportes_envios_reporte_id_fkey;
ALTER TABLE public.reportes_envios
  ADD CONSTRAINT reportes_envios_reporte_id_fkey
  FOREIGN KEY (reporte_id) REFERENCES public.reportes(id) ON DELETE SET NULL;

-- 5. Retención: los límites solo miran 30 días atrás. Ejecutar de vez en cuando
--    (o programarlo con pg_cron si está habilitado):
-- delete from public.reportes_envios where created_at < now() - interval '31 days';

-- Verificación (solo lectura):
-- select grantee, table_name, privilege_type from information_schema.role_table_grants
--  where table_schema = 'public' and table_name in ('reportes','reportes_envios')
--    and grantee in ('anon','authenticated');            -- esperado: 0 filas
-- select policyname, cmd, roles from pg_policies
--  where schemaname = 'public' and tablename in ('reportes','reportes_envios');  -- esperado: 0 filas (tras 003)
