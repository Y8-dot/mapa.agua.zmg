-- ============================================================================
-- Migración 003 — Lectura solo por el servidor
-- ----------------------------------------------------------------------------
-- EJECUTAR SOLO DESPUÉS de que esté en producción el deploy que agrega
-- GET /api/datos (el mapa ya no lee Supabase desde el navegador).
-- Si se ejecuta antes, el mapa en producción se queda sin reportes.
--
-- Efecto: la clave publishable (anon) ya no puede leer ni escribir `reportes`.
-- Solo el servidor (clave secreta) accede, y /api/datos cachea 60 s en la CDN,
-- así que un bot que recargue el sitio ya no consume egress de Supabase.
-- ============================================================================

DROP POLICY IF EXISTS "lectura_publica_aprobados" ON public.reportes;

-- RLS sigue activa y sin políticas: anon y authenticated no ven nada.
ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;

-- Verificación (debe devolver 0 filas):
-- select policyname from pg_policies where schemaname = 'public' and tablename = 'reportes';
