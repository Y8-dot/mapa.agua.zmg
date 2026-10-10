-- =====================================================================
-- MIGRACIÓN 002 — Límite de reportes por red (IP) + RLS estricto
-- Ejecutar completo en Supabase → SQL Editor. Es idempotente.
-- =====================================================================
--
-- Qué hace:
--   1. Activa RLS en `reportes` y deja una sola política: lectura pública
--      de reportes aprobados. El navegador (clave publishable/anon) ya NO
--      puede insertar, editar ni borrar.
--   2. Crea `reportes_envios`, donde el servidor (ruta /api/reportes, con la
--      clave secreta) registra un hash de la IP de cada envío. No guarda la
--      IP en claro. Con RLS activo y sin políticas, nadie más puede leerla.
--
-- Después de correrla, los reportes ciudadanos SOLO entran por /api/reportes,
-- que aplica el límite por IP. Requiere la variable SUPABASE_SECRET_KEY en
-- web/.env.local y en Vercel.
-- =====================================================================

-- 1) RLS en reportes: borrar TODAS las políticas existentes y dejar solo lectura
ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reportes'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.reportes', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "lectura_publica_aprobados" ON public.reportes
  FOR SELECT TO anon, authenticated
  USING (estado_moderacion = 'aprobado');

-- 2) Registro de envíos por IP (hash), solo accesible con la clave secreta
CREATE TABLE IF NOT EXISTS public.reportes_envios (
  id           BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  ip_hash      TEXT NOT NULL,
  colonia_key  TEXT NOT NULL,
  reporte_id   BIGINT REFERENCES public.reportes(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_envios_ip_fecha
  ON public.reportes_envios (ip_hash, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_envios_ip_colonia
  ON public.reportes_envios (ip_hash, colonia_key, created_at DESC);

ALTER TABLE public.reportes_envios ENABLE ROW LEVEL SECURITY;
-- (sin políticas a propósito: anon/authenticated no pueden leer ni escribir)

-- 3) Verificación: debe listar solo "lectura_publica_aprobados" (SELECT)
SELECT tablename, policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'public' AND tablename IN ('reportes', 'reportes_envios');
