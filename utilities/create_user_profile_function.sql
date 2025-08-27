-- Función para crear perfil de usuario sin restricciones RLS
CREATE OR REPLACE FUNCTION create_user_profile(
  user_id UUID,
  user_username TEXT,
  user_email TEXT,
  user_full_name TEXT,
  user_role TEXT DEFAULT 'Usuario',
  user_departamento_id UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  -- Insertar el perfil directamente
  INSERT INTO profiles (
    id,
    username,
    email,
    full_name,
    role,
    departamento_id,
    lastActivity
  ) VALUES (
    user_id,
    user_username,
    user_email,
    user_full_name,
    user_role,
    user_departamento_id,
    NOW()
  );

  -- Devolver los datos del perfil creado
  SELECT json_build_object(
    'id', user_id,
    'username', user_username,
    'email', user_email,
    'full_name', user_full_name,
    'role', user_role,
    'departamento_id', user_departamento_id
  ) INTO result;

  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creando perfil: %', SQLERRM;
END;
$$;
