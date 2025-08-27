-- Trigger para sincronizar automáticamente auth.users con public.profiles
-- Esto garantiza que SIEMPRE que se cree un usuario en auth, se cree también en profiles

-- 1. Función que se ejecuta cuando se crea un usuario en auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    username,
    email,
    full_name,
    role,
    departamento_id,
    supervisedUsers,
    lastActivity
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'Usuario'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'departamento_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'departamento_id')::uuid 
      ELSE NULL 
    END,
    '[]'::jsonb,
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Crear el trigger que ejecuta la función cuando se inserta un usuario en auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Función para limpiar perfiles huérfanos cuando se elimina un usuario de auth
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.profiles WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Trigger para eliminar perfil cuando se elimina usuario de auth
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
  AFTER DELETE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_user_delete();

-- 5. Verificar que los triggers se crearon correctamente
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name IN ('on_auth_user_created', 'on_auth_user_deleted')
ORDER BY trigger_name;
