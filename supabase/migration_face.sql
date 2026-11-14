-- ============================================================
-- SICAD - Migração: Reconhecimento Facial
-- Executar APÓS o schema.sql principal
-- ============================================================

-- Adicionar coluna face_descriptor à tabela fotos
-- Armazena o vetor de 128 dimensões do face-api.js
ALTER TABLE public.fotos
ADD COLUMN IF NOT EXISTS face_descriptor float8[];

-- Índice para facilitar consultas (opcional, para uso futuro com pgvector)
-- CREATE INDEX IF NOT EXISTS idx_fotos_face_descriptor ON public.fotos USING gin (face_descriptor);

COMMENT ON COLUMN public.fotos.face_descriptor IS 'Vetor de 128 dimensões extraído pelo face-api.js para reconhecimento facial';
