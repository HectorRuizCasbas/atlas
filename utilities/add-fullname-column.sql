-- Agregar columna full_name a la tabla profiles
-- Ejecutar en Supabase SQL Editor

ALTER TABLE public.profiles 
ADD COLUMN full_name text;

-- Agregar comentario para documentación
COMMENT ON COLUMN public.profiles.full_name IS 'Nombre completo del usuario (ej: Héctor Ruiz)';

-- Opcional: Actualizar usuarios existentes con nombres por defecto
-- UPDATE public.profiles SET full_name = username WHERE full_name IS NULL;
