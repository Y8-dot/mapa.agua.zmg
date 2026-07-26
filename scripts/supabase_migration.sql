-- =====================================================
-- PASO 1: Ejecutar ESTO PRIMERO en Supabase SQL Editor
-- https://TU_PROYECTO.supabase.co → SQL Editor
-- =====================================================

-- 1. Crear tabla de reportes
CREATE TABLE IF NOT EXISTS reportes (
  id            BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  colonia       TEXT NOT NULL,
  municipio     TEXT NOT NULL,
  categorias    TEXT[] NOT NULL DEFAULT '{}',
  fuente_tipo   TEXT NOT NULL,
  fuente_nombre TEXT NOT NULL,
  descripcion   TEXT,
  fuente_url    TEXT,
  fecha_reporte TEXT NOT NULL,
  fecha_carga   TEXT DEFAULT '',
  nivel_confianza TEXT,
  estado_moderacion TEXT DEFAULT 'pendiente',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indices
CREATE INDEX IF NOT EXISTS idx_colonia ON reportes (colonia, municipio);
CREATE INDEX IF NOT EXISTS idx_fuente ON reportes (fuente_tipo);
CREATE INDEX IF NOT EXISTS idx_estado ON reportes (estado_moderacion);

-- NOTA: No activamos RLS aun. Primero migramos los datos,
-- luego ejecutas el PASO 2 (mas abajo).


-- =====================================================
-- PASO 2: Despues de migrar los datos, ejecuta esto
-- =====================================================
/*
ALTER TABLE reportes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lectura_publica" ON reportes
  FOR SELECT USING (estado_moderacion = 'aprobado');

CREATE POLICY "insercion_anonima" ON reportes
  FOR INSERT WITH CHECK (
    fuente_tipo = 'ciudadano_sin_verificar'
    AND estado_moderacion = 'pendiente'
  );
*/
